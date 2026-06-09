import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ ok: true });

  const client = new MercadoPagoConfig({ accessToken });

  try {
    if (body?.type === 'preapproval' && body?.data?.id) {
      // Cartão de crédito — subscription status change
      const preApproval  = new PreApproval(client);
      const subscription = await preApproval.get({ id: String(body.data.id) });
      const userId = subscription.external_reference;
      const status = subscription.status ?? 'cancelled';

      if (userId) {
        const plano = status === 'authorized' ? 'expert' : 'free';
        await sql`
          UPDATE usuarios SET
            usuario_plano          = ${plano},
            mp_subscription_status = ${status}
          WHERE usuario_id        = ${userId}
            AND mp_preapproval_id = ${String(body.data.id)}
        `;
      }
    } else if (body?.type === 'payment' && body?.data?.id) {
      // PIX — one-time payment confirmation
      const payment = new Payment(client);
      const result  = await payment.get({ id: String(body.data.id) });
      const userId  = result.external_reference;
      const status  = result.status;

      if (userId && status === 'approved') {
        await sql`
          UPDATE usuarios SET
            usuario_plano          = 'expert',
            mp_subscription_status = 'pix_active'
          WHERE usuario_id         = ${userId}
            AND mp_pix_payment_id  = ${String(body.data.id)}
        `;
      }
    }
  } catch {
    // Never fail webhooks — MP retries on non-2xx
  }

  return NextResponse.json({ ok: true });
}
