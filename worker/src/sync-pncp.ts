/**
 * Licitah — Sincronizador PNCP (VPS)
 *
 * Roda na VPS via PM2 cron, sem limite de tempo.
 * Busca TODAS as licitações do PNCP e salva no banco Neon.
 *
 * Estratégia:
 *  - Primeira execução: sincroniza 90 dias (bootstrap)
 *  - Execuções seguintes: sincroniza últimas 48h (/atualizacao)
 *  - Upserts em lote de 50 registros (10x mais rápido que row-by-row)
 *  - Sem deadline — processa todas as páginas disponíveis
 *
 * Variáveis de ambiente necessárias:
 *   DATABASE_URL — connection string do Neon (mesmo valor do Vercel)
 */

import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[sync-pncp] DATABASE_URL não definido no .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });

const PNCP_PUB    = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const PNCP_UPDATE = 'https://pncp.gov.br/api/consulta/v1/contratacoes/atualizacao';
const PAGE_SIZE   = 50;
const CONCURRENCY = 10;

const MODALIDADES = [
  { mod: 8,  label: 'Dispensa de Licitação'   },
  { mod: 6,  label: 'Pregão Eletrônico'       },
  { mod: 9,  label: 'Inexigibilidade'         },
  { mod: 7,  label: 'Pregão Presencial'       },
  { mod: 4,  label: 'Concorrência Eletrônica' },
  { mod: 5,  label: 'Concorrência Presencial' },
  { mod: 12, label: 'Credenciamento'          },
  { mod: 1,  label: 'Leilão Eletrônico'       },
  { mod: 13, label: 'Leilão Presencial'       },
  { mod: 14, label: 'Modalidade 14'           },
  { mod: 15, label: 'Modalidade 15'           },
  { mod: 10, label: 'Modalidade 10'           },
  { mod: 11, label: 'Modalidade 11'           },
  { mod: 3,  label: 'Concurso'                },
  { mod: 2,  label: 'Diálogo Competitivo'     },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(
  endpoint: string,
  modalidade: number,
  dataInicial: string,
  dataFinal: string,
  pagina: number,
): Promise<{ data: any[]; totalPages: number; totalRecords: number }> {
  const params = new URLSearchParams({
    dataInicial,
    dataFinal,
    pagina: String(pagina),
    tamanhoPagina: String(PAGE_SIZE),
    codigoModalidadeContratacao: String(modalidade),
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25_000);
    try {
      const res = await fetch(`${endpoint}?${params}`, {
        headers: { Accept: 'application/json' },
        signal: ctl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (attempt < 2) { await sleep(1000 * (attempt + 1)); continue; }
        return { data: [], totalPages: 0, totalRecords: 0 };
      }
      const json = await res.json() as { data?: any[]; totalRegistros?: number; totalPaginas?: number };
      return {
        data:         json.data || [],
        totalRecords: json.totalRegistros ?? 0,
        totalPages:   json.totalPaginas   ?? Math.ceil((json.totalRegistros ?? 0) / PAGE_SIZE),
      };
    } catch {
      clearTimeout(timer);
      if (attempt < 2) { await sleep(1000 * (attempt + 1)); continue; }
      return { data: [], totalPages: 0, totalRecords: 0 };
    }
  }
  return { data: [], totalPages: 0, totalRecords: 0 };
}

// ── Batch upsert usando unnest (1 query para N registros) ─────────────────────

async function upsertBatch(records: any[]): Promise<{ inserted: number; updated: number }> {
  if (records.length === 0) return { inserted: 0, updated: 0 };

  const ids:           string[]  = [];
  const dados:         string[]  = [];
  const ufs:           (string|null)[] = [];
  const municipios:    (string|null)[] = [];
  const modIds:        (number|null)[] = [];
  const modNomes:      (string|null)[] = [];
  const situacoes:     (string|null)[] = [];
  const valores:       (number|null)[] = [];
  const datasPub:      (string|null)[] = [];
  const datasAbr:      (string|null)[] = [];
  const datasEnc:      (string|null)[] = [];
  const datasAtu:      (string|null)[] = [];

  for (const r of records) {
    if (!r.numeroControlePNCP) continue;
    ids.push(r.numeroControlePNCP);
    dados.push(JSON.stringify(r));
    ufs.push(r.unidadeOrgao?.ufSigla || null);
    municipios.push(r.unidadeOrgao?.municipioNome || null);
    modIds.push(r.modalidadeId ?? null);
    modNomes.push(r.modalidadeNome ?? null);
    situacoes.push(r.situacaoCompraNome ?? null);
    valores.push(typeof r.valorTotalEstimado === 'number' ? r.valorTotalEstimado : null);
    datasPub.push(r.dataPublicacaoPncp    ? new Date(r.dataPublicacaoPncp).toISOString()    : null);
    datasAbr.push(r.dataAberturaProposta  ? new Date(r.dataAberturaProposta).toISOString()  : null);
    datasEnc.push(r.dataEncerramentoProposta ? new Date(r.dataEncerramentoProposta).toISOString() : null);
    datasAtu.push(r.dataAtualizacaoPncp   ? new Date(r.dataAtualizacaoPncp).toISOString()   : null);
  }

  if (ids.length === 0) return { inserted: 0, updated: 0 };

  const client = await pool.connect();
  try {
    const res = await client.query<{ inserted: boolean }>(`
      INSERT INTO licitacoes_pncp_cache (
        numero_controle_pncp, dados, uf, municipio,
        modalidade_id, modalidade_nome, situacao, valor_estimado,
        data_publicacao, data_abertura, data_encerramento, data_atualizacao_pncp,
        sincronizado_em
      )
      SELECT
        unnest($1::text[]),
        unnest($2::jsonb[]),
        unnest($3::text[]),
        unnest($4::text[]),
        unnest($5::int[]),
        unnest($6::text[]),
        unnest($7::text[]),
        unnest($8::numeric[]),
        unnest($9::timestamptz[]),
        unnest($10::timestamptz[]),
        unnest($11::timestamptz[]),
        unnest($12::timestamptz[]),
        NOW()
      ON CONFLICT (numero_controle_pncp) DO UPDATE SET
        dados                 = EXCLUDED.dados,
        uf                    = EXCLUDED.uf,
        municipio             = EXCLUDED.municipio,
        modalidade_id         = EXCLUDED.modalidade_id,
        modalidade_nome       = EXCLUDED.modalidade_nome,
        situacao              = EXCLUDED.situacao,
        valor_estimado        = EXCLUDED.valor_estimado,
        data_publicacao       = EXCLUDED.data_publicacao,
        data_abertura         = EXCLUDED.data_abertura,
        data_encerramento     = EXCLUDED.data_encerramento,
        data_atualizacao_pncp = EXCLUDED.data_atualizacao_pncp,
        sincronizado_em       = NOW()
      RETURNING (xmax = 0) AS inserted
    `, [ids, dados, ufs, municipios, modIds, modNomes, situacoes, valores,
        datasPub, datasAbr, datasEnc, datasAtu]);

    const inserted = res.rows.filter(r => r.inserted).length;
    return { inserted, updated: res.rows.length - inserted };
  } finally {
    client.release();
  }
}

// ── Sincroniza uma modalidade ─────────────────────────────────────────────────

async function syncModalidade(
  mod: number,
  label: string,
  incremental: boolean,
  days: number,
): Promise<{ inserted: number; updated: number; pages: number; total: number }> {
  const endpoint   = incremental ? PNCP_UPDATE : PNCP_PUB;
  const dataFinal  = fmtDate(new Date());
  const dStart     = new Date();
  dStart.setDate(dStart.getDate() - days);
  const dataInicial = fmtDate(dStart);

  // Probe para descobrir total de páginas
  const probe = await fetchPage(endpoint, mod, dataInicial, dataFinal, 1);
  if (probe.totalPages === 0) return { inserted: 0, updated: 0, pages: 0, total: 0 };

  let inserted = 0, updated = 0, pagesFetched = 1;

  // Upsert página 1
  const p1 = await upsertBatch(probe.data);
  inserted += p1.inserted; updated += p1.updated;

  // Demais páginas do mais novo para o mais antigo, em lotes concorrentes
  const remaining: number[] = [];
  for (let p = probe.totalPages; p >= 2; p--) remaining.push(p);

  let i = 0;
  while (i < remaining.length) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    i += CONCURRENCY;

    const pages = await Promise.allSettled(
      batch.map(p => fetchPage(endpoint, mod, dataInicial, dataFinal, p))
    );

    const records: any[] = [];
    for (const p of pages) {
      if (p.status === 'fulfilled') {
        records.push(...p.value.data);
        pagesFetched++;
      }
    }

    const r = await upsertBatch(records);
    inserted += r.inserted;
    updated  += r.updated;
  }

  return { inserted, updated, pages: pagesFetched, total: probe.totalRecords };
}

// ── Verifica se é a primeira sync (bootstrap) ─────────────────────────────────

async function getRecordCount(): Promise<number> {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT COUNT(*)::int AS c FROM licitacoes_pncp_cache');
    return Number(res.rows[0]?.c || 0);
  } finally {
    client.release();
  }
}

// ── Loop principal ────────────────────────────────────────────────────────────

async function main() {
  const totalExistente = await getRecordCount();
  const incremental    = totalExistente >= 10_000;
  const days           = incremental ? 2 : 90;
  const modo           = incremental ? 'incremental (2 dias)' : `bootstrap (${days} dias)`;

  console.log(`\n[sync-pncp] ========================================`);
  console.log(`[sync-pncp] Início: ${new Date().toISOString()}`);
  console.log(`[sync-pncp] Modo: ${modo} | Registros no banco: ${totalExistente.toLocaleString()}`);
  console.log(`[sync-pncp] ========================================`);

  let totalInserted = 0, totalUpdated = 0, totalPages = 0;

  for (const { mod, label } of MODALIDADES) {
    const t0 = Date.now();
    try {
      const r = await syncModalidade(mod, label, incremental, days);
      totalInserted += r.inserted;
      totalUpdated  += r.updated;
      totalPages    += r.pages;

      const dur = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `[sync-pncp] mod ${String(mod).padStart(2)} ${label.padEnd(28)} ` +
        `total=${String(r.total).padStart(6)} | páginas=${String(r.pages).padStart(4)} ` +
        `| +${r.inserted} novas, ~${r.updated} atualizadas | ${dur}s`
      );
    } catch (err) {
      console.error(`[sync-pncp] ERRO mod ${mod} ${label}:`, err);
    }
  }

  console.log(`\n[sync-pncp] ========================================`);
  console.log(`[sync-pncp] CONCLUÍDO: +${totalInserted} novas | ~${totalUpdated} atualizadas | ${totalPages} páginas`);
  console.log(`[sync-pncp] Fim: ${new Date().toISOString()}`);
  console.log(`[sync-pncp] ========================================\n`);

  await pool.end();
}

main().catch(err => {
  console.error('[sync-pncp] Erro fatal:', err);
  process.exit(1);
});
