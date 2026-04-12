import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const rows = await sql`
    SELECT * FROM licitacoes_habilitacoes
    WHERE licitacoes_habilitacao_id = ${id}
      AND licitacoes_habilitacao_autor = ${userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;
  await sql`DELETE FROM licitacoes_habilitacoes WHERE licitacoes_habilitacao_id = ${id} AND licitacoes_habilitacao_autor = ${userId}`;
  return NextResponse.json({ ok: true });
}
