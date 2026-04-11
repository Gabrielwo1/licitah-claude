import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const empresaId = (session.user as any).empresaId || 0;

  const oportunidades = await sql`
    SELECT * FROM licitacoes_oportunidades
    WHERE licitacoes_oportunidade_empresa = ${empresaId}
    ORDER BY licitacoes_oportunidade_id DESC
  `;

  return NextResponse.json(oportunidades);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const empresaId = (session.user as any).empresaId || 0;
  const { palavras, regioes } = await req.json();

  if (!palavras) return NextResponse.json({ error: 'Palavras-chave obrigatórias' }, { status: 400 });

  const result = await sql`
    INSERT INTO licitacoes_oportunidades (licitacoes_oportunidade_empresa, licitacoes_oportunidade_regioes, licitacoes_oportunidade_palavras)
    VALUES (${empresaId}, ${regioes || ''}, ${palavras})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
