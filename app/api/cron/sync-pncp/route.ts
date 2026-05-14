import { NextRequest, NextResponse } from 'next/server';
import {
  ALL_MODALIDADES, syncModalidade, logSyncStart, logSyncEnd,
} from '@/lib/pncp-sync';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Daily incremental sync triggered by Vercel Cron.
 *
 * Strategy:
 *  - Use the /atualizacao endpoint to grab records that changed in the last
 *    36 hours (overlap protects against missed records if a previous cron
 *    run failed).
 *  - Loop through all modalidades sequentially, with a hard wall-clock
 *    deadline a few seconds before Vercel kills us.
 *  - Each modalidade is logged to licitacoes_pncp_sync_log for debugging.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. We accept
 * that OR a manual call with the same header so we can trigger it by hand.
 */

const HARD_BUDGET_MS = 55_000;       // leave 5s headroom before maxDuration=60
const INCREMENTAL_DAYS = 2;          // overlap window for daily diffs

export async function GET(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('authorization') || '';
  const provided   = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expected   = process.env.CRON_SECRET || '';
  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const deadlineAt = startedAt + HARD_BUDGET_MS;

  const logId = await logSyncStart(null, 'incremental-daily');

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
        concurrency: 6,
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
    durationMs: Date.now() - startedAt,
    totalInserted, totalUpdated, totalErrors,
    perModalidade,
  });
}
