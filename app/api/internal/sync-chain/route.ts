import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { ALL_MODALIDADES, syncModalidade } from '@/lib/pncp-sync';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Sync em cadeia interna — cada invocação processa uma modalidade e dispara
 * a próxima automaticamente via `after()`, sem depender do frontend.
 *
 * Fluxo:
 *  1. Cron (ou qualquer chamada) dispara POST { step: 0, days: 90 }
 *  2. Esta rota responde imediatamente (< 1ms)
 *  3. No after(): sincroniza a modalidade do step atual (50s de janela)
 *  4. Ao terminar, dispara POST { step: 1 } para a próxima invocação
 *  5. Repete até step >= ALL_MODALIDADES.length
 *
 * Cada step é uma invocação independente no Vercel com sua própria janela
 * de 60s — 15 modalidades × ~50s = ~12 minutos no total para um full sync.
 *
 * Protegido pelo mesmo CRON_SECRET do cron diário.
 */

function baseUrl(req: NextRequest): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host  = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const secret   = req.headers.get('x-internal-secret') || '';
  const expected = process.env.CRON_SECRET || '';

  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { step?: number; days?: number } = {};
  try { body = await req.json(); } catch { /* body vazio ok */ }

  const step = Math.max(0, Number(body.step ?? 0));
  const days = Math.max(1, Number(body.days ?? 90));

  if (step >= ALL_MODALIDADES.length) {
    return NextResponse.json({ ok: true, done: true, message: 'Sync completo — todas as modalidades processadas.' });
  }

  const m        = ALL_MODALIDADES[step];
  const self     = baseUrl(req);
  const nextStep = step + 1;

  // Responde imediatamente; trabalho pesado fica no after()
  after(async () => {
    // Sincroniza esta modalidade com 50s de budget (5s de folga para encadear)
    try {
      await syncModalidade({
        modalidade:  m.mod,
        days,
        incremental: false,
        deadlineAt:  Date.now() + 50_000,
        concurrency: 6,
      });
    } catch { /* continua a cadeia mesmo em erro */ }

    // Dispara a próxima modalidade (nova invocação independente)
    if (nextStep < ALL_MODALIDADES.length) {
      try {
        await fetch(`${self}/api/internal/sync-chain`, {
          method:  'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-internal-secret': expected,
          },
          body: JSON.stringify({ step: nextStep, days }),
        });
      } catch { /* ignora falha de encadeamento */ }
    }
  });

  return NextResponse.json({
    ok:       true,
    step,
    label:    m.label,
    status:   'iniciado',
    nextStep: nextStep < ALL_MODALIDADES.length ? nextStep : null,
  });
}
