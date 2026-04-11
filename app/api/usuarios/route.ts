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
  const { nome, email, senha, telefone, cpf, empresaNome, empresaCnpj } = await req.json();

  if (!nome || !email || !senha) {
    return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
  }

  // Check if email exists
  const existing = await sql`SELECT usuario_id FROM usuarios WHERE usuario_email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
  }

  const hashedPassword = md5(senha);
  const userHash = randomHash();

  // Create user
  const userResult = await sql`
    INSERT INTO usuarios (usuario_nome, usuario_email, usuario_senha, usuario_funcao, usuario_ativo, usuario_hash, usuario_telefone, usuario_cpf)
    VALUES (${nome}, ${email}, ${hashedPassword}, 2, 1, ${userHash}, ${telefone || null}, ${cpf || null})
    RETURNING usuario_id
  `;

  const userId = userResult[0].usuario_id;

  // Create company if provided
  if (empresaNome) {
    const empresaHash = randomHash();
    const empresaResult = await sql`
      INSERT INTO empresas (empresa_nome, empresa_cnpj, empresa_hash)
      VALUES (${empresaNome}, ${empresaCnpj || ''}, ${empresaHash})
      RETURNING empresa_id
    `;

    await sql`
      INSERT INTO empresas_associacao (ea_empresa, ea_usuario, ea_funcao)
      VALUES (${empresaResult[0].empresa_id}, ${userId}, 0)
    `;
  }

  return NextResponse.json({ success: true, userId }, { status: 201 });
}
