import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId    = (session.user as any).id;

  const rows = await sql`
    SELECT * FROM lances
    WHERE lance_conta = ${userId}
    ORDER BY lance_data DESC
  `;

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId    = (session.user as any).id;
  const empresaId = (session.user as any).empresaId || null;

  const { licitacao, objeto, orgao, valor, observacao, resultado } = await req.json();

  if (!licitacao || valor == null) {
    return NextResponse.json({ error: 'Licitação e valor são obrigatórios' }, { status: 400 });
  }

  const valorNum = parseFloat(String(valor).replace(',', '.'));
  if (isNaN(valorNum) || valorNum <= 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
  }

  const resultadoVal = ['aguardando', 'venceu', 'perdeu', 'desclassificado', 'cancelado']
    .includes(resultado) ? resultado : 'aguardando';

  const rows = await sql`
    INSERT INTO lances (lance_licitacao, lance_conta, lance_empresa, lance_objeto, lance_orgao, lance_valor, lance_observacao, lance_resultado)
    VALUES (${licitacao}, ${userId}, ${empresaId}, ${objeto || null}, ${orgao || null}, ${valorNum}, ${observacao || null}, ${resultadoVal})
    RETURNING *
  `;

  return NextResponse.json({ data: rows[0] }, { status: 201 });
}
