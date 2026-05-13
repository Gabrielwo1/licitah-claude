import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const maxDuration = 60;

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const PNCP_PAGE_SIZE = 50;

/**
 * PNCP returns ASC by publication date — page 1 = oldest, last page = newest.
 * Our fetch strategy fetches the LAST N pages of each modalidade (the newest).
 *
 * Volume reference (90-day national window, measured 2026-05):
 *   mod 8 (Dispensa)            ~187k records  / 3.750 pages
 *   mod 6 (Pregão Eletrônico)   ~94k records   / 1.880 pages
 *   mod 9 (Inexigibilidade)     ~71k records   / 1.430 pages
 *   mod 12 (Credenciamento)     ~6k records    / 130 pages
 *   mod 7 (Pregão Presencial)   ~few k         / ~100 pages
 *   mod 5, 4 (Concorrência)     ~few k each
 *   mod 1, 13, 14, 15, 11, 10   low volume
 *   mod 3 (Concurso)            ~50            / 1 page
 *   mod 2 (Diálogo Competitivo) ~1             / 1 page
 *
 * Coverage = pages * 50 = max records the user can search across per modalidade.
 * We fetch in parallel; modern fetch + Promise.allSettled handles the load fine
 * within the 60s Vercel function limit.
 */
const MODALIDADES_COVERAGE: { mod: string; pages: number; label: string }[] = [
  { mod: '8',  pages: 40, label: 'Dispensa'             }, // 2000 records
  { mod: '6',  pages: 30, label: 'Pregão Eletrônico'    }, // 1500 records
  { mod: '9',  pages: 20, label: 'Inexigibilidade'      }, // 1000 records
  { mod: '7',  pages: 10, label: 'Pregão Presencial'    }, //  500 records
  { mod: '5',  pages: 8,  label: 'Concorrência Pres.'   }, //  400 records
  { mod: '4',  pages: 8,  label: 'Concorrência Eletr.'  }, //  400 records
  { mod: '12', pages: 6,  label: 'Credenciamento'       }, //  300 records
  { mod: '1',  pages: 3,  label: 'Leilão Eletrônico'    }, //  150 records
  { mod: '13', pages: 2,  label: 'Leilão Presencial'    }, //  100 records
  { mod: '14', pages: 2,  label: 'Manifestação Interesse' }, // 100 records
  { mod: '15', pages: 2,  label: 'mod 15'               }, //  100 records
  { mod: '11', pages: 2,  label: 'mod 11'               }, //  100 records
  { mod: '10', pages: 2,  label: 'mod 10'               }, //  100 records
  { mod: '3',  pages: 1,  label: 'Concurso'             }, //   50 records
  { mod: '2',  pages: 1,  label: 'Diálogo Competitivo'  }, //   50 records
];
// Total ceiling: ~6850 records dos mais recentes em 3 meses.

const SPECIFIC_MOD_PAGES = 50; // 2500 records quando o usuário escolhe uma modalidade

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
  uf: string,
  codigoIbge: string,
  timeoutMs = 18000
): Promise<{ data: any[]; totalPages: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const params = new URLSearchParams({
    dataInicial,
    dataFinal,
    pagina: String(pagina),
    tamanhoPagina: String(PNCP_PAGE_SIZE),
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

/** Fetch the most recent N pages for a modalidade. */
async function fetchMostRecentPages(
  modalidade: string,
  dataInicial: string,
  dataFinal: string,
  maxPages: number,
  uf: string,
  codigoIbge: string
): Promise<any[]> {
  // Probe page 1 to get totalPages
  const probe = await fetchPage(modalidade, dataInicial, dataFinal, 1, uf, codigoIbge);
  if (probe.totalPages === 0 || probe.data.length === 0) return [];
  if (probe.totalPages <= maxPages) {
    // Few enough pages — fetch all (page 1 already in hand)
    if (probe.totalPages === 1) return probe.data;
    const rest = await Promise.allSettled(
      Array.from({ length: probe.totalPages - 1 }, (_, i) =>
        fetchPage(modalidade, dataInicial, dataFinal, i + 2, uf, codigoIbge)
      )
    );
    const all = [...probe.data];
    rest.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value.data); });
    return all;
  }
  // Total > maxPages → fetch the last maxPages (newest records)
  const start = probe.totalPages - maxPages + 1;
  const end   = probe.totalPages;
  const pages: number[] = [];
  for (let p = end; p >= start; p--) pages.push(p);

  const results = await Promise.allSettled(
    pages.map(p => fetchPage(modalidade, dataInicial, dataFinal, p, uf, codigoIbge))
  );
  const all: any[] = [];
  results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value.data); });
  return all;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const uf              = searchParams.get('uf') || '';
  const municipio       = searchParams.get('municipio') || '';
  const codigoIbge      = searchParams.get('codigoIbge') || '';
  const busca           = searchParams.get('busca') || '';
  const modalidadeParam = searchParams.get('modalidade') || '';

  // Default window: últimos 3 meses (até hoje) quando o usuário não filtra data
  const rawInicial = searchParams.get('dataInicial') || threeMonthsAgo();
  const rawFinal   = searchParams.get('dataFinal')   || todayStr();
  const dataInicial = toAPIDate(rawInicial);
  const dataFinal   = toAPIDate(rawFinal);

  const startedAt = Date.now();
  let data: any[] = [];

  if (modalidadeParam && modalidadeParam !== 'all') {
    // Modalidade específica — cobertura mais profunda (50 páginas = 2.500 records)
    data = await fetchMostRecentPages(modalidadeParam, dataInicial, dataFinal, SPECIFIC_MOD_PAGES, uf, codigoIbge);
  } else {
    // Todas as modalidades — em paralelo, cada uma com sua cobertura ajustada por volume
    const fetches = MODALIDADES_COVERAGE.map(({ mod, pages }) =>
      fetchMostRecentPages(mod, dataInicial, dataFinal, pages, uf, codigoIbge)
    );
    const results = await Promise.allSettled(fetches);
    results.forEach(r => {
      if (r.status === 'fulfilled') data.push(...r.value);
    });
  }

  // Dedupe by numeroControlePNCP
  const seen = new Set<string>();
  data = data.filter(l => {
    if (!l?.numeroControlePNCP || seen.has(l.numeroControlePNCP)) return false;
    seen.add(l.numeroControlePNCP);
    return true;
  });

  const totalFetched = data.length;

  // City filter (fallback when codigoIbge wasn't used)
  if (municipio && !codigoIbge) {
    const m = municipio.toLowerCase();
    data = data.filter((l: any) =>
      l.unidadeOrgao?.municipioNome?.toLowerCase().includes(m)
    );
  }

  // Keyword filter: objeto + informacaoComplementar + órgão
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

  // Order newest first (publication > abertura fallback)
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
    debug: {
      totalFetchedFromPNCP: totalFetched,
      afterFilters: data.length,
      windowDays: Math.round((Date.parse(rawFinal) - Date.parse(rawInicial)) / 86400000),
      elapsedMs: Date.now() - startedAt,
    },
    fetchedAt: new Date().toISOString(),
  });
}
