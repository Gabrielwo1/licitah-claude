import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/admin/assinaturas — lista todos os usuários e seus planos */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const funcao  = (session?.user as any)?.funcao;
  if (funcao !== 0 && funcao !== 1) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const rows = await sql`
    SELECT usuario_id, usuario_display, usuario_email,
           COALESCE(usuario_plano, 'free') AS usuario_plano,
           usuario_ativo
    FROM usuarios
    ORDER BY usuario_id DESC
  `.catch(() => []);

  return NextResponse.json(rows);
}

/**
 * POST /api/admin/assinaturas
 * Body: { userId, plano: 'free' | 'expert' }
 * Define o plano do usuário manualmente (até integração de pagamento).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const funcao  = (session?.user as any)?.funcao;
  if (funcao !== 0 && funcao !== 1) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { userId, plano } = await req.json();

  if (!userId || !['free', 'expert'].includes(plano)) {
    return NextResponse.json({ error: 'userId e plano (free|expert) são obrigatórios' }, { status: 400 });
  }

  await sql`
    UPDATE usuarios SET usuario_plano = ${plano} WHERE usuario_id = ${userId}
  `;

  return NextResponse.json({ ok: true, userId, plano });
}
