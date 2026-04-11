import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const { nome, email } = await req.json();

  if (!nome || !email) return NextResponse.json({ error: 'Nome e email obrigatórios' }, { status: 400 });

  // Check email uniqueness
  const emailCheck = await sql`SELECT usuario_id FROM usuarios WHERE usuario_email = ${email} AND usuario_id != ${userId}`;
  if (emailCheck.length > 0) return NextResponse.json({ error: 'Email já em uso por outro usuário' }, { status: 409 });

  await sql`UPDATE usuarios SET usuario_display = ${nome}, usuario_email = ${email} WHERE usuario_id = ${userId}`;

  return NextResponse.json({ success: true });
}
