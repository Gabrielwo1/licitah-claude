import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { streamText, convertToModelMessages } from 'ai';
import sql from '@/lib/db';
import {
  AI_MODEL,
  PERGUNTAR_SYSTEM_PROMPT, buildLicitacaoContext,
} from '@/lib/ai';

export const maxDuration = 60;

/**
 * POST — streaming chat about a specific licitação.
 *
 * Body: {
 *   id: string,            // numeroControlePNCP (used for chat history scoping)
 *   licitacao: any,        // PNCP detail object
 *   items: any[],          // PNCP items
 *   messages: UIMessage[]  // chat history (Vercel AI SDK format)
 * }
 *
 * Persists the LAST user message + assistant response to licitacoes_ai_chat.
 *
 * GET — returns the chat history for the current user + licitação id.
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const rows = await sql`
    SELECT chat_id, chat_role, chat_conteudo, chat_criado_em
    FROM licitacoes_ai_chat
    WHERE chat_licitacao = ${id} AND chat_autor = ${userId}
    ORDER BY chat_criado_em ASC
    LIMIT 200
  `;

  return NextResponse.json({
    messages: rows.map((r: any) => ({
      id:        String(r.chat_id),
      role:      r.chat_role,
      content:   r.chat_conteudo,
      createdAt: r.chat_criado_em,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada no servidor' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.id || !Array.isArray(body?.messages)) {
    return NextResponse.json({ error: 'id e messages obrigatórios' }, { status: 400 });
  }

  const id        = body.id as string;
  const messages  = body.messages as any[];
  const licitacao = body.licitacao;
  const items     = body.items || [];

  if (messages.length === 0) {
    return NextResponse.json({ error: 'mensagens vazias' }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find(m => m.role === 'user');

  const context = licitacao ? buildLicitacaoContext(licitacao, items) : '';

  // Build full system prompt with context
  const fullSystem = `${PERGUNTAR_SYSTEM_PROMPT}\n\n=== CONTEXTO DA LICITAÇÃO ===\n${context}`;

  // Extract textual content from a UIMessage (which may have parts) or core msg
  function extractText(m: any): string {
    if (typeof m?.content === 'string') return m.content;
    if (Array.isArray(m?.parts)) {
      return m.parts.filter((p: any) => p?.type === 'text').map((p: any) => p.text).join('\n');
    }
    if (Array.isArray(m?.content)) {
      return m.content.filter((p: any) => p?.type === 'text').map((p: any) => p.text).join('\n');
    }
    return '';
  }

  // Persist the latest user message before generation
  const userText = lastUser ? extractText(lastUser) : '';
  if (userText) {
    try {
      await sql`
        INSERT INTO licitacoes_ai_chat (chat_licitacao, chat_autor, chat_role, chat_conteudo)
        VALUES (${id}, ${userId}, 'user', ${userText})
      `;
    } catch (e) {
      console.error('[ai/perguntar] failed persisting user msg:', e);
    }
  }

  const modelMessages = await convertToModelMessages(messages as any);

  const result = streamText({
    model: AI_MODEL,
    system: fullSystem,
    messages: modelMessages,
    temperature: 0.4,
    onFinish: async ({ text }) => {
      try {
        await sql`
          INSERT INTO licitacoes_ai_chat (chat_licitacao, chat_autor, chat_role, chat_conteudo)
          VALUES (${id}, ${userId}, 'assistant', ${text})
        `;
      } catch (e) {
        console.error('[ai/perguntar] failed persisting assistant msg:', e);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

/** DELETE — clear chat history for current user + licitação */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  await sql`
    DELETE FROM licitacoes_ai_chat
    WHERE chat_licitacao = ${id} AND chat_autor = ${userId}
  `;

  return NextResponse.json({ success: true });
}
