import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const identificador = searchParams.get('identificador');

  // Busca por identificador específico
  if (identificador) {
    const rows = await sql`
      SELECT * FROM licitacoes_gerenciadas
      WHERE lg_conta = ${userId} AND lg_identificador = ${identificador}
      LIMIT 1
    `;
    return NextResponse.json({ data: rows[0] || null });
  }

  const rows = await sql`
    SELECT * FROM licitacoes_gerenciadas
    WHERE lg_conta = ${userId}
    ORDER BY lg_criado_em DESC
  `;

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const {
    identificador,
    objeto,
    orgao,
    cidade,
    uf,
    valor,
    situacao,
    dataAbertura,
    dataEncerramento,
  } = body;

  if (!identificador) {
    return NextResponse.json({ error: 'Identificador obrigatório' }, { status: 400 });
  }

  // Upsert — se já existe, retorna o existente
  const existing = await sql`
    SELECT lg_id FROM licitacoes_gerenciadas
    WHERE lg_conta = ${userId} AND lg_identificador = ${identificador}
  `;

  if (existing.length > 0) {
    return NextResponse.json({ lg_id: existing[0].lg_id, already_existed: true });
  }

  const rows = await sql`
    INSERT INTO licitacoes_gerenciadas
      (lg_conta, lg_identificador, lg_objeto, lg_orgao, lg_cidade, lg_uf, lg_valor, lg_situacao, lg_data_abertura, lg_data_encerramento)
    VALUES
      (${userId}, ${identificador}, ${objeto || null}, ${orgao || null}, ${cidade || null}, ${uf || null},
       ${valor || null}, ${situacao || null}, ${dataAbertura || null}, ${dataEncerramento || null})
    RETURNING lg_id
  `;

  return NextResponse.json({ lg_id: rows[0].lg_id, already_existed: false });
}
