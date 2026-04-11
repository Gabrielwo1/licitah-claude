import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createHash } from 'crypto';

function randomHash(): string {
  return createHash('md5').update(Math.random().toString()).digest('hex').slice(0, 16);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const empresaId = (session.user as any).empresaId || 0;
  const userId = (session.user as any).id;

  const oportunidades = await sql`
    SELECT * FROM licitacoes_oportunidades
    WHERE licitacoes_oportunidade_autor = ${userId}
    ORDER BY licitacoes_oportunidade_id DESC
  `;

  return NextResponse.json(oportunidades);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const empresaId = (session.user as any).empresaId || 0;
  const userId = (session.user as any).id;
  const { palavras, regioes } = await req.json();

  if (!palavras) return NextResponse.json({ error: 'Palavras-chave obrigatórias' }, { status: 400 });

  const hash = randomHash();

  const result = await sql`
    INSERT INTO licitacoes_oportunidades (
      licitacoes_oportunidade_empresa, licitacoes_oportunidade_regioes,
      licitacoes_oportunidade_tagmento, licitacoes_oportunidade_hash, licitacoes_oportunidade_autor
    )
    VALUES (${empresaId}, ${regioes || ''}, ${palavras}, ${hash}, ${userId})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
