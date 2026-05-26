import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const funcao = (session?.user as any)?.funcao;
  if (funcao !== 0 && funcao !== 1) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const [total, byModalidade, lastSync, oldest] = await Promise.all([
    sql`SELECT COUNT(*)::int AS c FROM licitacoes_pncp_cache`,
    sql`
      SELECT modalidade_id, modalidade_nome, COUNT(*)::int AS c,
             MAX(sincronizado_em) AS ultima_sync
      FROM licitacoes_pncp_cache
      WHERE modalidade_id IS NOT NULL
      GROUP BY modalidade_id, modalidade_nome
      ORDER BY c DESC
    `,
    sql`SELECT MAX(sincronizado_em) AS ts FROM licitacoes_pncp_cache`,
    sql`SELECT MIN(data_publicacao)::text AS dt FROM licitacoes_pncp_cache`,
  ]);

  return NextResponse.json({
    total: Number(total[0]?.c || 0),
    byModalidade,
    lastSync: lastSync[0]?.ts || null,
    oldestRecord: oldest[0]?.dt || null,
  });
}
