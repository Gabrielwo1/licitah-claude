import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Parseia numeroControlePNCP: "87708889000144-1-000024/2023"
// → { cnpj: "87708889000144", ano: "2023", sequencial: 24 }
function parseNumeroControlePNCP(id: string) {
  try {
    const parts = id.split('-');
    const cnpj = parts[0];
    const last = parts[parts.length - 1]; // "000024/2023"
    const [seqStr, ano] = last.split('/');
    const sequencial = parseInt(seqStr, 10);
    return { cnpj, ano, sequencial };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const idDecoded = decodeURIComponent(id);

  const parsed = parseNumeroControlePNCP(idDecoded);
  if (!parsed) return NextResponse.json({ licitacao: null, items: [] });

  const { cnpj, ano, sequencial } = parsed;
  const baseUrl = `https://pncp.gov.br/api/consulta/v1/contratacoes/${cnpj}/${ano}/${sequencial}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const [detailRes, itemsRes] = await Promise.all([
      fetch(baseUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        next: { revalidate: 300 },
      }).catch(() => null),
      fetch(`${baseUrl}/itens?pagina=1&tamanhoPagina=100`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 600 },
      }).catch(() => null),
    ]);

    clearTimeout(timeout);

    let licitacao = null;
    if (detailRes?.ok) {
      licitacao = await detailRes.json();
    }

    let items: any[] = [];
    if (itemsRes?.ok) {
      const itemsData = await itemsRes.json();
      items = Array.isArray(itemsData) ? itemsData : (itemsData.data || []);
    }

    return NextResponse.json({ licitacao, items });
  } catch (error) {
    console.error('PNCP detail API error:', error);
    return NextResponse.json({ licitacao: null, items: [] });
  }
}
