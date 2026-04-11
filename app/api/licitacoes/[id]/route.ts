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
  if (!parsed) return NextResponse.json({ items: [] });

  const { cnpj, ano, sequencial } = parsed;

  try {
    const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/${cnpj}/${ano}/${sequencial}/itens?pagina=1&tamanhoPagina=100`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) return NextResponse.json({ items: [] });

    const items = await res.json();
    // API returns array directly for items
    return NextResponse.json({ items: Array.isArray(items) ? items : (items.data || []) });
  } catch (error) {
    console.error('PNCP items API error:', error);
    return NextResponse.json({ items: [] });
  }
}
