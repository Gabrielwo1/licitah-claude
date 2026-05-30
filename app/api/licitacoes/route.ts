import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const maxDuration = 30;

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const PNCP_PAGE_SIZE = 50;

/**
 * Buscar Licitações — backed by Postgres cache.
 *
 * Reads from licitacoes_pncp_cache (populated by /api/cron/sync-pncp).
 * Uses tsvector full-text search for the keyword (`busca` param) and
 * SQL-level ORDER BY for all sort types so server-side pagination returns
 * globally correct ordering.
 *
 * Falls back to a live PNCP fetch only when the cache is completely empty.
 */

function fourMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 4);
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

async function fetchLivePncpFallback(opts: {
  modalidade: string; dataInicial: string; dataFinal: string;
  uf: string; codigoIbge: string;
}): Promise<any[]> {
  const MODALIDADES = opts.modalidade && opts.modalidade !== 'all'
    ? [opts.modalidade]
    : ['8', '6', '9', '7'];

  const dataInicial = opts.dataInicial.replace(/-/g, '');
  const dataFinal   = opts.dataFinal.replace(/-/g, '');

  const fetches = MODALIDADES.flatMap(mod =>
    [1, 2].map(async pag => {
      try {
        const params = new URLSearchParams({
          dataInicial, dataFinal,
          pagina: String(pag),
          tamanhoPagina: String(PNCP_PAGE_SIZE),
          codigoModalidadeContratacao: mod,
        });
        if (opts.uf) params.set('uf', opts.uf);
        if (opts.codigoIbge) params.set('codigoMunicipioIbge', opts.codigoIbge);
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 12000);
        const res = await fetch(`${PNCP_API}?${params}`, {
          headers: { Accept: 'application/json' },
          signal: ctl.signal,
          cache: 'no-store',
        });
        clearTimeout(t);
        if (!res.ok) return [] as any[];
        const json = await res.json();
        return (json.data || []) as any[];
      } catch { return [] as any[]; }
    })
  );
  const results = await Promise.allSettled(fetches);
  const all: any[] = [];
  results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });
  const seen = new Set<string>();
  return all.filter(l => {
    if (!l?.numeroControlePNCP || seen.has(l.numeroControlePNCP)) return false;
    seen.add(l.numeroControlePNCP); return true;
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const uf            = (sp.get('uf')         || '').toUpperCase();
  const municipio     = sp.get('municipio')   || '';
  const codigoIbge    = sp.get('codigoIbge')  || '';
  const busca         = (sp.get('busca')      || '').trim();
  const modalidade    = sp.get('modalidade')  || '';
  const dataInicialIn = sp.get('dataInicial') || fourMonthsAgo();
  const dataFinalIn   = sp.get('dataFinal')   || todayStr();

  const pageRaw    = Number(sp.get('page'))     || 1;
  const pageSizeRaw = Number(sp.get('pageSize')) || 100;
  const page       = Math.max(pageRaw, 1);
  const pageSize   = Math.min(Math.max(pageSizeRaw, 1), 500);
  const offset     = (page - 1) * pageSize;

  const sortRaw = (sp.get('sort') || '').toLowerCase();
  const sort    = sortRaw || (busca ? 'relevance' : 'recente');

  const startedAt = Date.now();

  const modalidadeId: number | null = modalidade && modalidade !== 'all'
    ? parseInt(modalidade, 10)
    : null;

  // ── DB queries — SQL-level ORDER BY for all sort types ────────────────────

  let rows: any[] = [];
  let dbTotal = 0;
  try {
    if (busca && sort === 'relevance') {
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY
            ts_rank(search_vector, plainto_tsquery('portuguese', ${busca})) DESC,
            data_publicacao DESC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);

    } else if (busca && sort === 'maior') {
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY valor_estimado DESC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);

    } else if (busca && sort === 'menor') {
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY valor_estimado ASC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);

    } else if (busca && sort === 'antiga') {
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY data_publicacao ASC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);

    } else if (busca) {
      // busca + recente (default)
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY data_publicacao DESC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE search_vector @@ plainto_tsquery('portuguese', ${busca})
            AND (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);

    } else if (sort === 'maior') {
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY valor_estimado DESC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);

    } else if (sort === 'menor') {
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY valor_estimado ASC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);

    } else if (sort === 'antiga') {
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY data_publicacao ASC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);

    } else {
      // no busca + recente (default)
      const [dataRows, countRows] = await Promise.all([
        sql`
          SELECT dados, valor_estimado, data_publicacao
          FROM licitacoes_pncp_cache
          WHERE (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
          ORDER BY data_publicacao DESC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS c
          FROM licitacoes_pncp_cache
          WHERE (data_publicacao IS NULL OR data_publicacao >= ${dataInicialIn}::date)
            AND (data_publicacao IS NULL OR data_publicacao < (${dataFinalIn}::date + INTERVAL '1 day'))
            AND (${uf}::text = '' OR uf = ${uf})
            AND (${municipio}::text = '' OR municipio ILIKE ${'%' + municipio + '%'})
            AND (${modalidadeId}::int IS NULL OR modalidade_id = ${modalidadeId})
        `,
      ]);
      rows = dataRows; dbTotal = Number(countRows[0]?.c || 0);
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Erro no banco de dados.', detail: String(e?.message || e) },
      { status: 500 }
    );
  }

  // ── Empty cache fallback ──────────────────────────────────────────────────
  if (rows.length === 0 && page === 1) {
    try {
      const countRows = await sql`SELECT COUNT(*)::int AS c FROM licitacoes_pncp_cache`;
      const total = Number(countRows[0]?.c || 0);
      if (total === 0) {
        const liveData = await fetchLivePncpFallback({
          modalidade, dataInicial: dataInicialIn, dataFinal: dataFinalIn,
          uf, codigoIbge,
        });
        let filtered = liveData;
        if (busca) {
          const bl = busca.toLowerCase();
          filtered = liveData.filter((l: any) => {
            const hay = [
              l.objetoCompra, l.informacaoComplementar,
              l.orgaoEntidade?.razaoSocial,
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(bl);
          });
        }
        return NextResponse.json({
          data: filtered,
          totalRegistros: filtered.length,
          page: 1,
          pageSize,
          totalPages: 1,
          meta: {
            source: 'pncp-live-fallback',
            warning: 'Cache vazio — buscando direto no PNCP. Aguarde a primeira sincronização.',
            elapsedMs: Date.now() - startedAt,
          },
        });
      }
    } catch { /* ignore — proceed with empty */ }
  }

  // ── Last sync timestamp ────────────────────────────────────────────────────
  let lastSync: string | null = null;
  try {
    const r = await sql`SELECT MAX(sincronizado_em) AS ts FROM licitacoes_pncp_cache`;
    lastSync = r[0]?.ts ? new Date(r[0].ts).toISOString() : null;
  } catch { /* ignore */ }

  const totalPages = Math.max(1, Math.ceil(dbTotal / pageSize));
  const data = rows.map(r => r.dados);

  return NextResponse.json({
    data,
    totalRegistros: dbTotal,
    page,
    pageSize,
    totalPages,
    registrosRetornados: data.length,
    meta: {
      source: 'postgres-cache',
      lastSync,
      elapsedMs: Date.now() - startedAt,
    },
  });
}
