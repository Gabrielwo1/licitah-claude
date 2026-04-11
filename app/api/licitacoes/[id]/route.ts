import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ITEMS_API = 'https://dadosabertos.compras.gov.br/modulo-contratacoes/2.1_consultarItensContratacoes_PNCP_14133_Id';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const idDecoded = decodeURIComponent(id);

  try {
    const itemsUrl = `${ITEMS_API}?tipo=idCompra&idCompra=${encodeURIComponent(idDecoded)}&pagina=1&tamanhoPagina=100`;
    const itemsRes = await fetch(itemsUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 600 },
    });

    let items = [];
    if (itemsRes.ok) {
      const itemsJson = await itemsRes.json();
      items = itemsJson.data || [];
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Items API error:', error);
    return NextResponse.json({ items: [] });
  }
}
