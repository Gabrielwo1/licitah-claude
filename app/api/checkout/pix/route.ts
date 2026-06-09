import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId    = (session.user as any).id;
  const userEmail = session.user?.email!;

  // Block if already Expert via subscription
  const rows = await sql`
    SELECT usuario_plano, mp_subscription_status FROM usuarios WHERE usuario_id = ${userId}
  `;
  if (rows[0]?.mp_subscription_status === 'authorized') {
    return NextResponse.json({ error: 'Você já possui uma assinatura ativa' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const cpf: string | undefined = body?.cpf?.replace(/\D/g, '');

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ error: 'Configuração de pagamento indisponível' }, { status: 500 });

  try {
    const client  = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    const result = await payment.create({
      body: {
        transaction_amount: 99.99,
        payment_method_id:  'pix',
        description:        'Plano Expert – Licitah',
        external_reference: String(userId),
        date_of_expiration: expiresAt,
        payer: {
          email: userEmail,
          ...(cpf ? { identification: { type: 'CPF', number: cpf } } : {}),
        },
      },
    });

    const txData = result.point_of_interaction?.transaction_data;
    if (!txData?.qr_code) {
      return NextResponse.json({ error: 'Erro ao gerar QR Code PIX' }, { status: 500 });
    }

    // Save pending PIX payment ID
    await sql`
      UPDATE usuarios SET mp_pix_payment_id = ${String(result.id!)}
      WHERE usuario_id = ${userId}
    `;

    return NextResponse.json({
      paymentId:    result.id,
      qrCode:       txData.qr_code,
      qrCodeBase64: txData.qr_code_base64
        ? `data:image/png;base64,${txData.qr_code_base64}`
        : null,
      ticketUrl: txData.ticket_url ?? null,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erro ao gerar PIX' }, { status: 500 });
  }
}
