import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const TIMEOUT_MS = 8000;

function toAPIDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
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
  const uf = searchParams.get('uf');
  const busca = searchParams.get('busca');
  const modalidadeParam = searchParams.get('modalidade');

  const today = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const rawInicial = searchParams.get('dataInicial') || sevenDaysAgo.toISOString().split('T')[0];
  const rawFinal = searchParams.get('dataFinal') || today.toISOString().split('T')[0];
  const dataInicial = toAPIDate(rawInicial);
  const dataFinal = toAPIDate(rawFinal);

  // Modalidade selecionada ou padrão (7 = Pregão Eletrônico, o mais comum)
  const modalidade = (modalidadeParam && modalidadeParam !== 'all')
    ? modalidadeParam
    : '7';

  const url = `${PNCP_API}?dataInicial=${dataInicial}&dataFinal=${dataFinal}&pagina=${pagina}&tamanhoPagina=${tamanhoPagina}&codigoModalidadeContratacao=${modalidade}`;

  const json = await fetchWithTimeout(url);

  if (!json) {
    return NextResponse.json({ data: [], totalRegistros: 0, paginasRestantes: false, error: 'API indisponível' });
  }

  let data = json.data || [];

  // Filtros client-side
  if (uf && uf !== 'all') {
    data = data.filter((l: any) => l.unidadeOrgao?.ufSigla === uf);
  }
  if (busca) {
    const bl = busca.toLowerCase();
    data = data.filter((l: any) =>
      l.objetoCompra?.toLowerCase().includes(bl) ||
      l.orgaoEntidade?.razaoSocial?.toLowerCase().includes(bl)
    );
  }

  // Ordena da mais recente para a mais antiga (dataAtualizacaoPncp > dataPublicacaoPncp)
  data.sort((a: any, b: any) => {
    const da = new Date(a.dataAtualizacaoPncp || a.dataPublicacaoPncp || 0).getTime();
    const db = new Date(b.dataAtualizacaoPncp || b.dataPublicacaoPncp || 0).getTime();
    return db - da;
  });

  return NextResponse.json({
    data,
    totalRegistros: json.totalRegistros || 0,
    totalPaginas: json.totalPaginas || 1,
    paginasRestantes: json.paginasRestantes || false,
  });
}
