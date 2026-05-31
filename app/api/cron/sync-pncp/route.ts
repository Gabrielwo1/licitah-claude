import { NextRequest, NextResponse } from 'next/server';
import {
  ALL_MODALIDADES, syncModalidade, logSyncStart, logSyncEnd,
} from '@/lib/pncp-sync';
import sql from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Daily sync triggered by Vercel Cron (06:00 and 18:00 BRT).
 *
 * Mode is selected automatically based on cache size:
 *   < 5 000 records  → BOOTSTRAP: sync 90 days for top-priority modalidades
 *   < 30 000 records → FILL: sync 90 days for remaining modalidades (picks up
 *                      where bootstrap left off by priority order)
 *   ≥ 30 000 records → INCREMENTAL: sync last 2 days for all modalidades
 *
 * This means the cache populates itself over 1-2 days with no manual
 * intervention — each cron run advances the fill until the full 90-day
 * window is covered.
 */

const HARD_BUDGET_MS  = 55_000;
const INCREMENTAL_DAYS = 2;
const BOOTSTRAP_DAYS   = 90;

// Priority-1 only (highest volume) — used for the very first bootstrap pass
const PRIORITY1 = ALL_MODALIDADES.filter(m => m.priority === 1);

export async function GET(req: NextRequest) {
  // Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization') || '';
  const provided   = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expected   = process.env.CRON_SECRET || '';
  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const startedAt  = Date.now();
  const deadlineAt = startedAt + HARD_BUDGET_MS;

  // ── Decide mode based on cache volume ──────────────────────────────────────
  let cacheCount = 0;
  try {
    const r = await sql`SELECT COUNT(*)::int AS c FROM licitacoes_pncp_cache`;
    cacheCount = Number(r[0]?.c || 0);
  } catch { /* proceed with 0 */ }

  let mode: 'bootstrap' | 'fill' | 'incremental';
  let targets: typeof ALL_MODALIDADES;
  let days: number;
  let incremental: boolean;

  if (cacheCount < 5_000) {
    // First pass: get the most important modalidades (highest volume) 90 days back
    mode        = 'bootstrap';
    targets     = PRIORITY1;
    days        = BOOTSTRAP_DAYS;
    incremental = false;
  } else if (cacheCount < 400_000) {
    // Fill pass: keep filling 90 days for all modalidades until the cache is
    // substantially complete (~400k covers most of the 90-day window for all Brazil)
    mode        = 'fill';
    targets     = ALL_MODALIDADES;
    days        = BOOTSTRAP_DAYS;
    incremental = false;
  } else {
    // Steady-state: daily incremental for all modalidades
    mode        = 'incremental';
    targets     = ALL_MODALIDADES;
    days        = INCREMENTAL_DAYS;
    incremental = true;
  }

  const logId = await logSyncStart(null, mode);

  const perModalidade: any[] = [];
  let totalInserted = 0, totalUpdated = 0, totalErrors = 0;

  for (const m of targets) {
    if (Date.now() > deadlineAt) {
      perModalidade.push({ modalidade: m.mod, skipped: 'deadline' });
      continue;
    }
    try {
      const result = await syncModalidade({
        modalidade:  m.mod,
        days,
        incremental,
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
