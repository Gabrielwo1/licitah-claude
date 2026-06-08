import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPreApproval } from '@/lib/mercadopago';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;

  const rows = await sql`
    SELECT mp_preapproval_id FROM usuarios WHERE usuario_id = ${userId}
  `;
  const subscriptionId = rows[0]?.mp_preapproval_id;

  if (!subscriptionId) {
    return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 400 });
  }

  try {
    const preApproval = getPreApproval();
    await preApproval.update({ id: subscriptionId, body: { status: 'cancelled' } });

    await sql`
      UPDATE usuarios SET
        usuario_plano           = 'free',
        mp_subscription_status  = 'cancelled'
      WHERE usuario_id = ${userId}
    `;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Erro ao cancelar assinatura' },
      { status: 500 },
    );
  }
}
