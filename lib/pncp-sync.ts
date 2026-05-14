/**
 * PNCP sync — fetches public procurement records from the federal PNCP API
 * and upserts them into licitacoes_pncp_cache. Used by:
 *  - /api/cron/sync-pncp        (daily incremental)
 *  - /api/admin/sync-bootstrap  (manual, full backfill)
 *
 * Strategy:
 *  - Probe page 1 to learn totalPages
 *  - Fetch the LAST N pages first (newest), then earlier pages if budget allows
 *  - Concurrency limited so we don't get rate-limited or exhaust DB pool
 *  - Each page upserts via ON CONFLICT DO UPDATE on numero_controle_pncp
 *  - Hard deadline (deadlineAt) — stops cleanly before Vercel function timeout
 *
 * PNCP endpoints used:
 *  - /contratacoes/publicacao   (filter by data de publicação)
 *  - /contratacoes/atualizacao  (filter by data de atualização — used for daily diffs)
 */

import sql from '@/lib/db';

const PNCP_PUB    = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const PNCP_UPDATE = 'https://pncp.gov.br/api/consulta/v1/contratacoes/atualizacao';
const PAGE_SIZE   = 50;

/** All known PNCP modalidade codes, ordered by typical volume (descending). */
export const ALL_MODALIDADES = [
  { mod: 8,  label: 'Dispensa de Licitação',  priority: 1 },
  { mod: 6,  label: 'Pregão Eletrônico',      priority: 1 },
  { mod: 9,  label: 'Inexigibilidade',        priority: 1 },
  { mod: 7,  label: 'Pregão Presencial',      priority: 2 },
  { mod: 4,  label: 'Concorrência Eletrônica', priority: 2 },
  { mod: 5,  label: 'Concorrência Presencial', priority: 2 },
  { mod: 12, label: 'Credenciamento',         priority: 3 },
  { mod: 1,  label: 'Leilão Eletrônico',      priority: 3 },
  { mod: 13, label: 'Leilão Presencial',      priority: 3 },
  { mod: 14, label: 'mod 14',                  priority: 3 },
  { mod: 15, label: 'mod 15',                  priority: 3 },
  { mod: 10, label: 'mod 10',                  priority: 3 },
  { mod: 11, label: 'mod 11',                  priority: 3 },
  { mod: 3,  label: 'Concurso',                priority: 3 },
  { mod: 2,  label: 'Diálogo Competitivo',     priority: 3 },
];

function fmtPNCPDate(d: Date): string {
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

interface PageResult { data: any[]; totalPages: number; totalRecords: number }

async function fetchPNCPPage(
  endpoint: string,
  modalidade: number,
  dataInicial: string,
  dataFinal: string,
  pagina: number,
  timeoutMs = 20000,
  retries = 2
): Promise<PageResult> {
  const params = new URLSearchParams({
    dataInicial,
    dataFinal,
    pagina: String(pagina),
    tamanhoPagina: String(PAGE_SIZE),
    codigoModalidadeContratacao: String(modalidade),
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: ctl.signal,
        cache: 'no-store',
      });
      clearTimeout(t);
      if (!res.ok) {
        if (attempt < retries) { await sleep(800 * (attempt + 1)); continue; }
        return { data: [], totalPages: 0, totalRecords: 0 };
      }
      const json = await res.json();
      const totalRecords = json.totalRegistros ?? 0;
      const totalPages   = json.totalPaginas ?? Math.ceil(totalRecords / PAGE_SIZE);
      return { data: json.data || [], totalPages, totalRecords };
    } catch {
      clearTimeout(t);
      if (attempt < retries) { await sleep(800 * (attempt + 1)); continue; }
      return { data: [], totalPages: 0, totalRecords: 0 };
    }
  }
  return { data: [], totalPages: 0, totalRecords: 0 };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Upsert a batch of records. Splits into chunks since the neon driver caps params. */
async function upsertBatch(records: any[]): Promise<{ inserted: number; updated: number }> {
  if (records.length === 0) return { inserted: 0, updated: 0 };

  let inserted = 0;
  let updated  = 0;

  // Process one row at a time — simpler and Neon's serverless is fine with this.
  // For higher throughput we could COPY or batch into VALUES tuples but this keeps
  // the code simple and dedups cleanly via ON CONFLICT.
  for (const r of records) {
    const id = r.numeroControlePNCP;
    if (!id) continue;

    const uf            = r.unidadeOrgao?.ufSigla || null;
    const municipio     = r.unidadeOrgao?.municipioNome || null;
    const modalidadeId  = r.modalidadeId ?? null;
    const modalidadeNome = r.modalidadeNome ?? null;
    const situacao      = r.situacaoCompraNome ?? null;
    const valor         = typeof r.valorTotalEstimado === 'number' ? r.valorTotalEstimado : null;
    const dataPub       = r.dataPublicacaoPncp ? new Date(r.dataPublicacaoPncp) : null;
    const dataAbr       = r.dataAberturaProposta ? new Date(r.dataAberturaProposta) : null;
    const dataEnc       = r.dataEncerramentoProposta ? new Date(r.dataEncerramentoProposta) : null;
    const dataAtu       = r.dataAtualizacaoPncp ? new Date(r.dataAtualizacaoPncp) : null;

    try {
      const res = await sql`
        INSERT INTO licitacoes_pncp_cache (
          numero_controle_pncp, dados, uf, municipio,
          modalidade_id, modalidade_nome, situacao, valor_estimado,
          data_publicacao, data_abertura, data_encerramento, data_atualizacao_pncp,
          sincronizado_em
        ) VALUES (
          ${id}, ${JSON.stringify(r)}::jsonb, ${uf}, ${municipio},
          ${modalidadeId}, ${modalidadeNome}, ${situacao}, ${valor},
          ${dataPub}, ${dataAbr}, ${dataEnc}, ${dataAtu},
          NOW()
        )
        ON CONFLICT (numero_controle_pncp) DO UPDATE SET
          dados                = EXCLUDED.dados,
          uf                   = EXCLUDED.uf,
          municipio            = EXCLUDED.municipio,
          modalidade_id        = EXCLUDED.modalidade_id,
          modalidade_nome      = EXCLUDED.modalidade_nome,
          situacao             = EXCLUDED.situacao,
          valor_estimado       = EXCLUDED.valor_estimado,
          data_publicacao      = EXCLUDED.data_publicacao,
          data_abertura        = EXCLUDED.data_abertura,
          data_encerramento    = EXCLUDED.data_encerramento,
          data_atualizacao_pncp = EXCLUDED.data_atualizacao_pncp,
          sincronizado_em      = NOW()
        RETURNING (xmax = 0) AS inserted
      `;
      if (res[0]?.inserted) inserted++; else updated++;
    } catch (e) {
      // continue on individual row failures
    }
  }

  return { inserted, updated };
}

export interface SyncOptions {
  /** Modalidade code to sync */
  modalidade: number;
  /** Number of days back to sync. Default 90. */
  days?: number;
  /** Use the /atualizacao endpoint (recent updates only). */
  incremental?: boolean;
  /** Wall-clock deadline (ms epoch). Sync stops cleanly before this. */
  deadlineAt?: number;
  /** Max parallel page fetches. Default 6. */
  concurrency?: number;
  /** Max total pages to fetch this call (safety). Default unlimited. */
  maxPages?: number;
  /** Skip page 1 probe if you already know totalPages (advanced). */
}

export interface SyncResult {
  modalidade: number;
  totalRecords: number;
  totalPages: number;
  pagesFetched: number;
  inserted: number;
  updated: number;
  durationMs: number;
  hitDeadline: boolean;
  errors: number;
}

/**
 * Sync a single modalidade. Walks pages from NEWEST to OLDEST so partial syncs
 * still leave the user with current data.
 */
export async function syncModalidade(opts: SyncOptions): Promise<SyncResult> {
  const startedAt   = Date.now();
  const days        = opts.days ?? 90;
  const incremental = !!opts.incremental;
  const deadlineAt  = opts.deadlineAt ?? Number.MAX_SAFE_INTEGER;
  const concurrency = opts.concurrency ?? 6;
  const maxPages    = opts.maxPages ?? Infinity;

  const endpoint = incremental ? PNCP_UPDATE : PNCP_PUB;
  const dataFinal   = fmtPNCPDate(new Date());
  const dStart = new Date(); dStart.setDate(dStart.getDate() - days);
  const dataInicial = fmtPNCPDate(dStart);

  let inserted = 0, updated = 0, errors = 0, pagesFetched = 0;

  // Probe
  const probe = await fetchPNCPPage(endpoint, opts.modalidade, dataInicial, dataFinal, 1);
  pagesFetched = 1;
  if (probe.totalPages === 0) {
    return {
      modalidade: opts.modalidade,
      totalRecords: 0, totalPages: 0, pagesFetched: 1,
      inserted: 0, updated: 0, errors: 0,
      durationMs: Date.now() - startedAt,
      hitDeadline: false,
    };
  }

  // Upsert page 1 (oldest) — we still want it indexed, but prioritize newest pages
  try {
    const r = await upsertBatch(probe.data);
    inserted += r.inserted; updated += r.updated;
  } catch { errors++; }

  // Build remaining page list from NEWEST to OLDEST
  const remainingPages: number[] = [];
  for (let p = probe.totalPages; p >= 2; p--) remainingPages.push(p);

  // Hard cap on remaining
  const capped = remainingPages.slice(0, Math.max(0, maxPages - 1));

  // Process in concurrent batches
  let i = 0;
  let hitDeadline = false;
  while (i < capped.length) {
    if (Date.now() > deadlineAt) { hitDeadline = true; break; }
    const batch = capped.slice(i, i + concurrency);
    i += concurrency;

    const pages = await Promise.allSettled(
      batch.map(p => fetchPNCPPage(endpoint, opts.modalidade, dataInicial, dataFinal, p))
    );

    pagesFetched += pages.filter(p => p.status === 'fulfilled').length;

    // Flatten records and upsert
    const records: any[] = [];
    pages.forEach(p => {
      if (p.status === 'fulfilled') records.push(...p.value.data);
    });

    if (records.length > 0) {
      try {
        const r = await upsertBatch(records);
        inserted += r.inserted; updated += r.updated;
      } catch { errors++; }
    }
  }

  return {
    modalidade: opts.modalidade,
    totalRecords: probe.totalRecords,
    totalPages: probe.totalPages,
    pagesFetched,
    inserted,
    updated,
    durationMs: Date.now() - startedAt,
    hitDeadline,
    errors,
  };
}

/** Log a sync run to licitacoes_pncp_sync_log */
export async function logSyncStart(modalidade: number | null, modo: string): Promise<number> {
  const rows = await sql`
    INSERT INTO licitacoes_pncp_sync_log (modalidade_id, modo, status)
    VALUES (${modalidade}, ${modo}, 'running')
    RETURNING id
  `;
  return Number(rows[0]?.id);
}

export async function logSyncEnd(
  id: number,
  result: { inserted: number; updated: number; pages?: number; errors?: number },
  status: 'ok' | 'partial' | 'error',
  errorMsg?: string
) {
  await sql`
    UPDATE licitacoes_pncp_sync_log SET
      fim = NOW(),
      total_paginas = ${result.pages ?? null},
      registros_inseridos = ${result.inserted},
      registros_atualizados = ${result.updated},
      erros = ${result.errors ?? 0},
      ultimo_erro = ${errorMsg ?? null},
      status = ${status}
    WHERE id = ${id}
  `;
}
