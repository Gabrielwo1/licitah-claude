import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic     = 'force-dynamic';

/**
 * GET /api/cron/enrich-catmat
 * Cron wrapper — delegates to /api/internal/enrich-catmat.
 * Runs 3× per day to backfill CATMAT codes from the PNCP items API.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const provided   = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expected   = process.env.CRON_SECRET || '';
  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host  = req.headers.get('host') || 'localhost:3000';
  const self  = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || `${proto}://${host}`;

  const res = await fetch(`${self}/api/internal/enrich-catmat`, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-internal-secret': expected,
    },
    body: JSON.stringify({ batchSize: 200 }),
  }).catch(e => ({ ok: false, error: String(e?.message || e) }));

  if ('error' in res) {
    return NextResponse.json({ ok: false, error: (res as any).error }, { status: 500 });
  }

  const json = await (res as Response).json().catch(() => ({}));
  return NextResponse.json({ ok: true, ...json });
}
