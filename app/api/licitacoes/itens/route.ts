import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function parseNumeroControlePNCP(id: string) {
  try {
    const parts = id.split('-');
    const cnpj = parts[0];
    const last = parts[parts.length - 1];
    const [seqStr, ano] = last.split('/');
    const sequencial = parseInt(seqStr, 10);
    return { cnpj, ano, sequencial };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const identificador = req.nextUrl.searchParams.get('identificador');
  if (!identificador) return NextResponse.json({ error: 'identificador obrigatório' }, { status: 400 });

  const parsed = parseNumeroControlePNCP(identificador);
  if (!parsed) return NextResponse.json([]);

  const { cnpj, ano, sequencial } = parsed;
  const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/${cnpj}/${ano}/${sequencial}/itens?pagina=1&tamanhoPagina=500`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.data || []);
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}
