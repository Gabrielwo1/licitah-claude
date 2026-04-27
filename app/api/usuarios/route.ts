import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import sql from '@/lib/db';

function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

function randomHash(): string {
  return createHash('md5').update(Math.random().toString()).digest('hex').slice(0, 16);
}

/** Generate a unique username from the user's name, e.g. "João Silva" → "joaosilva" + suffix */
function generateUsername(nome: string, email: string): string {
  const fromName = nome
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '')                        // only alphanumeric
    .slice(0, 12);

  const fromEmail = email.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);

  const base = fromName || fromEmail || 'usuario';
  const suffix = Math.random().toString(36).slice(2, 6); // 4 random chars
  return `${base}${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
    }

    const { nome, email, senha, telefone, cpf, empresaNome, empresaCnpj } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios.' }, { status: 400 });
    }

    // Check duplicate email
    const existing = await sql`SELECT usuario_id FROM usuarios WHERE usuario_email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Este email já está cadastrado. Faça login ou use outro email.' }, { status: 409 });
    }

    const hashedPassword = md5(senha);
    const userHash     = randomHash();
    const usuarioUser  = generateUsername(nome, email);
    const telefoneVal  = (telefone && telefone.trim()) ? telefone.trim() : '';

    // Insert user — usuario_id now uses sequence (nextval)
    const userResult = await sql`
      INSERT INTO usuarios (
        usuario_display,
        usuario_email,
        usuario_senha,
        usuario_funcao,
        usuario_subfuncao,
        usuario_ativo,
        usuario_hash,
        usuario_telefone,
        usuario_cpf,
        usuario_user
      )
      VALUES (
        ${nome},
        ${email},
        ${hashedPassword},
        2,
        2,
        1,
        ${userHash},
        ${telefoneVal},
        ${cpf?.trim() || null},
        ${usuarioUser}
      )
      RETURNING usuario_id
    `;

    const userId = userResult[0].usuario_id;

    // Create company if provided (optional — doesn't block user creation on failure)
    if (empresaNome && empresaNome.trim()) {
      try {
        const empresaHash = randomHash();
        const empresaResult = await sql`
          INSERT INTO empresas (empresa_nome, empresa_cnpj, empresa_hash, empresa_autor)
          VALUES (${empresaNome.trim()}, ${empresaCnpj?.trim() || ''}, ${empresaHash}, ${userId})
          RETURNING empresa_id
        `;
        await sql`
          INSERT INTO empresas_associacao (ea_empresa, ea_usuario, ea_funcao)
          VALUES (${empresaResult[0].empresa_id}, ${userId}, 0)
        `;
      } catch (empresaErr) {
        console.error('[cadastro] Empresa insert failed (user was created):', empresaErr);
      }
    }

    return NextResponse.json({ success: true, userId }, { status: 201 });

  } catch (err: any) {
    console.error('[cadastro] Error:', err?.message || err);
    return NextResponse.json(
      { error: 'Erro interno ao criar conta. Tente novamente em instantes.' },
      { status: 500 }
    );
  }
}
