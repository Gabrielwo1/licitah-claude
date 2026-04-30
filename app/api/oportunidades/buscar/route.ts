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
const MAX_PAGES = 8;    // max pages per modalidade (= 400 records each)

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

/** Configurable date window. 30 days is enough for daily users; older
 * editais are usually closed already. Smaller window = far fewer pages
 * from PNCP, which means we can fit the latest records in MAX_PAGES. */
const DATE_WINDOW_DAYS = 30;

function dateWindowStart(): string {
  const d = new Date(); d.setDate(d.getDate() - DATE_WINDOW_DAYS);
  return d.toISOString().split('T')[0].replace(/-/g, '');
}
function todayStr(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

async function fetchPage(mod: string, page: number, uf: string): Promise<{ data: any[]; totalPages: number }> {
  const params = new URLSearchParams({
    dataInicial: dateWindowStart(),
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

/**
 * PNCP returns results in ASCENDING publication-date order by default.
 * That means page 1 = OLDEST, last page = NEWEST. If we naively fetched
 * pages 1..N we'd be loading the oldest records and missing today's
 * publications when totalPages > MAX_PAGES.
 *
 * Strategy: fetch the LAST MAX_PAGES (most recent), plus page 1 as a
 * sanity check (handles the edge case where the API returns desc order
 * and dedup takes care of any overlap).
 */
async function fetchAllPages(mod: string, uf: string): Promise<any[]> {
  // Probe page 1 to learn totalPages
  const { data: page1, totalPages } = await fetchPage(mod, 1, uf);
  if (page1.length === 0) return [];
  if (totalPages <= 1) return page1;

  // Build the page list: last MAX_PAGES pages (newest), descending
  const pagesToFetch: number[] = [];
  const start = Math.max(2, totalPages - MAX_PAGES + 1);
  for (let p = totalPages; p >= start; p--) pagesToFetch.push(p);

  // Always include page 1 too — guards against PNCP order changes
  // (cheap because page 1 was already fetched, we just keep it)
  const remaining = await Promise.allSettled(
    pagesToFetch.map(p => fetchPage(mod, p, uf))
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

  return NextResponse.json({
    keywords,
    uf,
    cidade,
    data,
    fetchedAt: new Date().toISOString(),
    windowDays: DATE_WINDOW_DAYS,
  });
}
