import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function parseId(id: string) {
  try {
    const parts = id.split('-');
    const cnpj = parts[0];
    const last = parts[parts.length - 1];
    const [seqStr, ano] = last.split('/');
    return { cnpj, ano, sequencial: parseInt(seqStr, 10) };
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const identificador = req.nextUrl.searchParams.get('identificador');
  if (!identificador) return NextResponse.json([]);

  const parsed = parseId(identificador);
  if (!parsed) return NextResponse.json([]);

  const { cnpj, ano, sequencial } = parsed;
  const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/historico?pagina=1&tamanhoPagina=500`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : (data.data || []));
  } catch {
    return NextResponse.json([]);
  }
}
