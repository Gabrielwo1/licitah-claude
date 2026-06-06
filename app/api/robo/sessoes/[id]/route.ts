import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUS = ['aguardando', 'conectando', 'aguardando_disputa', 'em_disputa', 'vencemos', 'perdemos', 'erro', 'cancelado'];

// Dashboard or worker updates session state
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  // Worker authentication (no session cookie, uses shared secret)
  const workerSecret = req.headers.get('x-worker-secret');
  const expectedSecret = process.env.WORKER_SECRET || '';

  let userId: number | null = null;

  if (workerSecret && expectedSecret && workerSecret === expectedSecret) {
    // Worker call — trust the request, get userId from body
    const body = await req.json();
    const { status, melhor_lance, lance_vencedor, posicao_atual, worker_id, log_texto } = body;

    if (status && !VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    await sql`
      UPDATE robo_sessoes SET
        status           = COALESCE(${status || null}, status),
        melhor_lance     = COALESCE(${melhor_lance ?? null}, melhor_lance),
        lance_vencedor   = COALESCE(${lance_vencedor ?? null}, lance_vencedor),
        posicao_atual    = COALESCE(${posicao_atual ?? null}, posicao_atual),
        worker_id        = COALESCE(${worker_id || null}, worker_id),
        ultimo_heartbeat = NOW(),
        encerrado_em     = CASE WHEN ${status || ''} IN ('vencemos','perdemos','erro','cancelado') THEN NOW() ELSE encerrado_em END,
        log_texto        = CASE WHEN ${log_texto || ''} <> '' THEN COALESCE(log_texto,'') || E'\n' || ${log_texto || ''} ELSE log_texto END
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  }

  // Dashboard call — requires session
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  userId = (session.user as any).id;

  const body = await req.json();
  const { status } = body;

  if (status === 'cancelado') {
    await sql`
      UPDATE robo_sessoes SET status = 'cancelado', encerrado_em = NOW()
      WHERE id = ${id} AND usuario_id = ${userId}
    `;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Operação não permitida' }, { status: 400 });
}

// Worker posts individual lances
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const workerSecret = req.headers.get('x-worker-secret');
  const expectedSecret = process.env.WORKER_SECRET || '';
  if (!workerSecret || workerSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { usuario_id, valor, tipo, contexto } = await req.json();

  if (!valor) return NextResponse.json({ error: 'Valor obrigatório' }, { status: 400 });

  await sql`
    INSERT INTO robo_lances (sessao_id, usuario_id, valor, tipo, contexto)
    VALUES (${id}, ${usuario_id}, ${valor}, ${tipo || 'automatico'}, ${JSON.stringify(contexto || {})}::jsonb)
  `;

  await sql`UPDATE robo_sessoes SET melhor_lance = ${valor} WHERE id = ${id}`;

  return NextResponse.json({ success: true }, { status: 201 });
}
