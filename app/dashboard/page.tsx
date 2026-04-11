import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Star, Target, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import sql from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Licitacao } from '@/lib/types';

async function getRecentLicitacoes(): Promise<Licitacao[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const res = await fetch(
      `https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes_PNCP_14133?pagina=1&tamanhoPagina=5&dataPublicacaoPncpInicial=${sevenDaysAgo}&dataPublicacaoPncpFinal=${today}`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

async function getStats(userId: string, empresaId: string | null) {
  try {
    const [favCount, taskCount, oppCount, notifCount] = await Promise.all([
      sql`SELECT COUNT(*) as c FROM favoritos WHERE favorito_autor = ${userId}`,
      sql`SELECT COUNT(*) as c FROM licitacoes_tarefas WHERE licitacoes_tarefa_empresa = ${empresaId || 0} AND licitacoes_tarefa_status = 0`,
      sql`SELECT COUNT(*) as c FROM licitacoes_oportunidades WHERE licitacoes_oportunidade_empresa = ${empresaId || 0}`,
      sql`SELECT COUNT(*) as c FROM notificacoes WHERE notificacao_destinatario = ${userId} AND notificacao_lida = 0`,
    ]);
    return {
      favoritos: Number(favCount[0]?.c || 0),
      tarefas: Number(taskCount[0]?.c || 0),
      oportunidades: Number(oppCount[0]?.c || 0),
      notificacoes: Number(notifCount[0]?.c || 0),
    };
  } catch {
    return { favoritos: 0, tarefas: 0, oportunidades: 0, notificacoes: 0 };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || '0';
  const empresaId = (session?.user as any)?.empresaId || null;

  const [licitacoes, stats] = await Promise.all([
    getRecentLicitacoes(),
    getStats(userId, empresaId),
  ]);

  const firstName = session?.user?.name?.split(' ')[0] || 'Usuário';

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {firstName}! 👋</h1>
          <p className="text-gray-500 mt-1">Veja as últimas licitações disponíveis</p>
        </div>
        <Link href="/dashboard/licitacoes">
          <Button variant="orange">
            <Search className="h-4 w-4" />
            Buscar Licitações
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/favoritos">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.favoritos}</p>
                  <p className="text-xs text-gray-500">Favoritos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/tarefas">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.tarefas}</p>
                  <p className="text-xs text-gray-500">Tarefas abertas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/oportunidades">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.oportunidades}</p>
                  <p className="text-xs text-gray-500">Oportunidades</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/notificacoes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Search className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.notificacoes}</p>
                  <p className="text-xs text-gray-500">Notificações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent licitações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Licitações recentes (últimos 7 dias)</CardTitle>
          <Link href="/dashboard/licitacoes" className="text-sm text-[#0a1175] hover:underline">
            Ver todas →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {licitacoes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>Não foi possível carregar licitações no momento.</p>
              <p className="text-sm mt-1">A API do governo pode estar indisponível. Tente novamente.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {licitacoes.map((l) => (
                <Link
                  key={l.numeroControlePNCP}
                  href={`/dashboard/licitacoes/${encodeURIComponent(l.numeroControlePNCP)}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{l.objetoCompra}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {l.orgaoEntidade?.razaoSocial} · {l.unidadeOrgao?.ufSigla}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {l.valorTotalEstimado ? (
                      <p className="text-sm font-semibold text-[#0a1175]">
                        {formatCurrency(l.valorTotalEstimado)}
                      </p>
                    ) : null}
                    <p className="text-xs text-gray-400">{formatDate(l.dataPublicacaoPncp)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
