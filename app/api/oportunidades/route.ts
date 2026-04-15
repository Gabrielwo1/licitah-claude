import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createHash } from 'crypto';

/** Handles: plain string, JSON array, double-encoded JSON → returns string[] */
function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trim = raw.trim();
  try {
    const p1 = JSON.parse(trim);
    if (Array.isArray(p1)) return p1.map(String).filter(Boolean);
    if (typeof p1 === 'string') {
      try {
        const p2 = JSON.parse(p1);
        if (Array.isArray(p2)) return p2.map(String).filter(Boolean);
        return [p2].filter(Boolean);
      } catch { return [p1].filter(Boolean); }
    }
    return [];
  } catch {
    return trim.split(',').map(s => s.trim()).filter(Boolean);
  }
}

/** Handles "SP", "SP:City", legacy ["SP","RJ",...] → "SP" or "SP:City" */
function normalizeRegion(raw: string): string {
  if (!raw) return '';
  const trim = raw.trim();
  if (trim.startsWith('[')) {
    try {
      const arr = JSON.parse(trim);
      if (Array.isArray(arr) && arr.length > 0) return String(arr[0]);
    } catch {}
    return '';
  }
  return trim;
}

function randomHash(): string {
  return createHash('md5').update(Math.random().toString()).digest('hex').slice(0, 16);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const empresaId = (session.user as any).empresaId || 0;
  const userId = (session.user as any).id;

  const rows = await sql`
    SELECT * FROM licitacoes_oportunidades
    WHERE licitacoes_oportunidade_autor = ${userId}
    ORDER BY licitacoes_oportunidade_id DESC
    LIMIT 1
  `;

  if (rows.length === 0) return NextResponse.json([]);

  const row = rows[0];
  // Return with normalized fields so the modal always gets clean data
  const keywords = parseKeywords(row.licitacoes_oportunidade_tagmento);
  const regioes = normalizeRegion(row.licitacoes_oportunidade_regioes || '');
  return NextResponse.json([{
    ...row,
    licitacoes_oportunidade_tagmento: JSON.stringify(keywords),
    licitacoes_oportunidade_regioes: regioes,
  }]);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const empresaId = (session.user as any).empresaId || 0;
  const userId = (session.user as any).id;
  const { palavras, regioes } = await req.json();

  if (!palavras) return NextResponse.json({ error: 'Palavras-chave obrigatórias' }, { status: 400 });

  // Check if user already has a config → UPDATE; otherwise INSERT
  const existing = await sql`
    SELECT licitacoes_oportunidade_id FROM licitacoes_oportunidades
    WHERE licitacoes_oportunidade_autor = ${userId}
    LIMIT 1
  `;

  let result;
  if (existing.length > 0) {
    result = await sql`
      UPDATE licitacoes_oportunidades
      SET licitacoes_oportunidade_regioes = ${regioes || ''},
          licitacoes_oportunidade_tagmento = ${palavras},
          licitacoes_oportunidade_empresa  = ${empresaId}
      WHERE licitacoes_oportunidade_autor = ${userId}
      RETURNING *
    `;
  } else {
    const hash = randomHash();
    result = await sql`
      INSERT INTO licitacoes_oportunidades (
        licitacoes_oportunidade_empresa, licitacoes_oportunidade_regioes,
        licitacoes_oportunidade_tagmento, licitacoes_oportunidade_hash, licitacoes_oportunidade_autor
      )
      VALUES (${empresaId}, ${regioes || ''}, ${palavras}, ${hash}, ${userId})
      RETURNING *
    `;
  }

  return NextResponse.json(result[0], { status: 201 });
}
