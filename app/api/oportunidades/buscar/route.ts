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

// ── PNCP fetch ────────────────────────────────────────────────────────────────

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const PAGE_SIZE = 50;   // PNCP max
const MAX_PAGES = 5;    // max pages per modalidade (= 250 records each)

// Modalidades ordered by volume (higher-volume first for better coverage)
const MODALIDADES = [
  { mod: '7',  label: 'Pregão' },
  { mod: '8',  label: 'Dispensa' },
  { mod: '14', label: 'Diálogo Competitivo' },
  { mod: '5',  label: 'Concorrência' },
  { mod: '6',  label: 'Chamamento Público' },
  { mod: '15', label: 'Leilão' },
  { mod: '11', label: 'Credenciamento' },
];

function threeMonthsAgo(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0].replace(/-/g, '');
}
function todayStr(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

async function fetchPage(mod: string, page: number, uf: string): Promise<{ data: any[]; totalPages: number }> {
  const params = new URLSearchParams({
    dataInicial: threeMonthsAgo(),
    dataFinal: todayStr(),
    pagina: String(page),
    tamanhoPagina: String(PAGE_SIZE),
    codigoModalidadeContratacao: mod,
  });
  if (uf) params.set('uf', uf);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${PNCP_API}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { data: [], totalPages: 0 };
    const json = await res.json();
    const totalPages = json.totalPaginas ?? Math.ceil((json.totalRegistros ?? 0) / PAGE_SIZE);
    return { data: json.data || [], totalPages };
  } catch {
    return { data: [], totalPages: 0 };
  }
}

async function fetchAllPages(mod: string, uf: string): Promise<any[]> {
  // Fetch page 1 first to discover totalPages
  const { data: page1, totalPages } = await fetchPage(mod, 1, uf);
  if (page1.length === 0) return [];

  const pagesToFetch = Math.min(totalPages, MAX_PAGES);
  if (pagesToFetch <= 1) return page1;

  // Fetch remaining pages in parallel
  const remaining = await Promise.allSettled(
    Array.from({ length: pagesToFetch - 1 }, (_, i) => fetchPage(mod, i + 2, uf))
  );

  const all = [...page1];
  remaining.forEach(r => {
    if (r.status === 'fulfilled') all.push(...r.value.data);
  });
  return all;
}

// ── Route handler ─────────────────────────────────────────────────────────────

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

  const keywords = parseKeywords(row.licitacoes_oportunidade_tagmento);
  if (keywords.length === 0) return NextResponse.json({ keywords: [], data: [] });

  const { uf, cidade } = parseRegion(regioes);

  // Fetch all modalidades — each fetches up to MAX_PAGES pages in parallel internally
  const modResults = await Promise.allSettled(
    MODALIDADES.map(({ mod }) => fetchAllPages(mod, uf))
  );

  let data: any[] = [];
  modResults.forEach(r => { if (r.status === 'fulfilled') data.push(...r.value); });

  // Deduplicate by numeroControlePNCP
  const seen = new Set<string>();
  data = data.filter(l => {
    if (seen.has(l.numeroControlePNCP)) return false;
    seen.add(l.numeroControlePNCP); return true;
  });

  // Filter by keywords in objetoCompra (case-insensitive, any keyword matches)
  const kws = keywords.map(k => k.toLowerCase().trim());
  data = data.filter(l => {
    const obj = (l.objetoCompra || '').toLowerCase();
    return kws.some(kw => obj.includes(kw));
  });

  // Filter by city if provided
  if (cidade) {
    const c = cidade.toLowerCase();
    data = data.filter(l => l.unidadeOrgao?.municipioNome?.toLowerCase().includes(c));
  }

  // Sort by publication date descending
  data.sort((a, b) => {
    const da = new Date(a.dataPublicacaoPncp || 0).getTime();
    const db = new Date(b.dataPublicacaoPncp || 0).getTime();
    return db - da;
  });

  return NextResponse.json({ keywords, uf, cidade, data });
}
