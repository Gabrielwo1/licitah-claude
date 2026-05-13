import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';

// Máximo que o PNCP aceita por request (>50 retorna 400)
const PNCP_PAGE_SIZE = 50;

// PNCP retorna resultados em ordem ASCENDENTE de publicação (página 1 = MAIS ANTIGOS).
// Para usuário ver as licitações mais novas, sempre buscamos as ÚLTIMAS N páginas.
// Modalidades de alto volume merecem mais páginas porque cobrem janela mais curta.
const MODALIDADES_MULTIPAGINA: { mod: string; paginas: number; label: string }[] = [
  { mod: '7',  paginas: 6, label: 'Pregão Eletrônico'    },
  { mod: '8',  paginas: 4, label: 'Pregão Presencial'    },
  { mod: '14', paginas: 6, label: 'Dispensa'             },
  { mod: '5',  paginas: 3, label: 'Concorrência Eletr.'  },
  { mod: '6',  paginas: 2, label: 'Concorrência Pres.'   },
  { mod: '15', paginas: 2, label: 'Inexigibilidade'      },
  { mod: '11', paginas: 2, label: 'Credenciamento'       },
];

function toAPIDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function threeMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

async function fetchPage(
  modalidade: string,
  dataInicial: string,
  dataFinal: string,
  pagina: number,
  tamanhoPagina: number,
  uf: string,
  codigoIbge: string,
  timeoutMs = 12000
): Promise<{ data: any[]; totalPages: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const params = new URLSearchParams({
    dataInicial,
    dataFinal,
    pagina: String(pagina),
    tamanhoPagina: String(tamanhoPagina),
    codigoModalidadeContratacao: modalidade,
  });
  if (uf) params.set('uf', uf);
  if (codigoIbge) params.set('codigoMunicipioIbge', codigoIbge);

  try {
    const res = await fetch(`${PNCP_API}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { data: [], totalPages: 0 };
    const json = await res.json();
    const totalPages = json.totalPaginas ?? Math.ceil((json.totalRegistros ?? 0) / PNCP_PAGE_SIZE);
    return { data: json.data || [], totalPages };
  } catch {
    clearTimeout(timer);
    return { data: [], totalPages: 0 };
  }
}

/**
 * Fetch the most-recent N pages for a modalidade.
 *  1. Probe page 1 to learn totalPages.
 *  2. If totalPages <= maxPages → just take page 1 (no truncation needed).
 *  3. Else → fetch pages [totalPages..totalPages-maxPages+1] (the newest).
 *
 * PNCP returns ASC by publication date. Page 1 = oldest, last page = newest.
 * Without this we'd be filtering against the oldest 3 months of editais.
 */
async function fetchMostRecentPages(
  modalidade: string,
  dataInicial: string,
  dataFinal: string,
  maxPages: number,
  uf: string,
  codigoIbge: string
): Promise<any[]> {
  const probe = await fetchPage(modalidade, dataInicial, dataFinal, 1, PNCP_PAGE_SIZE, uf, codigoIbge);
  if (probe.data.length === 0) return [];
  if (probe.totalPages <= 1) return probe.data;

  // If there are fewer pages than we want, fetch what's available (pages 2..totalPages)
  // Otherwise fetch the LAST maxPages (newest).
  const start = probe.totalPages <= maxPages
    ? 2
    : probe.totalPages - maxPages + 1;
  const end = probe.totalPages;

  const pagesToFetch: number[] = [];
  for (let p = end; p >= start; p--) pagesToFetch.push(p);

  const remaining = await Promise.allSettled(
    pagesToFetch.map(p => fetchPage(modalidade, dataInicial, dataFinal, p, PNCP_PAGE_SIZE, uf, codigoIbge))
  );

  const all: any[] = [];
  // Include probe.data only when totalPages <= maxPages (else probe is the oldest and we skip it)
  if (probe.totalPages <= maxPages) all.push(...probe.data);
  remaining.forEach(r => {
    if (r.status === 'fulfilled') all.push(...r.value.data);
  });
  return all;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const uf = searchParams.get('uf') || '';
  const municipio = searchParams.get('municipio') || '';
  const codigoIbge = searchParams.get('codigoIbge') || '';
  const busca = searchParams.get('busca') || '';
  const modalidadeParam = searchParams.get('modalidade') || '';

  // Default window: últimos 3 meses (até hoje) quando o usuário não filtra data
  const rawInicial = searchParams.get('dataInicial') || threeMonthsAgo();
  const rawFinal   = searchParams.get('dataFinal')   || todayStr();
  const dataInicial = toAPIDate(rawInicial);
  const dataFinal   = toAPIDate(rawFinal);

  let data: any[] = [];

  if (modalidadeParam && modalidadeParam !== 'all') {
    // Specific modalidade: fetch its newest pages (up to 8 for deeper coverage)
    data = await fetchMostRecentPages(modalidadeParam, dataInicial, dataFinal, 8, uf, codigoIbge);
  } else {
    // All modalidades: fetch each one's newest pages in parallel
    const fetches = MODALIDADES_MULTIPAGINA.map(({ mod, paginas }) =>
      fetchMostRecentPages(mod, dataInicial, dataFinal, paginas, uf, codigoIbge)
    );
    const results = await Promise.allSettled(fetches);
    results.forEach(r => {
      if (r.status === 'fulfilled') data.push(...r.value);
    });
  }

  // Deduplicate by numeroControlePNCP
  const seen = new Set<string>();
  data = data.filter(l => {
    if (seen.has(l.numeroControlePNCP)) return false;
    seen.add(l.numeroControlePNCP);
    return true;
  });

  // Client-side filter by city name (fallback when codigoIbge não foi usado)
  if (municipio && !codigoIbge) {
    const m = municipio.toLowerCase();
    data = data.filter((l: any) =>
      l.unidadeOrgao?.municipioNome?.toLowerCase().includes(m)
    );
  }

  // Keyword filter: objetoCompra + informacaoComplementar + órgão
  // (alinhado com lib/oportunidades para que termos como "livros" batam em mais editais)
  if (busca) {
    const bl = busca.toLowerCase();
    data = data.filter((l: any) => {
      const haystack = [
        l.objetoCompra,
        l.informacaoComplementar,
        l.orgaoEntidade?.razaoSocial,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(bl);
    });
  }

  // Order by most recent first (publication > abertura fallback)
  data.sort((a: any, b: any) => {
    const da = new Date(a.dataPublicacaoPncp || a.dataAberturaProposta || 0).getTime();
    const db = new Date(b.dataPublicacaoPncp || b.dataAberturaProposta || 0).getTime();
    return db - da;
  });

  return NextResponse.json({
    data,
    totalRegistros: data.length,
    totalPaginas: 1,
    paginasRestantes: false,
    fetchedAt: new Date().toISOString(),
  });
}
