import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createHash } from 'crypto';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const licitacaoGoverno = searchParams.get('licitacaoGoverno') || '';

  const rows = await sql`
    SELECT * FROM licitacoes_anexos
    WHERE licitacoes_anexo_autor = ${userId}
      AND licitacoes_anexo_licitacao_governo = ${licitacaoGoverno}
    ORDER BY licitacoes_anexo_data DESC
  `;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const { nome, documento, licitacaoGoverno } = await req.json();
  if (!nome || !licitacaoGoverno) {
    return NextResponse.json({ error: 'Nome e licitação obrigatórios' }, { status: 400 });
  }

  const hash = createHash('md5').update(`${userId}-${Date.now()}`).digest('hex').slice(0, 10);
  const result = await sql`
    INSERT INTO licitacoes_anexos (
      licitacoes_anexo_nome, licitacoes_anexo_documento,
      licitacoes_anexo_hash, licitacoes_anexo_autor,
      licitacoes_anexo_licitacao_governo
    )
    VALUES (${nome}, ${documento || ''}, ${hash}, ${userId}, ${licitacaoGoverno})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
