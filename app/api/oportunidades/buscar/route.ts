import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

// ── Parse helpers ─────────────────────────────────────────────────────────────

/** Handles: plain string, JSON array ["kw1","kw2"], double-encoded JSON */
function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trim = raw.trim();
  try {
    const p1 = JSON.parse(trim);
    if (Array.isArray(p1)) return p1.map(String).filter(Boolean);
    if (typeof p1 === 'string') {
      // double-encoded: parse once more
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

/** Handles: "", "SP", "SP:Campinas", legacy JSON ["SP","RJ",...] */
function parseRegion(raw: string): { uf: string; cidade: string } {
  if (!raw) return { uf: '', cidade: '' };
  const trim = raw.trim();
  if (trim.startsWith('[')) {
    try {
      const arr = JSON.parse(trim);
      if (Array.isArray(arr) && arr.length > 0) return { uf: String(arr[0]), cidade: '' };
    } catch {}
    return { uf: '', cidade: '' };
  }
  if (trim.includes(':')) {
    const idx = trim.indexOf(':');
    return { uf: trim.slice(0, idx), cidade: trim.slice(idx + 1) };
  }
  return { uf: trim, cidade: '' };
}

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const MODALIDADES = ['7', '8', '14', '5', '6', '15', '11'];

function threeMonthsAgo(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0].replace(/-/g, '');
}
function todayStr(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

async function fetchMod(mod: string, busca: string, uf: string, codigoIbge: string): Promise<any[]> {
  const params = new URLSearchParams({
    dataInicial: threeMonthsAgo(), dataFinal: todayStr(),
    pagina: '1', tamanhoPagina: '50',
    codigoModalidadeContratacao: mod,
  });
  if (uf) params.set('uf', uf);
  if (codigoIbge) params.set('codigoMunicipioIbge', codigoIbge);
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${PNCP_API}?${params.toString()}`, {
      headers: { Accept: 'application/json' }, signal: controller.signal, cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  // Load user's oportunidade config
  const rows = await sql`
    SELECT * FROM licitacoes_oportunidades
    WHERE licitacoes_oportunidade_autor = ${userId}
    ORDER BY licitacoes_oportunidade_id DESC
    LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ keywords: [], data: [] });

  const row = rows[0];
  const regioes = row.licitacoes_oportunidade_regioes || '';

  // Robust keyword parsing — handles plain string, JSON array, and double-encoded JSON
  const keywords = parseKeywords(row.licitacoes_oportunidade_tagmento);
  if (keywords.length === 0) return NextResponse.json({ keywords: [], data: [] });

  // Robust region parsing — handles "SP", "SP:City", and legacy ["SP","RJ",...] arrays
  const { uf, cidade } = parseRegion(regioes);

  // Search PNCP for all modalidades
  const results = await Promise.allSettled(
    MODALIDADES.map(m => fetchMod(m, '', uf, ''))
  );
  let data: any[] = [];
  results.forEach(r => { if (r.status === 'fulfilled') data.push(...r.value); });

  // Deduplicate
  const seen = new Set<string>();
  data = data.filter(l => {
    if (seen.has(l.numeroControlePNCP)) return false;
    seen.add(l.numeroControlePNCP); return true;
  });

  // Filter by keywords (any keyword in objetoCompra)
  const kws = keywords.map(k => k.toLowerCase());
  data = data.filter(l => {
    const obj = (l.objetoCompra || '').toLowerCase();
    return kws.some(kw => obj.includes(kw));
  });

  // Filter by city if provided
  if (cidade) {
    const c = cidade.toLowerCase();
    data = data.filter(l => l.unidadeOrgao?.municipioNome?.toLowerCase().includes(c));
  }

  return NextResponse.json({ keywords, uf, cidade, data });
}
