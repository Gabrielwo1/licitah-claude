import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { encrypt, decrypt } from '@/lib/robo-encrypt';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const rows = await sql`SELECT * FROM robo_configuracoes WHERE usuario_id = ${userId} LIMIT 1`;
  if (rows.length === 0) return NextResponse.json({ data: null });

  const row = rows[0];
  return NextResponse.json({
    data: {
      ...row,
      cgov_senha_enc: undefined,       // never expose
      cgov_senha_set: !!row.cgov_senha_enc,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const { cgov_cpf, cgov_senha, cgov_cnpj, estrategia, decremento_valor, decremento_pct } = await req.json();

  const existing = await sql`SELECT id, cgov_senha_enc FROM robo_configuracoes WHERE usuario_id = ${userId} LIMIT 1`;

  const senhaEnc = cgov_senha
    ? encrypt(cgov_senha)
    : (existing[0]?.cgov_senha_enc ?? null);

  if (existing.length > 0) {
    await sql`
      UPDATE robo_configuracoes SET
        cgov_cpf         = ${cgov_cpf || null},
        cgov_senha_enc   = ${senhaEnc},
        cgov_cnpj        = ${cgov_cnpj || null},
        estrategia       = ${estrategia || 'moderada'},
        decremento_valor = ${decremento_valor || null},
        decremento_pct   = ${decremento_pct || null},
        atualizado_em    = NOW()
      WHERE usuario_id = ${userId}
    `;
  } else {
    await sql`
      INSERT INTO robo_configuracoes (usuario_id, cgov_cpf, cgov_senha_enc, cgov_cnpj, estrategia, decremento_valor, decremento_pct)
      VALUES (${userId}, ${cgov_cpf || null}, ${senhaEnc}, ${cgov_cnpj || null}, ${estrategia || 'moderada'}, ${decremento_valor || null}, ${decremento_pct || null})
    `;
  }

  return NextResponse.json({ success: true });
}
