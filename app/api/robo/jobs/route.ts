import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { decrypt } from '@/lib/robo-encrypt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/robo/jobs
 * Worker polls this endpoint to claim pending sessions.
 * Returns session + decrypted credentials for the user.
 */
export async function GET(req: NextRequest) {
  const workerSecret = req.headers.get('x-worker-secret');
  const expected = process.env.WORKER_SECRET || '';
  if (!expected || workerSecret !== expected) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Get pending sessions that have no worker assigned (or heartbeat stale > 2 min)
  const jobs = await sql`
    SELECT s.*,
           rc.cgov_cpf,
           rc.cgov_senha_enc,
           rc.cgov_cnpj
    FROM robo_sessoes s
    JOIN robo_configuracoes rc ON rc.usuario_id = s.usuario_id
    WHERE s.status = 'aguardando'
      AND (s.worker_id IS NULL OR s.ultimo_heartbeat < NOW() - INTERVAL '2 minutes')
    ORDER BY s.iniciado_em ASC
    LIMIT 5
  `;

  const result = jobs.map(j => ({
    ...j,
    cgov_senha: j.cgov_senha_enc ? decrypt(j.cgov_senha_enc) : '',
    cgov_senha_enc: undefined,
  }));

  return NextResponse.json({ jobs: result });
}
