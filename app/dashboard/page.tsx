import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Search, Star, Target, Bell, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import sql from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Licitacao } from '@/lib/types';

async function getRecentLicitacoes(): Promise<Licitacao[]> {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
    const res = await fetch(
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${fmt(sevenDaysAgo)}&dataFinal=${fmt(today)}&pagina=1&tamanhoPagina=10&codigoModalidadeContratacao=7`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).slice(0, 5);
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

const statCards = [
  {
    key: 'favoritos' as const,
    label: 'Favoritos',
    href: '/dashboard/favoritos',
    icon: Star,
    color: '#FFD700',
    bg: '#FFF9E0',
  },
  {
    key: 'tarefas' as const,
    label: 'Tarefas Abertas',
    href: '/dashboard/tarefas',
    icon: FileText,
    color: '#0a1175',
    bg: '#EEF0FF',
  },
  {
    key: 'oportunidades' as const,
    label: 'Oportunidades',
    href: '/dashboard/oportunidades',
    icon: Target,
    color: '#259F46',
    bg: '#E8F5EC',
  },
  {
    key: 'notificacoes' as const,
    label: 'Notificações',
    href: '/dashboard/notificacoes',
    icon: Bell,
    color: '#FF6600',
    bg: '#FFF0E6',
  },
];

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
      {/* Welcome card with gradient */}
      <div
        className="rounded-[10px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, #0a1175 0%, #1a2fa0 100%)',
          color: '#fff',
        }}
      >
        <div>
          <h1 className="text-2xl font-bold">Olá, {firstName}!</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Acompanhe as últimas licitações e gerencie suas oportunidades.
          </p>
        </div>
        <Link href="/dashboard/licitacoes">
          <Button
            variant="orange"
            style={{ height: '50px', fontWeight: 700 }}
          >
            <Search className="h-4 w-4" />
            Buscar Licitações
          </Button>
        </Link>
      </div>

      {/* Quick search bar */}
      <div
        className="bg-white p-4 rounded-[10px] flex gap-3"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: '#7B7B7B' }}
          />
          <Link
            href="/dashboard/licitacoes"
            className="block w-full h-[42px] border rounded-md pl-9 pr-3 text-sm flex items-center"
            style={{
              borderColor: '#D3D3D3',
              color: '#7B7B7B',
              lineHeight: '42px',
              backgroundColor: '#F6F5FA',
            }}
          >
            Busca rápida por objeto ou órgão...
          </Link>
        </div>
        <Link href="/dashboard/licitacoes">
          <Button variant="padrao" style={{ height: '42px' }}>
            Buscar
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ key, label, href, icon: Icon, color, bg }) => (
          <Link key={key} href={href}>
            <div
              className="bg-white rounded-[10px] p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
            >
              <div
                className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: bg }}
              >
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: '#262E3A' }}
                >
                  {stats[key]}
                </p>
                <p className="text-xs font-semibold" style={{ color: '#7B7B7B' }}>
                  {label}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent licitações */}
      <div
        className="bg-white rounded-[10px]"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <h2 className="font-bold text-base" style={{ color: '#262E3A' }}>
            Licitações Recentes
          </h2>
          <Link
            href="/dashboard/licitacoes"
            className="text-sm font-semibold hover:underline"
            style={{ color: '#0a1175' }}
          >
            Ver todas →
          </Link>
        </div>

        {/* List */}
        {licitacoes.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#7B7B7B' }}>
            <p className="text-sm">Não foi possível carregar licitações no momento.</p>
            <p className="text-xs mt-1">A API do governo pode estar indisponível. Tente novamente.</p>
          </div>
        ) : (
          <div>
            {licitacoes.map((l, idx) => (
              <Link
                key={l.numeroControlePNCP}
                href={`/dashboard/licitacoes/${encodeURIComponent(l.numeroControlePNCP)}`}
                className="flex items-start gap-4 px-6 py-4 hover:bg-[#F6F5FA] transition-colors"
                style={
                  idx < licitacoes.length - 1
                    ? { borderBottom: '1px solid #F0F0F0' }
                    : {}
                }
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold line-clamp-2"
                    style={{ color: '#262E3A' }}
                  >
                    {l.objetoCompra}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs" style={{ color: '#7B7B7B' }}>
                      {l.orgaoEntidade?.razaoSocial} · {l.unidadeOrgao?.ufSigla}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {l.modalidadeNome}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {l.valorTotalEstimado && l.valorTotalEstimado > 0 ? (
                    <p
                      className="text-sm font-bold"
                      style={{ color: '#0a1175' }}
                    >
                      {formatCurrency(l.valorTotalEstimado)}
                    </p>
                  ) : null}
                  <p className="text-xs mt-0.5" style={{ color: '#7B7B7B' }}>
                    {formatDate(l.dataPublicacaoPncp)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
