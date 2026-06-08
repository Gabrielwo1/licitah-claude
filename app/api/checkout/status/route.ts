import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;

  const rows = await sql`
    SELECT mp_preapproval_id, mp_subscription_status, usuario_plano
    FROM usuarios WHERE usuario_id = ${userId}
  `;

  const row = rows[0];
  return NextResponse.json({
    plano:          row?.usuario_plano ?? 'free',
    subscriptionId: row?.mp_preapproval_id ?? null,
    status:         row?.mp_subscription_status ?? null,
  });
}
