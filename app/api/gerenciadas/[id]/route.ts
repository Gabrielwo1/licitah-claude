import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const rows = await sql`
    SELECT * FROM licitacoes_gerenciadas
    WHERE lg_id = ${id} AND lg_conta = ${userId}
  `;

  if (rows.length === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  await sql`
    DELETE FROM licitacoes_gerenciadas
    WHERE lg_id = ${id} AND lg_conta = ${userId}
  `;

  return NextResponse.json({ success: true });
}
