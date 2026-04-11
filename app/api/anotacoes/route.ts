import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const { texto, licitacaoGoverno } = await req.json();

  if (!texto || !licitacaoGoverno) {
    return NextResponse.json({ error: 'Texto e licitação obrigatórios' }, { status: 400 });
  }

  const hash = createHash('md5').update(`${userId}-${Date.now()}`).digest('hex').slice(0, 10);

  const result = await sql`
    INSERT INTO licitacoes_anotacoes (licitacoes_anotacao_texto, licitacoes_anotacao_hash, licitacoes_anotacao_autor, licitacoes_anotacao_licitacao_governo)
    VALUES (${texto}, ${hash}, ${userId}, ${licitacaoGoverno})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
