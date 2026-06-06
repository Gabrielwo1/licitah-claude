import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const sessoes = await sql`
    SELECT s.*,
           (SELECT json_agg(l ORDER BY l.criado_em DESC)
            FROM robo_lances l WHERE l.sessao_id = s.id) AS lances
    FROM robo_sessoes s
    WHERE s.usuario_id = ${userId}
    ORDER BY s.iniciado_em DESC
    LIMIT 50
  `;

  return NextResponse.json({ data: sessoes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const {
    uasg, numero_pregao, item_numero, objeto,
    preco_minimo, estrategia, decremento_valor, decremento_pct,
    numero_controle_pncp,
  } = await req.json();

  if (!uasg || !numero_pregao || !preco_minimo) {
    return NextResponse.json({ error: 'UASG, número do pregão e preço mínimo são obrigatórios' }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO robo_sessoes
      (usuario_id, numero_controle_pncp, uasg, numero_pregao, item_numero, objeto,
       preco_minimo, estrategia, decremento_valor, decremento_pct)
    VALUES
      (${userId}, ${numero_controle_pncp || null}, ${uasg}, ${numero_pregao},
       ${item_numero || null}, ${objeto || null}, ${preco_minimo},
       ${estrategia || 'moderada'}, ${decremento_valor || null}, ${decremento_pct || null})
    RETURNING *
  `;

  return NextResponse.json({ data: rows[0] }, { status: 201 });
}
