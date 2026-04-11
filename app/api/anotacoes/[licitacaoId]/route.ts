import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ licitacaoId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { licitacaoId } = await params;
  const licitacaoIdDecoded = decodeURIComponent(licitacaoId);

  const anotacoes = await sql`
    SELECT a.*, u.usuario_nome as autor_nome
    FROM licitacoes_anotacoes a
    LEFT JOIN usuarios u ON u.usuario_id = a.licitacoes_anotacao_autor
    WHERE a.licitacoes_anotacao_licitacao_governo = ${licitacaoIdDecoded}
    ORDER BY a.licitacoes_anotacao_id DESC
  `;

  return NextResponse.json(anotacoes);
}
