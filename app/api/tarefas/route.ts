import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createHash } from 'crypto';

function randomHash(): string {
  return createHash('md5').update(Math.random().toString()).digest('hex');
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let tarefas;
  if (status === 'pending') {
    tarefas = await sql`
      SELECT * FROM licitacoes_tarefas
      WHERE licitacoes_tarefa_autor = ${userId}
        AND licitacoes_tarefa_status = 1
      ORDER BY licitacoes_tarefa_prazo ASC
    `;
  } else if (status === 'done') {
    tarefas = await sql`
      SELECT * FROM licitacoes_tarefas
      WHERE licitacoes_tarefa_autor = ${userId}
        AND licitacoes_tarefa_status = 2
      ORDER BY licitacoes_tarefa_prazo DESC
    `;
  } else {
    tarefas = await sql`
      SELECT * FROM licitacoes_tarefas
      WHERE licitacoes_tarefa_autor = ${userId}
      ORDER BY licitacoes_tarefa_prazo ASC
    `;
  }

  return NextResponse.json(tarefas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const userName = (session.user as any).name || '';
  const { nome, prazo } = await req.json();

  if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const hash = randomHash();

  const result = await sql`
    INSERT INTO licitacoes_tarefas (
      licitacoes_tarefa_nome, licitacoes_tarefa_prazo, licitacoes_tarefa_status,
      licitacoes_tarefa_hash, licitacoes_tarefa_autor, licitacoes_tarefa_usuario,
      licitacoes_tarefa_usuario_display, licitacoes_tarefa_andamento, licitacoes_tarefa_prioridade
    )
    VALUES (${nome}, ${prazo || null}, 1, ${hash}, ${userId}, ${userId}, ${userName}, 0, 'Média')
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
