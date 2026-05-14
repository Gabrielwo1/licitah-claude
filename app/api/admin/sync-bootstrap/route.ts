import { NextRequest, NextResponse } from 'next/server';
import {
  ALL_MODALIDADES, syncModalidade, logSyncStart, logSyncEnd,
} from '@/lib/pncp-sync';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Manual bootstrap endpoint — call multiple times to populate the cache.
 *
 * Designed to be safely re-callable: it's idempotent (UPSERT) and each call
 * advances by one modalidade so you can chain calls from a shell script.
 *
 * Query params:
 *   - mod=<int>            specific modalidade (e.g. 8 = Dispensa)
 *   - days=<int>           lookback window in days (default 90)
 *   - maxPages=<int>       safety cap on pages this run (default no cap → walks all)
 *   - concurrency=<int>    parallel page fetches (default 6)
 *
 * Auth: requires the same CRON_SECRET as the cron endpoint via Bearer token.
 */

const HARD_BUDGET_MS = 55_000;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const provided   = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expected   = process.env.CRON_SECRET || '';
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET não configurado no servidor.' },
      { status: 500 }
    );
  }
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const modParam   = sp.get('mod');
  const days       = Number(sp.get('days')) || 90;
  const maxPages   = sp.get('maxPages') ? Number(sp.get('maxPages')) : undefined;
  const concurrency = Number(sp.get('concurrency')) || 6;

  const startedAt = Date.now();
  const deadlineAt = startedAt + HARD_BUDGET_MS;

  // If a specific modalidade was given, sync just that one (longer, deeper).
  // Otherwise iterate all but stop when the deadline hits.
  const targets = modParam
    ? [{ mod: Number(modParam), label: `mod ${modParam}`, priority: 1 }]
    : ALL_MODALIDADES;

  const logId = await logSyncStart(modParam ? Number(modParam) : null, 'bootstrap');

  const results: any[] = [];
  let totalInserted = 0, totalUpdated = 0, totalErrors = 0;

  for (const m of targets) {
    if (Date.now() > deadlineAt) {
      results.push({ modalidade: m.mod, skipped: 'deadline' });
      continue;
    }
    try {
      const result = await syncModalidade({
        modalidade:  m.mod,
        days,
        incremental: false,
        deadlineAt,
        concurrency,
        maxPages,
      });
      results.push(result);
      totalInserted += result.inserted;
      totalUpdated  += result.updated;
      totalErrors   += result.errors;
    } catch (e: any) {
      totalErrors++;
      results.push({ modalidade: m.mod, error: String(e?.message || e) });
    }
  }

  const status = totalErrors > 0 ? 'partial' : 'ok';
  await logSyncEnd(logId, {
    inserted: totalInserted, updated: totalUpdated, errors: totalErrors,
  }, status);

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    days,
    totalInserted, totalUpdated, totalErrors,
    results,
  });
}
