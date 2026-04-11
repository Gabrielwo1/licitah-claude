import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createHash } from 'crypto';

function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const { senhaAtual, novaSenha } = await req.json();

  if (!senhaAtual || !novaSenha) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });

  // Verify current password
  const hashedAtual = md5(senhaAtual);
  const check = await sql`SELECT usuario_id FROM usuarios WHERE usuario_id = ${userId} AND usuario_senha = ${hashedAtual}`;
  if (check.length === 0) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });

  const hashedNova = md5(novaSenha);
  await sql`UPDATE usuarios SET usuario_senha = ${hashedNova} WHERE usuario_id = ${userId}`;

  return NextResponse.json({ success: true });
}
