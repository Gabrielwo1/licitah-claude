import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const TIMEOUT_MS = 10000;

function toAPIDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function threeMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

async function fetchWithTimeout(url: string, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
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
  const busca = searchParams.get('busca') || '';
  const modalidadeParam = searchParams.get('modalidade') || '';

  // Datas — padrão: últimos 3 meses
  const rawInicial = searchParams.get('dataInicial') || threeMonthsAgo();
  const rawFinal = searchParams.get('dataFinal') || today();
  const dataInicial = toAPIDate(rawInicial);
  const dataFinal = toAPIDate(rawFinal);

  // Modalidade — padrão: Pregão Eletrônico
  const modalidade = (modalidadeParam && modalidadeParam !== 'all') ? modalidadeParam : '7';

  // Monta URL com filtros suportados pela API do PNCP
  const params = new URLSearchParams({
    dataInicial,
    dataFinal,
    pagina: String(pagina),
    tamanhoPagina: String(tamanhoPagina),
    codigoModalidadeContratacao: modalidade,
  });
  if (uf) params.set('uf', uf);

  const url = `${PNCP_API}?${params.toString()}`;
  const json = await fetchWithTimeout(url);

  if (!json) {
    return NextResponse.json({ data: [], totalRegistros: 0, paginasRestantes: false, error: 'API indisponível' });
  }

  let data: any[] = json.data || [];

  // Filtros client-side (campos não suportados diretamente pela API)
  if (municipio) {
    const m = municipio.toLowerCase();
    data = data.filter((l: any) =>
      l.unidadeOrgao?.municipioNome?.toLowerCase().includes(m)
    );
  }
  if (busca) {
    const bl = busca.toLowerCase();
    data = data.filter((l: any) =>
      l.objetoCompra?.toLowerCase().includes(bl) ||
      l.orgaoEntidade?.razaoSocial?.toLowerCase().includes(bl)
    );
  }

  // Ordena por data de abertura mais recente primeiro (padrão)
  data.sort((a: any, b: any) => {
    const da = new Date(a.dataAberturaProposta || a.dataPublicacaoPncp || 0).getTime();
    const db = new Date(b.dataAberturaProposta || b.dataPublicacaoPncp || 0).getTime();
    return db - da;
  });

  return NextResponse.json({
    data,
    totalRegistros: json.totalRegistros || 0,
    totalPaginas: json.totalPaginas || 1,
    paginasRestantes: json.paginasRestantes || false,
  });
}
