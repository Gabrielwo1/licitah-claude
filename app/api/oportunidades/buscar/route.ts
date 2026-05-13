import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import {
  parseKeywords, parseRegion,
  fetchOportunidades,
  DATE_WINDOW_DAYS,
} from '@/lib/oportunidades';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  // Load user's oportunidade config
  const rows = await sql`
    SELECT * FROM licitacoes_oportunidades
    WHERE licitacoes_oportunidade_autor = ${userId}
    ORDER BY licitacoes_oportunidade_id DESC
    LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ keywords: [], data: [] });

  const row = rows[0];
  const regioes  = row.licitacoes_oportunidade_regioes || '';
  const keywords = parseKeywords(row.licitacoes_oportunidade_tagmento);
  if (keywords.length === 0) return NextResponse.json({ keywords: [], data: [] });

  const { uf, cidade } = parseRegion(regioes);

  // Full search: no-store (always fresh on user demand), full date window + all modalidades
  const result = await fetchOportunidades(
    keywords,
    { uf, cidade },
    { cache: 'no-store' }
  );

  return NextResponse.json({
    keywords: result.keywords,
    uf:       result.uf,
    cidade:   result.cidade,
    data:     result.data,
    fetchedAt: result.fetchedAt,
    windowDays: result.windowDays || DATE_WINDOW_DAYS,
  });
}
