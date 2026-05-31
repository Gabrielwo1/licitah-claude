import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/migrate
 * Applies all pending DDL migrations. Admin-only.
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const funcao  = (session?.user as any)?.funcao;
  if (funcao !== 0 && funcao !== 1) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const results: { name: string; ok: boolean; error?: string }[] = [];

  async function run(name: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (e: any) {
      results.push({ name, ok: false, error: String(e?.message || e) });
    }
  }

  await run('add_usuario_plano', () => sql`
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario_plano VARCHAR(20) NOT NULL DEFAULT 'free'
  `);

  await run('add_catmat_codes', () => sql`
    ALTER TABLE licitacoes_pncp_cache ADD COLUMN IF NOT EXISTS catmat_codes TEXT[]
  `);

  await run('idx_catmat_gin', () => sql`
    CREATE INDEX IF NOT EXISTS idx_licitacoes_catmat
    ON licitacoes_pncp_cache USING GIN (catmat_codes)
    WHERE catmat_codes IS NOT NULL
  `);

  const allOk = results.every(r => r.ok);
  return NextResponse.json({ ok: allOk, results });
}
