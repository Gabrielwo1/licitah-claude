import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPlano } from '@/lib/user-plano';
import { PLANOS_LIMITES, PLANO_LABELS } from '@/lib/planos-config';
import sql from '@/lib/db';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;
  const plano  = await getUserPlano(userId);
  const limites = PLANOS_LIMITES[plano];

  // Busca contagens atuais para exibir no frontend
  let gerenciadas = 0, documentos = 0, empresas = 0;
  try {
    const [g, d, e] = await Promise.all([
      sql`SELECT COUNT(*)::int AS c FROM licitacoes_gerenciadas WHERE lg_conta = ${userId}`,
      sql`SELECT COUNT(*)::int AS c FROM licitacoes_habilitacoes WHERE licitacoes_habilitacao_autor = ${userId}`,
      sql`SELECT COUNT(*)::int AS c FROM empresas_associacao WHERE ea_usuario = ${userId}`,
    ]);
    gerenciadas = Number(g[0]?.c || 0);
    documentos  = Number(d[0]?.c || 0);
    empresas    = Number(e[0]?.c || 0);
  } catch { /* ignora — retorna zeros */ }

  return NextResponse.json({
    plano,
    label: PLANO_LABELS[plano],
    limites,
    uso: { gerenciadas, documentos, empresas },
  });
}
