import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;

  const notificacoes = await sql`
    SELECT * FROM notificacoes
    WHERE notificacao_destinatario = ${userId}
    ORDER BY notificacao_data DESC
    LIMIT 50
  `;

  return NextResponse.json(notificacoes);
}
