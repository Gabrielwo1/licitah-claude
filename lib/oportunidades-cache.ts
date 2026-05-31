/**
 * Query oportunidades from licitacoes_pncp_cache (fast local DB) instead of
 * hitting the PNCP API live. Used by:
 *  - /api/oportunidades/buscar  (full search, on user demand)
 *  - app/dashboard/page.tsx     (preview, top-5)
 */

import sql from '@/lib/db';

export const PERIOD_DAYS: Record<string, number> = {
  '24h':  1,
  '48h':  2,
  '7d':   7,
  '30d':  30,
  'todos': 90,
};

export function periodToDate(periodo: string): string {
  const days = PERIOD_DAYS[periodo] ?? 90;
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

export interface CacheQueryOpts {
  periodo?:    string;
  catmatCodes?: string[];
  limit?:      number;
}

/**
 * Search licitacoes_pncp_cache using full-text OR of all keywords + region + CATMAT.
 * Returns the stored `dados` JSON objects (same shape as PNCP API response).
 */
export async function queryOportunidadesFromCache(
  keywords:   string[],
  region:     { uf: string; cidade: string },
  opts:       CacheQueryOpts = {}
): Promise<any[]> {
  if (keywords.length === 0) return [];

  const { uf, cidade } = region;
  const dataInicial    = periodToDate(opts.periodo || 'todos');
  const limit          = opts.limit ?? 500;
  const catmatCodes    = opts.catmatCodes ?? [];

  // websearch_to_tsquery with "kw1 OR kw2 OR kw3" → efficient full-text OR
  const wsQuery = keywords.join(' OR ');

  try {
    let rows: any[];

    if (catmatCodes.length > 0) {
      // Safe PostgreSQL array literal (no user-controlled content injected)
      const pgArr = '{' + catmatCodes.map(c => `"${c.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',') + '}';
      rows = await sql`
        SELECT dados
        FROM licitacoes_pncp_cache
        WHERE search_vector @@ websearch_to_tsquery('portuguese', ${wsQuery})
          AND data_publicacao >= ${dataInicial}::date
          AND (${uf}::text   = '' OR uf        = ${uf})
          AND (${cidade}::text = '' OR municipio ILIKE ${'%' + cidade + '%'})
          AND catmat_codes IS NOT NULL
          AND catmat_codes && ${pgArr}::text[]
        ORDER BY data_publicacao DESC NULLS LAST
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT dados
        FROM licitacoes_pncp_cache
        WHERE search_vector @@ websearch_to_tsquery('portuguese', ${wsQuery})
          AND data_publicacao >= ${dataInicial}::date
          AND (${uf}::text   = '' OR uf        = ${uf})
          AND (${cidade}::text = '' OR municipio ILIKE ${'%' + cidade + '%'})
        ORDER BY data_publicacao DESC NULLS LAST
        LIMIT ${limit}
      `;
    }

    return rows.map(r => r.dados);
  } catch {
    return [];
  }
}
