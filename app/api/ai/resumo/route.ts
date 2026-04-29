import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateText } from 'ai';
import sql from '@/lib/db';
import {
  AI_MODEL, AI_MODEL_NAME,
  RESUMO_SYSTEM_PROMPT, buildLicitacaoContext,
} from '@/lib/ai';

export const maxDuration = 60;

/**
 * GET — return cached resumo if exists.
 * POST — generate (or regenerate with ?force=1) and cache.
 *
 * Both expect ?id=<numeroControlePNCP>
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const rows = await sql`
    SELECT ai_conteudo, ai_modelo, ai_criado_em
    FROM licitacoes_ai
    WHERE ai_licitacao = ${id} AND ai_tipo = 'resumo'
    LIMIT 1
  `;

  if (rows.length === 0) return NextResponse.json({ cached: false });

  return NextResponse.json({
    cached: true,
    conteudo: rows[0].ai_conteudo,
    modelo:   rows[0].ai_modelo,
    criadoEm: rows[0].ai_criado_em,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const id    = req.nextUrl.searchParams.get('id');
  const force = req.nextUrl.searchParams.get('force') === '1';
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  // Use cache unless force
  if (!force) {
    const cached = await sql`
      SELECT ai_conteudo, ai_modelo, ai_criado_em
      FROM licitacoes_ai
      WHERE ai_licitacao = ${id} AND ai_tipo = 'resumo'
      LIMIT 1
    `;
    if (cached.length > 0) {
      return NextResponse.json({
        cached: true,
        conteudo: cached[0].ai_conteudo,
        modelo:   cached[0].ai_modelo,
        criadoEm: cached[0].ai_criado_em,
      });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body?.licitacao) {
    return NextResponse.json({ error: 'licitacao obrigatória no body' }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada no servidor' }, { status: 500 });
  }

  const context = buildLicitacaoContext(body.licitacao, body.items || []);

  try {
    const { text } = await generateText({
      model: AI_MODEL,
      system: RESUMO_SYSTEM_PROMPT,
      prompt: `Gere o resumo executivo para a licitação abaixo:\n\n${context}`,
      temperature: 0.3,
    });

    // Upsert cache
    await sql`
      INSERT INTO licitacoes_ai (ai_licitacao, ai_tipo, ai_conteudo, ai_modelo, ai_autor)
      VALUES (${id}, 'resumo', ${text}, ${AI_MODEL_NAME}, ${userId})
      ON CONFLICT (ai_licitacao, ai_tipo)
      DO UPDATE SET
        ai_conteudo  = EXCLUDED.ai_conteudo,
        ai_modelo    = EXCLUDED.ai_modelo,
        ai_autor     = EXCLUDED.ai_autor,
        ai_criado_em = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      cached: false,
      conteudo: text,
      modelo:   AI_MODEL_NAME,
      criadoEm: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[ai/resumo] error:', err?.message || err);
    return NextResponse.json(
      { error: 'Erro ao gerar resumo. Tente novamente em instantes.' },
      { status: 500 }
    );
  }
}
