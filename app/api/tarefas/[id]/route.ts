import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const { status, nome, prazo } = await req.json();

  const result = await sql`
    UPDATE licitacoes_tarefas
    SET
      licitacoes_tarefa_status = COALESCE(${status ?? null}, licitacoes_tarefa_status),
      licitacoes_tarefa_nome = COALESCE(${nome ?? null}, licitacoes_tarefa_nome),
      licitacoes_tarefa_prazo = COALESCE(${prazo ?? null}, licitacoes_tarefa_prazo)
    WHERE licitacoes_tarefa_id = ${id}
    RETURNING *
  `;

  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  await sql`DELETE FROM licitacoes_tarefas WHERE licitacoes_tarefa_id = ${id}`;
  return NextResponse.json({ success: true });
}
