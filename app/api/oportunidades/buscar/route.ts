import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

const PNCP_API = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const MODALIDADES = ['7', '8', '14', '5', '6', '15', '11'];

function threeMonthsAgo(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0].replace(/-/g, '');
}
function todayStr(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

async function fetchMod(mod: string, busca: string, uf: string, codigoIbge: string): Promise<any[]> {
  const params = new URLSearchParams({
    dataInicial: threeMonthsAgo(), dataFinal: todayStr(),
    pagina: '1', tamanhoPagina: '50',
    codigoModalidadeContratacao: mod,
  });
  if (uf) params.set('uf', uf);
  if (codigoIbge) params.set('codigoMunicipioIbge', codigoIbge);
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${PNCP_API}?${params.toString()}`, {
      headers: { Accept: 'application/json' }, signal: controller.signal, cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const userId = (session.user as any).id;

  // Load user's oportunidade config
  const rows = await sql`
    SELECT * FROM licitacoes_oportunidades
    WHERE licitacoes_oportunidade_autor = ${userId}
    ORDER BY licitacoes_oportunidade_id DESC
    LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ keywords: [], data: [] });

  const row = rows[0];
  const regioes = row.licitacoes_oportunidade_regioes || '';
  let keywords: string[] = [];
  try { keywords = JSON.parse(row.licitacoes_oportunidade_tagmento); } catch {
    keywords = row.licitacoes_oportunidade_tagmento?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
  }
  if (keywords.length === 0) return NextResponse.json({ keywords: [], data: [] });

  // Parse region
  const [uf, cidade] = regioes.includes(':') ? regioes.split(':') : [regioes, ''];

  // Search PNCP for all modalidades
  const results = await Promise.allSettled(
    MODALIDADES.map(m => fetchMod(m, '', uf, ''))
  );
  let data: any[] = [];
  results.forEach(r => { if (r.status === 'fulfilled') data.push(...r.value); });

  // Deduplicate
  const seen = new Set<string>();
  data = data.filter(l => {
    if (seen.has(l.numeroControlePNCP)) return false;
    seen.add(l.numeroControlePNCP); return true;
  });

  // Filter by keywords (any keyword in objetoCompra)
  const kws = keywords.map(k => k.toLowerCase());
  data = data.filter(l => {
    const obj = (l.objetoCompra || '').toLowerCase();
    return kws.some(kw => obj.includes(kw));
  });

  // Filter by city if provided
  if (cidade) {
    const c = cidade.toLowerCase();
    data = data.filter(l => l.unidadeOrgao?.municipioNome?.toLowerCase().includes(c));
  }

  return NextResponse.json({ keywords, uf, cidade, data });
}
