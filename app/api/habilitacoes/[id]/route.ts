import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  await sql`
    DELETE FROM licitacoes_habilitacoes
    WHERE licitacoes_habilitacao_id = ${id} AND licitacoes_habilitacao_autor = ${userId}
  `;

  return NextResponse.json({ success: true });
}
