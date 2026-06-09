import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId    = (session.user as any).id;
  const paymentId = req.nextUrl.searchParams.get('id');
  if (!paymentId) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  try {
    const client  = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
    const payment = new Payment(client);
    const result  = await payment.get({ id: paymentId });

    const status = result.status ?? 'pending';

    if (status === 'approved') {
      await sql`
        UPDATE usuarios SET
          usuario_plano          = 'expert',
          mp_subscription_status = 'pix_active'
        WHERE usuario_id = ${userId}
          AND mp_pix_payment_id = ${paymentId}
      `;
    }

    return NextResponse.json({ status });
  } catch {
    return NextResponse.json({ status: 'pending' });
  }
}
