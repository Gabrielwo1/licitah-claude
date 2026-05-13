/**
 * Shared oportunidades fetch logic. Used by:
 *  - /api/oportunidades/buscar     (full search, fresh)
 *  - app/dashboard/page.tsx        (top-N preview, cached)
 *
 * IMPORTANT: PNCP `/contratacoes/publicacao` returns ASCENDING by publication
 * date. Page 1 = OLDEST. To get the newest records we walk the LAST pages.
 */

// ── Parse helpers (kept here so all callers normalize the same way) ─────────

/** Handles: plain string, JSON array ["kw1","kw2"], double-encoded JSON */
export function parseKeywords(raw: string | null | undefined): string[] {
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
export function parseRegion(raw: string): { uf: string; cidade: string } {
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

// ── PNCP constants ──────────────────────────────────────────────────────────

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const PAGE_SIZE = 50;          // PNCP max
export const MAX_PAGES = 20;   // up to 1000 records per modalidade
export const DATE_WINDOW_DAYS = 90;

/** All 7 modalidades, ordered by typical volume so high-yield ones win in race. */
export const MODALIDADES = [
  { mod: '7',  label: 'Pregão' },
  { mod: '8',  label: 'Dispensa' },
  { mod: '14', label: 'Diálogo Competitivo' },
  { mod: '5',  label: 'Concorrência' },
  { mod: '6',  label: 'Chamamento Público' },
  { mod: '15', label: 'Leilão' },
  { mod: '11', label: 'Credenciamento' },
];

// ── Internals ───────────────────────────────────────────────────────────────

function fmtPNCPDate(d: Date): string {
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

function dateWindowStart(days = DATE_WINDOW_DAYS): string {
  const d = new Date(); d.setDate(d.getDate() - days);
  return fmtPNCPDate(d);
}

function todayStr(): string {
  return fmtPNCPDate(new Date());
}

type CacheMode = 'no-store' | 'force-cache' | { revalidate: number };

interface FetchPageResult { data: any[]; totalPages: number }

async function fetchPage(
  mod: string,
  page: number,
  uf: string,
  days: number,
  cache: CacheMode
): Promise<FetchPageResult> {
  const params = new URLSearchParams({
    dataInicial: dateWindowStart(days),
    dataFinal: todayStr(),
    pagina: String(page),
    tamanhoPagina: String(PAGE_SIZE),
    codigoModalidadeContratacao: mod,
  });
  if (uf) params.set('uf', uf);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const fetchOpts: RequestInit = {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    };
    // Apply cache strategy (Next.js fetch extensions)
    if (cache === 'no-store')        (fetchOpts as any).cache = 'no-store';
    else if (cache === 'force-cache') (fetchOpts as any).cache = 'force-cache';
    else                              (fetchOpts as any).next  = cache;

    const res = await fetch(`${PNCP_API}?${params.toString()}`, fetchOpts);
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
 * Fetch the LAST MAX_PAGES pages (newest records) for a single modalidade.
 * If totalPages <= MAX_PAGES, just fetches all of them.
 */
async function fetchAllPages(
  mod: string,
  uf: string,
  days: number,
  cache: CacheMode,
  maxPages = MAX_PAGES
): Promise<any[]> {
  const { data: page1, totalPages } = await fetchPage(mod, 1, uf, days, cache);
  if (page1.length === 0) return [];
  if (totalPages <= 1) return page1;

  // Build the page list: last maxPages pages (newest)
  const start = Math.max(2, totalPages - maxPages + 1);
  const pages: number[] = [];
  for (let p = totalPages; p >= start; p--) pages.push(p);

  const remaining = await Promise.allSettled(
    pages.map(p => fetchPage(mod, p, uf, days, cache))
  );

  const all = [...page1];
  remaining.forEach(r => {
    if (r.status === 'fulfilled') all.push(...r.value.data);
  });
  return all;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface FetchOportunidadesOpts {
  /** Window in days. Default 90. */
  days?: number;
  /** Cache strategy. Default 'no-store' for full search; pass {revalidate: N} for previews. */
  cache?: CacheMode;
  /** Modalidades subset (mod codes). Default = all. Use ['7','8','5'] for fast preview. */
  modalidades?: string[];
  /** Max pages per modalidade. Default MAX_PAGES (20). */
  maxPages?: number;
  /** Hard cap on returned records after filter+sort. Default unlimited. */
  limit?: number;
}

export interface FetchOportunidadesResult {
  data: any[];
  keywords: string[];
  uf: string;
  cidade: string;
  fetchedAt: string;
  windowDays: number;
}

/**
 * Master function: fetch + dedupe + filter by keywords/region + sort newest first.
 */
export async function fetchOportunidades(
  keywords: string[],
  region: { uf?: string; cidade?: string } = {},
  opts: FetchOportunidadesOpts = {}
): Promise<FetchOportunidadesResult> {
  const days     = opts.days ?? DATE_WINDOW_DAYS;
  const cache    = opts.cache ?? 'no-store';
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const mods     = opts.modalidades ?? MODALIDADES.map(m => m.mod);
  const uf       = region.uf || '';
  const cidade   = region.cidade || '';

  if (keywords.length === 0) {
    return {
      data: [], keywords: [], uf, cidade,
      fetchedAt: new Date().toISOString(),
      windowDays: days,
    };
  }

  // Fetch all modalidades in parallel
  const modResults = await Promise.allSettled(
    mods.map(mod => fetchAllPages(mod, uf, days, cache, maxPages))
  );

  let data: any[] = [];
  modResults.forEach(r => { if (r.status === 'fulfilled') data.push(...r.value); });

  // Dedupe by numeroControlePNCP
  const seen = new Set<string>();
  data = data.filter(l => {
    if (!l?.numeroControlePNCP || seen.has(l.numeroControlePNCP)) return false;
    seen.add(l.numeroControlePNCP); return true;
  });

  // Keyword filter: match on objetoCompra OR informacaoComplementar
  // (some editais describe the actual subject only in the complementar field)
  const kws = keywords.map(k => k.toLowerCase().trim()).filter(Boolean);
  data = data.filter(l => {
    const haystack = [
      l.objetoCompra,
      l.informacaoComplementar,
    ].filter(Boolean).join(' ').toLowerCase();
    return kws.some(kw => haystack.includes(kw));
  });

  // City filter
  if (cidade) {
    const c = cidade.toLowerCase();
    data = data.filter(l => l.unidadeOrgao?.municipioNome?.toLowerCase().includes(c));
  }

  // Sort newest first (publication date)
  data.sort((a, b) => {
    const da = new Date(a.dataPublicacaoPncp || 0).getTime();
    const db = new Date(b.dataPublicacaoPncp || 0).getTime();
    return db - da;
  });

  if (opts.limit && data.length > opts.limit) data = data.slice(0, opts.limit);

  return {
    data,
    keywords,
    uf,
    cidade,
    fetchedAt: new Date().toISOString(),
    windowDays: days,
  };
}
