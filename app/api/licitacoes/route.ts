import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';

// Modalidades mais usadas para busca "todas"
const MODALIDADES_PRINCIPAIS = [7, 8, 5, 6, 1, 14, 15];

// Converte YYYY-MM-DD → yyyyMMdd
function toAPIDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

async function fetchModalidade(
  modalidade: number,
  pagina: number,
  tamanhoPagina: number,
  dataInicial: string,
  dataFinal: string
) {
  const params = new URLSearchParams({
    dataInicial,
    dataFinal,
    pagina: String(pagina),
    tamanhoPagina: String(tamanhoPagina),
    codigoModalidadeContratacao: String(modalidade),
  });

  const res = await fetch(`${PNCP_API}?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  });

  if (!res.ok) return { data: [], totalRegistros: 0, paginasRestantes: false };
  return res.json();
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const pagina = parseInt(searchParams.get('pagina') || '1');
  const tamanhoPagina = Math.max(10, parseInt(searchParams.get('tamanhoPagina') || '20'));
  const uf = searchParams.get('uf');
  const busca = searchParams.get('busca');
  const modalidadeParam = searchParams.get('modalidade');

  // Datas — padrão: últimos 7 dias
  const today = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const rawInicial = searchParams.get('dataInicial') || sevenDaysAgo.toISOString().split('T')[0];
  const rawFinal = searchParams.get('dataFinal') || today.toISOString().split('T')[0];
  const dataInicial = toAPIDate(rawInicial);
  const dataFinal = toAPIDate(rawFinal);

  try {
    let allData: any[] = [];
    let totalRegistros = 0;
    let paginasRestantes = false;

    if (modalidadeParam && modalidadeParam !== 'all') {
      // Modalidade específica
      const json = await fetchModalidade(parseInt(modalidadeParam), pagina, tamanhoPagina, dataInicial, dataFinal);
      allData = json.data || [];
      totalRegistros = json.totalRegistros || 0;
      paginasRestantes = json.paginasRestantes || false;
    } else {
      // Todas: busca em paralelo nas principais modalidades
      const results = await Promise.allSettled(
        MODALIDADES_PRINCIPAIS.map(m => fetchModalidade(m, pagina, Math.min(tamanhoPagina, 20), dataInicial, dataFinal))
      );

      results.forEach(r => {
        if (r.status === 'fulfilled') {
          allData.push(...(r.value.data || []));
          totalRegistros += r.value.totalRegistros || 0;
          if (r.value.paginasRestantes) paginasRestantes = true;
        }
      });

      // Sort by date descending
      allData.sort((a, b) =>
        new Date(b.dataPublicacaoPncp).getTime() - new Date(a.dataPublicacaoPncp).getTime()
      );
    }

    // Filtros client-side (UF e busca)
    if (uf && uf !== 'all') {
      allData = allData.filter(l => l.unidadeOrgao?.ufSigla === uf);
    }
    if (busca) {
      const buscaLower = busca.toLowerCase();
      allData = allData.filter(l =>
        l.objetoCompra?.toLowerCase().includes(buscaLower) ||
        l.orgaoEntidade?.razaoSocial?.toLowerCase().includes(buscaLower)
      );
    }

    return NextResponse.json({ data: allData, totalRegistros, paginasRestantes });
  } catch (error) {
    console.error('PNCP API error:', error);
    return NextResponse.json({ data: [], totalRegistros: 0, paginasRestantes: false });
  }
}
