import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const empresaId = (session.user as any).empresaId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let tarefas;
  if (status === 'pending') {
    tarefas = await sql`
      SELECT * FROM licitacoes_tarefas
      WHERE licitacoes_tarefa_empresa = ${empresaId || 0}
        AND licitacoes_tarefa_status = 0
      ORDER BY licitacoes_tarefa_prazo ASC
    `;
  } else if (status === 'done') {
    tarefas = await sql`
      SELECT * FROM licitacoes_tarefas
      WHERE licitacoes_tarefa_empresa = ${empresaId || 0}
        AND licitacoes_tarefa_status = 1
      ORDER BY licitacoes_tarefa_prazo DESC
    `;
  } else {
    tarefas = await sql`
      SELECT * FROM licitacoes_tarefas
      WHERE licitacoes_tarefa_empresa = ${empresaId || 0}
      ORDER BY licitacoes_tarefa_prazo ASC
    `;
  }

  return NextResponse.json(tarefas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const empresaId = (session.user as any).empresaId || 0;
  const { nome, prazo, licitacaoGoverno } = await req.json();

  if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const result = await sql`
    INSERT INTO licitacoes_tarefas (licitacoes_tarefa_nome, licitacoes_tarefa_prazo, licitacoes_tarefa_status, licitacoes_tarefa_licitacao_governo, licitacoes_tarefa_empresa)
    VALUES (${nome}, ${prazo || null}, 0, ${licitacaoGoverno || null}, ${empresaId})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
