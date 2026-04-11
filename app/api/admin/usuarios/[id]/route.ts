import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const funcao = (session?.user as any)?.funcao;
  if (funcao !== 0 && funcao !== 1) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { id } = await params;
  const { ativo, funcao: novaFuncao } = await req.json();

  await sql`
    UPDATE usuarios
    SET
      usuario_ativo = COALESCE(${ativo ?? null}, usuario_ativo),
      usuario_funcao = COALESCE(${novaFuncao ?? null}, usuario_funcao)
    WHERE usuario_id = ${id}
  `;

  return NextResponse.json({ success: true });
}
