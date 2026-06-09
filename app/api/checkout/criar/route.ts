import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPreApproval } from '@/lib/mercadopago';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId    = (session.user as any).id;
  const userEmail = session.user?.email!;

  const body = await req.json().catch(() => ({}));
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: 'Token do cartão é obrigatório' }, { status: 400 });
  }

  // Block duplicate active subscriptions
  const rows = await sql`
    SELECT mp_preapproval_id, mp_subscription_status
    FROM usuarios WHERE usuario_id = ${userId}
  `;
  if (rows[0]?.mp_subscription_status === 'authorized') {
    return NextResponse.json({ error: 'Você já possui uma assinatura ativa' }, { status: 400 });
  }

  try {
    const preApproval = getPreApproval();
    const result = await preApproval.create({
      body: {
        reason:           'Plano Expert – Licitah',
        payer_email:      userEmail,
        card_token_id:    token,
        auto_recurring: {
          frequency:          1,
          frequency_type:     'months',
          transaction_amount: 99.99,
          currency_id:        'BRL',
        },
        back_url:         `${process.env.NEXTAUTH_URL ?? ''}/dashboard/planos`,
        status:           'authorized',
        external_reference: String(userId),
      },
    });

    await sql`
      UPDATE usuarios SET
        usuario_plano            = 'expert',
        mp_preapproval_id        = ${result.id!},
        mp_subscription_status   = ${result.status ?? 'authorized'}
      WHERE usuario_id = ${userId}
    `;

    return NextResponse.json({ ok: true, subscriptionId: result.id, status: result.status });
  } catch (err: any) {
    const cause = err?.cause ?? err?.message ?? 'Erro ao processar pagamento';
    return NextResponse.json({ error: String(cause) }, { status: 500 });
  }
}
