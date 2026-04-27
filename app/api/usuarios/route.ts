import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import sql from '@/lib/db';

function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

function randomHash(): string {
  return createHash('md5').update(Math.random().toString()).digest('hex').slice(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
    }

    const { nome, email, senha, telefone, cpf, empresaNome, empresaCnpj } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }

    // Check existing email
    const existing = await sql`SELECT usuario_id FROM usuarios WHERE usuario_email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Este email já está cadastrado. Faça login ou use outro email.' }, { status: 409 });
    }

    const hashedPassword = md5(senha);
    const userHash = randomHash();

    // Create user
    const userResult = await sql`
      INSERT INTO usuarios (
        usuario_display, usuario_email, usuario_senha,
        usuario_funcao, usuario_ativo, usuario_hash,
        usuario_telefone, usuario_cpf
      )
      VALUES (
        ${nome}, ${email}, ${hashedPassword},
        2, 1, ${userHash},
        ${telefone || null}, ${cpf || null}
      )
      RETURNING usuario_id
    `;

    const userId = userResult[0].usuario_id;

    // Create company if provided (optional — don't fail user creation if this fails)
    if (empresaNome && empresaNome.trim()) {
      try {
        const empresaHash = randomHash();
        const empresaResult = await sql`
          INSERT INTO empresas (empresa_nome, empresa_cnpj, empresa_hash)
          VALUES (${empresaNome.trim()}, ${empresaCnpj?.trim() || ''}, ${empresaHash})
          RETURNING empresa_id
        `;
        await sql`
          INSERT INTO empresas_associacao (ea_empresa, ea_usuario, ea_funcao)
          VALUES (${empresaResult[0].empresa_id}, ${userId}, 0)
        `;
      } catch (empresaErr) {
        // Company creation failed — log but don't rollback user creation
        console.error('[cadastro] Empresa insert error:', empresaErr);
      }
    }

    return NextResponse.json({ success: true, userId }, { status: 201 });

  } catch (err: any) {
    console.error('[cadastro] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erro interno ao criar conta. Tente novamente em instantes.' },
      { status: 500 }
    );
  }
}
