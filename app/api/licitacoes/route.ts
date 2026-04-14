import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';

// Máximo que o PNCP aceita por request (>50 retorna 400)
const PNCP_PAGE_SIZE = 50;

// Modalidades e quantas páginas buscar de cada (50 itens/página, paralelo)
// Pregão Eletr(7), Pregão Pres(8), Dispensa(14), Concorr Eletr(5) → 3 páginas = 150 cada
// Demais → 1 página = 50 cada  → total potencial ~750 resultados
const MODALIDADES_MULTIPAGINA: { mod: string; paginas: number }[] = [
  { mod: '7',  paginas: 3 }, // Pregão Eletrônico
  { mod: '8',  paginas: 2 }, // Pregão Presencial
  { mod: '14', paginas: 3 }, // Dispensa de Licitação
  { mod: '5',  paginas: 2 }, // Concorrência Eletrônica
  { mod: '6',  paginas: 1 }, // Concorrência Presencial
  { mod: '15', paginas: 1 }, // Inexigibilidade
  { mod: '11', paginas: 1 }, // Credenciamento
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

async function fetchModalidade(
  modalidade: string,
  dataInicial: string,
  dataFinal: string,
  pagina: number,
  tamanhoPagina: number,
  uf: string,
  codigoIbge: string,
  timeoutMs = 12000
): Promise<any[]> {
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
      cache: 'no-store', // sem cache no servidor — cliente usa localStorage
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    clearTimeout(timer);
    return [];
  }
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

  // Datas — padrão: últimos 3 meses
  const rawInicial = searchParams.get('dataInicial') || threeMonthsAgo();
  const rawFinal = searchParams.get('dataFinal') || todayStr();
  const dataInicial = toAPIDate(rawInicial);
  const dataFinal = toAPIDate(rawFinal);

  let data: any[] = [];

  if (modalidadeParam && modalidadeParam !== 'all') {
    // Modalidade específica — busca 3 páginas em paralelo
    const pages = await Promise.allSettled([1, 2, 3].map(p =>
      fetchModalidade(modalidadeParam, dataInicial, dataFinal, p, PNCP_PAGE_SIZE, uf, codigoIbge)
    ));
    pages.forEach(r => { if (r.status === 'fulfilled') data.push(...r.value); });
  } else {
    // Todas as modalidades — múltiplas páginas por modalidade, tudo em paralelo
    const fetches = MODALIDADES_MULTIPAGINA.flatMap(({ mod, paginas }) =>
      Array.from({ length: paginas }, (_, i) =>
        fetchModalidade(mod, dataInicial, dataFinal, i + 1, PNCP_PAGE_SIZE, uf, codigoIbge)
      )
    );
    const results = await Promise.allSettled(fetches);
    results.forEach(r => {
      if (r.status === 'fulfilled') data.push(...r.value);
    });

    // Remove duplicados pelo numeroControlePNCP
    const seen = new Set<string>();
    data = data.filter(l => {
      if (seen.has(l.numeroControlePNCP)) return false;
      seen.add(l.numeroControlePNCP);
      return true;
    });
  }

  // Filtro client-side por cidade (nome) — fallback se codigoIbge não funcionou
  if (municipio && !codigoIbge) {
    const m = municipio.toLowerCase();
    data = data.filter((l: any) =>
      l.unidadeOrgao?.municipioNome?.toLowerCase().includes(m)
    );
  }

  // Filtro client-side por busca/objeto
  if (busca) {
    const bl = busca.toLowerCase();
    data = data.filter((l: any) =>
      l.objetoCompra?.toLowerCase().includes(bl) ||
      l.orgaoEntidade?.razaoSocial?.toLowerCase().includes(bl)
    );
  }

  // Ordena por data de abertura mais recente primeiro
  data.sort((a: any, b: any) => {
    const da = new Date(a.dataAberturaProposta || a.dataPublicacaoPncp || 0).getTime();
    const db = new Date(b.dataAberturaProposta || b.dataPublicacaoPncp || 0).getTime();
    return db - da;
  });

  return NextResponse.json({
    data,
    totalRegistros: data.length,
    totalPaginas: 1,
    paginasRestantes: false,
  });
}
