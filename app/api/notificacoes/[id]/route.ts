import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const { id } = await params;

  if (id === 'all') {
    await sql`UPDATE notificacoes SET notificacao_lido = 1 WHERE notificacao_destinatario = ${userId}`;
  } else {
    await sql`UPDATE notificacoes SET notificacao_lido = 1 WHERE notificacao_id = ${id} AND notificacao_destinatario = ${userId}`;
  }

  return NextResponse.json({ success: true });
}
