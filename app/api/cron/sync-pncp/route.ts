import { NextRequest, NextResponse } from 'next/server';
import {
  ALL_MODALIDADES, syncModalidade, logSyncStart, logSyncEnd,
} from '@/lib/pncp-sync';
import sql from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Daily sync triggered by Vercel Cron (06:00 and 18:00 BRT / 09:00 and 21:00 UTC).
 *
 * Mode is selected automatically based on cache size:
 *   < 5 000 records  → BOOTSTRAP: dispara cadeia de 90 dias pelas modalidades prioritárias
 *   < 400 000 records → FILL: dispara cadeia de 90 dias por todas as modalidades
 *   ≥ 400 000 records → INCREMENTAL: sync dos últimos 2 dias inline (rápido, cabe em 55s)
 *
 * Em modo bootstrap/fill: o cron dispara /api/internal/sync-chain que encadeia
 * automaticamente todas as modalidades (~12 min no total), cada uma com sua
 * própria janela de 60s — sem depender do frontend.
 */

const HARD_BUDGET_MS   = 55_000;
const INCREMENTAL_DAYS = 2;
const BOOTSTRAP_DAYS   = 90;

const PRIORITY1 = ALL_MODALIDADES.filter(m => m.priority === 1);

function baseUrl(req: NextRequest): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host  = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const provided   = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expected   = process.env.CRON_SECRET || '';
  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // ── Decide mode based on cache volume ──────────────────────────────────────
  let cacheCount = 0;
  try {
    const r = await sql`SELECT COUNT(*)::int AS c FROM licitacoes_pncp_cache`;
    cacheCount = Number(r[0]?.c || 0);
  } catch { /* proceed with 0 */ }

  let mode: 'bootstrap' | 'fill' | 'incremental';

  if (cacheCount < 5_000) {
    mode = 'bootstrap';
  } else if (cacheCount < 400_000) {
    mode = 'fill';
  } else {
    mode = 'incremental';
  }

  const logId = await logSyncStart(null, mode);

  // ── BOOTSTRAP / FILL: dispara cadeia interna e retorna ────────────────────
  if (mode !== 'incremental') {
    const targets  = mode === 'bootstrap' ? PRIORITY1 : ALL_MODALIDADES;
    const chainUrl = `${baseUrl(req)}/api/internal/sync-chain`;

    try {
      await fetch(chainUrl, {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-internal-secret': expected,
        },
        body: JSON.stringify({ step: 0, days: BOOTSTRAP_DAYS }),
      });
    } catch (e: any) {
      await logSyncEnd(logId, { inserted: 0, updated: 0, errors: 1 }, 'error', String(e?.message || e));
      return NextResponse.json({ error: 'Falha ao iniciar cadeia de sync', detail: String(e?.message || e) }, { status: 500 });
    }

    await logSyncEnd(logId, { inserted: 0, updated: 0, errors: 0 }, 'ok');

    return NextResponse.json({
      ok:         true,
      mode,
      cacheCount,
      chainStarted: true,
      message:    `Cadeia de sync iniciada — ${targets.length} modalidades serão processadas (~${targets.length} min)`,
    });
  }

  // ── INCREMENTAL: faz inline pois cabe nos 55s ─────────────────────────────
  const startedAt  = Date.now();
  const deadlineAt = startedAt + HARD_BUDGET_MS;

  const perModalidade: any[] = [];
  let totalInserted = 0, totalUpdated = 0, totalErrors = 0;

  for (const m of ALL_MODALIDADES) {
    if (Date.now() > deadlineAt) {
      perModalidade.push({ modalidade: m.mod, skipped: 'deadline' });
      continue;
    }
    try {
      const result = await syncModalidade({
        modalidade:  m.mod,
        days:        INCREMENTAL_DAYS,
        incremental: true,
        deadlineAt,
        concurrency: 8,
      });
      perModalidade.push(result);
      totalInserted += result.inserted;
      totalUpdated  += result.updated;
      totalErrors   += result.errors;
    } catch (e: any) {
      totalErrors++;
      perModalidade.push({ modalidade: m.mod, error: String(e?.message || e) });
    }
  }

  const status = totalErrors > 0 ? 'partial' : 'ok';
  await logSyncEnd(logId, {
    inserted: totalInserted, updated: totalUpdated, errors: totalErrors,
  }, status);

  return NextResponse.json({
    ok: true,
    mode,
    cacheCount,
    durationMs: Date.now() - startedAt,
    totalInserted, totalUpdated, totalErrors,
    perModalidade,
  });
}
