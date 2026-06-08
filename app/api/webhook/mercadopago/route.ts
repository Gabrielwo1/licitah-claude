import { NextRequest, NextResponse } from 'next/server';
import { getPreApproval } from '@/lib/mercadopago';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  // MP sends: { type: 'preapproval', data: { id: '<preapproval_id>' } }
  if (body?.type !== 'preapproval' || !body?.data?.id) {
    return NextResponse.json({ ok: true });
  }

  try {
    const preApproval = getPreApproval();
    const subscription = await preApproval.get({ id: String(body.data.id) });
    const userId = subscription.external_reference;
    const status = subscription.status ?? 'cancelled';

    if (!userId) return NextResponse.json({ ok: true });

    const plano = status === 'authorized' ? 'expert' : 'free';

    await sql`
      UPDATE usuarios SET
        usuario_plano          = ${plano},
        mp_subscription_status = ${status}
      WHERE usuario_id          = ${userId}
        AND mp_preapproval_id   = ${String(body.data.id)}
    `;
  } catch {
    // Never fail webhooks — MP retries on non-2xx
  }

  return NextResponse.json({ ok: true });
}
