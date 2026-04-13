import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';

// Modalidades mais usadas — buscadas em paralelo quando "todas" selecionado
const MODALIDADES_TODAS = ['7', '8', '14', '5', '6', '15', '11'];

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
  timeoutMs = 9000
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
      next: { revalidate: 14400 },
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
  const pagina = parseInt(searchParams.get('pagina') || '1');
  const tamanhoPagina = Math.max(10, Math.min(50, parseInt(searchParams.get('tamanhoPagina') || '20')));
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

  // Quando há filtro de cidade, buscar o máximo possível por request
  const subPageSize = (codigoIbge || municipio) ? 50 : Math.min(50, tamanhoPagina);

  let data: any[] = [];

  if (modalidadeParam && modalidadeParam !== 'all') {
    // Modalidade específica — 1 request
    data = await fetchModalidade(
      modalidadeParam, dataInicial, dataFinal, pagina, tamanhoPagina, uf, codigoIbge
    );
  } else {
    // Todas as modalidades — paralelo
    const results = await Promise.allSettled(
      MODALIDADES_TODAS.map(m =>
        fetchModalidade(m, dataInicial, dataFinal, 1, subPageSize, uf, codigoIbge)
      )
    );
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
