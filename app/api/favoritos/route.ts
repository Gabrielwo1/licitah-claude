import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const empresaId = (session.user as any).empresaId;

  const favoritos = await sql`
    SELECT * FROM favoritos
    WHERE favorito_autor = ${userId}
    ${empresaId ? sql`AND favorito_empresa = ${empresaId}` : sql``}
    ORDER BY favorito_id DESC
  `;

  return NextResponse.json(favoritos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const empresaId = (session.user as any).empresaId || 0;
  const { identificador, modulo = 'licitacao' } = await req.json();

  if (!identificador) return NextResponse.json({ error: 'Identificador obrigatório' }, { status: 400 });

  // Check if already favorited
  const existing = await sql`
    SELECT favorito_id FROM favoritos
    WHERE favorito_autor = ${userId} AND favorito_identificador = ${identificador} AND favorito_modulo = ${modulo}
  `;

  if (existing.length > 0) {
    // Remove
    await sql`DELETE FROM favoritos WHERE favorito_id = ${existing[0].favorito_id}`;
    return NextResponse.json({ favorited: false });
  } else {
    // Add
    await sql`
      INSERT INTO favoritos (favorito_modulo, favorito_identificador, favorito_autor, favorito_empresa)
      VALUES (${modulo}, ${identificador}, ${userId}, ${empresaId})
    `;
    return NextResponse.json({ favorited: true });
  }
}
