import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PNCP_BASE  = 'https://pncp.gov.br/api/consulta/v1';
const DEFAULT_BATCH = 20;

function toPgArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map(s => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',') + '}';
}

async function fetchItemCodes(cnpj: string, ano: number, seq: number): Promise<string[]> {
  try {
    const url = `${PNCP_BASE}/orgaos/${cnpj}/compras/${ano}/${seq}/itens?pagina=1&tamanhoPagina=500`;
    const ctl = new AbortController();
    const t   = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal:  ctl.signal,
      cache:   'no-store',
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const json  = await res.json();
    const items: any[] = json.data || [];
    return [...new Set(
      items
        .map((i: any) => String(i.codigoItem || '').trim())
        .filter(Boolean)
    )];
  } catch {
    return [];
  }
}

/**
 * POST /api/internal/enrich-catmat
 * Enriches a batch of licitacoes with CATMAT/CATSERV item codes from PNCP.
 * Protected by x-internal-secret header (same as CRON_SECRET).
 * Body: { batchSize?: number }
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const received = req.headers.get('x-internal-secret');
  if (expected && received !== expected) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body      = await req.json().catch(() => ({}));
  const batchSize = Math.min(Number(body.batchSize) || DEFAULT_BATCH, 50);

  const rows = await sql`
    SELECT numero_controle_pncp, dados
    FROM licitacoes_pncp_cache
    WHERE catmat_codes IS NULL
    ORDER BY data_publicacao DESC NULLS LAST
    LIMIT ${batchSize}
  `.catch(() => [] as any[]);

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, enriched: 0, remaining: 0 });
  }

  let enriched = 0;
  let errors   = 0;

  for (const row of rows) {
    try {
      const dados = (typeof row.dados === 'string' ? JSON.parse(row.dados) : row.dados) as any;
      const cnpj  = dados?.orgaoEntidade?.cnpj as string | undefined;
      const ano   = dados?.anoCompra as number | undefined;
      const seq   = dados?.sequencialCompra as number | undefined;
      const id    = row.numero_controle_pncp as string;

      if (!cnpj || !ano || !seq) {
        await sql`
          UPDATE licitacoes_pncp_cache
          SET catmat_codes = ARRAY[]::text[]
          WHERE numero_controle_pncp = ${id}
        `;
        enriched++;
        continue;
      }

      const codes    = await fetchItemCodes(cnpj, ano, seq);
      const pgArr    = toPgArray(codes);

      await sql`
        UPDATE licitacoes_pncp_cache
        SET catmat_codes = ${pgArr}::text[]
        WHERE numero_controle_pncp = ${id}
      `;
      enriched++;
    } catch {
      errors++;
    }
  }

  const rem = await sql`
    SELECT COUNT(*)::int AS c FROM licitacoes_pncp_cache WHERE catmat_codes IS NULL
  `.catch(() => [{ c: -1 }] as any[]);

  return NextResponse.json({
    ok:        true,
    enriched,
    errors,
    remaining: Number(rem[0]?.c ?? -1),
  });
}
