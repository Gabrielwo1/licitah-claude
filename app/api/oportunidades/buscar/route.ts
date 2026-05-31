import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { parseKeywords, parseRegion } from '@/lib/oportunidades';
import { queryOportunidadesFromCache, PERIOD_DAYS } from '@/lib/oportunidades-cache';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * GET /api/oportunidades/buscar?periodo=todos|30d|7d|48h|24h
 *
 * Returns licitações matching the user's profile (keywords + region + CATMAT)
 * from licitacoes_pncp_cache — fast local query instead of PNCP live fetch.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const sp      = req.nextUrl.searchParams;
  const periodo = PERIOD_DAYS[sp.get('periodo') || ''] ? (sp.get('periodo') as string) : 'todos';

  // Load user's oportunidade config
  const rows = await sql`
    SELECT * FROM licitacoes_oportunidades
    WHERE licitacoes_oportunidade_autor = ${userId}
    ORDER BY licitacoes_oportunidade_id DESC
    LIMIT 1
  `.catch(() => [] as any[]);

  if (rows.length === 0) {
    return NextResponse.json({ keywords: [], catmatCodes: [], data: [], total: 0, periodo });
  }

  const row        = rows[0];
  const keywords   = parseKeywords(row.licitacoes_oportunidade_tagmento);
  const catmatCodes: string[] = Array.isArray(row.catmat_codes) ? row.catmat_codes : [];

  if (keywords.length === 0) {
    return NextResponse.json({ keywords: [], catmatCodes, data: [], total: 0, periodo });
  }

  const { uf, cidade } = parseRegion(row.licitacoes_oportunidade_regioes || '');

  const data = await queryOportunidadesFromCache(keywords, { uf, cidade }, {
    periodo,
    catmatCodes,
    limit: 500,
  });

  return NextResponse.json({
    keywords,
    catmatCodes,
    uf,
    cidade,
    data,
    total:     data.length,
    periodo,
    fetchedAt: new Date().toISOString(),
  });
}
