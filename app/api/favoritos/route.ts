import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;

  const favoritos = await sql`
    SELECT * FROM favoritos
    WHERE favorito_autor = ${userId}
    ORDER BY favorito_id DESC
  `;

  return NextResponse.json(favoritos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const { identificador, modulo = 'licitacao' } = await req.json();

  if (!identificador) return NextResponse.json({ error: 'Identificador obrigatório' }, { status: 400 });

  const existing = await sql`
    SELECT favorito_id FROM favoritos
    WHERE favorito_autor = ${userId} AND favorito_identificador = ${identificador} AND favorito_modulo = ${modulo}
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM favoritos WHERE favorito_id = ${existing[0].favorito_id}`;
    return NextResponse.json({ favorited: false });
  } else {
    await sql`
      INSERT INTO favoritos (favorito_modulo, favorito_identificador, favorito_autor)
      VALUES (${modulo}, ${identificador}, ${userId})
    `;
    return NextResponse.json({ favorited: true });
  }
}
