import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const rows = await sql`
    SELECT usuario_display, usuario_email, usuario_whatsapp
    FROM usuarios WHERE usuario_id = ${userId}
  `;
  if (rows.length === 0) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  return NextResponse.json({
    nome:      rows[0].usuario_display,
    email:     rows[0].usuario_email,
    whatsapp:  rows[0].usuario_whatsapp || '',
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const { nome, email, whatsapp } = await req.json();

  if (!nome || !email) return NextResponse.json({ error: 'Nome e email obrigatórios' }, { status: 400 });

  const emailCheck = await sql`
    SELECT usuario_id FROM usuarios
    WHERE usuario_email = ${email} AND usuario_id != ${userId}
  `;
  if (emailCheck.length > 0) return NextResponse.json({ error: 'Email já em uso por outro usuário' }, { status: 409 });

  const wpp = whatsapp ? whatsapp.replace(/\D/g, '').substring(0, 20) : null;

  await sql`
    UPDATE usuarios
    SET usuario_display   = ${nome},
        usuario_email     = ${email},
        usuario_whatsapp  = ${wpp}
    WHERE usuario_id = ${userId}
  `;

  return NextResponse.json({ success: true });
}
