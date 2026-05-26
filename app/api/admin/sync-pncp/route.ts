import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncModalidade, logSyncStart, logSyncEnd, ALL_MODALIDADES } from '@/lib/pncp-sync';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const funcao = (session?.user as any)?.funcao;
  if (funcao !== 0 && funcao !== 1) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const mod         = Number(body.mod);
  const days        = Number(body.days)        || 90;
  const concurrency = Number(body.concurrency) || 8;

  const modalidade = ALL_MODALIDADES.find(m => m.mod === mod);
  if (!modalidade) {
    return NextResponse.json({ error: 'Modalidade inválida' }, { status: 400 });
  }

  const startedAt  = Date.now();
  const deadlineAt = startedAt + 55_000;

  const logId = await logSyncStart(mod, 'admin-manual');

  try {
    const result = await syncModalidade({
      modalidade:  mod,
      days,
      incremental: false,
      deadlineAt,
      concurrency,
    });

    await logSyncEnd(logId, {
      inserted: result.inserted,
      updated:  result.updated,
      pages:    result.pagesFetched,
      errors:   result.errors,
    }, result.errors > 0 ? 'partial' : 'ok');

    return NextResponse.json({
      ok:             true,
      modalidade:     mod,
      modalidadeNome: modalidade.label,
      ...result,
    });
  } catch (e: any) {
    await logSyncEnd(logId, { inserted: 0, updated: 0, errors: 1 }, 'error', String(e?.message || e));
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
