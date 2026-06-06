import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const { valor, resultado, observacao } = await req.json();

  const VALID = ['aguardando', 'venceu', 'perdeu', 'desclassificado', 'cancelado'];
  const resultadoVal = VALID.includes(resultado) ? resultado : undefined;

  const valorNum = valor != null ? parseFloat(String(valor).replace(',', '.')) : undefined;

  const rows = await sql`
    UPDATE lances SET
      lance_resultado  = COALESCE(${resultadoVal ?? null}, lance_resultado),
      lance_valor      = COALESCE(${valorNum ?? null}, lance_valor),
      lance_observacao = COALESCE(${observacao ?? null}, lance_observacao)
    WHERE lance_id = ${id} AND lance_conta = ${userId}
    RETURNING *
  `;

  if (rows.length === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  await sql`DELETE FROM lances WHERE lance_id = ${id} AND lance_conta = ${userId}`;
  return NextResponse.json({ success: true });
}
