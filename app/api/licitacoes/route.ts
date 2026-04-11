import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const GOV_API = 'https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes_PNCP_14133';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const pagina = searchParams.get('pagina') || '1';
  const tamanhoPagina = searchParams.get('tamanhoPagina') || '20';
  const dataInicial = searchParams.get('dataInicial');
  const dataFinal = searchParams.get('dataFinal');
  const modalidade = searchParams.get('modalidade');
  const uf = searchParams.get('uf');
  const busca = searchParams.get('busca');

  // Build API URL params
  const params = new URLSearchParams();
  params.set('pagina', pagina);
  params.set('tamanhoPagina', tamanhoPagina);

  // Default to last 7 days if no date specified
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  params.set('dataPublicacaoPncpInicial', dataInicial || sevenDaysAgo);
  params.set('dataPublicacaoPncpFinal', dataFinal || today);

  if (modalidade && modalidade !== 'all') params.set('codigoModalidade', modalidade);

  try {
    const url = `${GOV_API}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ data: [], totalRegistros: 0, paginasRestantes: false });
    }

    let json = await res.json();

    // Filter by UF if specified (API doesn't support it directly)
    if (uf && uf !== 'all' && json.data) {
      json.data = json.data.filter((l: any) =>
        l.unidadeOrgao?.ufSigla === uf || l.unidadeOrgao?.ufNome?.toLowerCase().includes(uf.toLowerCase())
      );
    }

    // Filter by search text if specified
    if (busca && json.data) {
      const buscaLower = busca.toLowerCase();
      json.data = json.data.filter((l: any) =>
        l.objetoCompra?.toLowerCase().includes(buscaLower) ||
        l.orgaoEntidade?.razaoSocial?.toLowerCase().includes(buscaLower)
      );
    }

    return NextResponse.json(json);
  } catch (error) {
    console.error('Gov API error:', error);
    return NextResponse.json({ data: [], totalRegistros: 0, paginasRestantes: false });
  }
}
