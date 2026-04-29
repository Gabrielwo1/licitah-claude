import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  Search, Star, Target, Bell, FileText, Briefcase, FolderOpen,
  Clock, AlertTriangle, ArrowUpRight, CheckCircle2, Calendar,
  TrendingUp, Plus, Building2, Activity, ChevronRight, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import sql from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { Licitacao } from '@/lib/types';

// ── Data fetches ──────────────────────────────────────────────────────────────

/**
 * Fetch user's latest oportunidades — applies keyword + region filtering
 * against PNCP results from the last 30 days. Lightweight version of the
 * /api/oportunidades/buscar endpoint optimized for dashboard preview.
 */
async function getUltimasOportunidades(keywords: string[], region: string): Promise<Licitacao[]> {
  if (keywords.length === 0) return [];

  // Parse region: "" | "SP" | "SP:Campinas"
  let uf = '', cidade = '';
  if (region) {
    if (region.includes(':')) {
      const idx = region.indexOf(':');
      uf = region.slice(0, idx); cidade = region.slice(idx + 1);
    } else {
      uf = region;
    }
  }

  const today = new Date();
  const monthAgo = new Date(); monthAgo.setDate(today.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');

  // Fetch top modalidades in parallel (Pregão + Dispensa cover ~80% of volume)
  const modalidades = ['7', '8', '5'];
  const fetches = modalidades.map(mod => {
    const params = new URLSearchParams({
      dataInicial: fmt(monthAgo),
      dataFinal: fmt(today),
      pagina: '1',
      tamanhoPagina: '50',
      codigoModalidadeContratacao: mod,
    });
    if (uf) params.set('uf', uf);
    return fetch(`https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => j.data || [])
      .catch(() => []);
  });

  const results = await Promise.all(fetches);
  let merged: any[] = results.flat();

  // Dedupe
  const seen = new Set<string>();
  merged = merged.filter(l => {
    if (seen.has(l.numeroControlePNCP)) return false;
    seen.add(l.numeroControlePNCP); return true;
  });

  // Filter by keywords
  const kws = keywords.map(k => k.toLowerCase().trim());
  merged = merged.filter(l => {
    const obj = (l.objetoCompra || '').toLowerCase();
    return kws.some(kw => obj.includes(kw));
  });

  // City filter
  if (cidade) {
    const c = cidade.toLowerCase();
    merged = merged.filter(l => l.unidadeOrgao?.municipioNome?.toLowerCase().includes(c));
  }

  // Sort by publication date desc, top 5
  merged.sort((a, b) => {
    const da = new Date(a.dataPublicacaoPncp || 0).getTime();
    const db = new Date(b.dataPublicacaoPncp || 0).getTime();
    return db - da;
  });

  return merged.slice(0, 5);
}

async function getStats(userId: string) {
  try {
    const [favCount, taskOpen, taskOverdue, oppCount, notifCount, lastFavWeek, lastTaskWeek] = await Promise.all([
      sql`SELECT COUNT(*)::int as c FROM favoritos WHERE favorito_autor = ${userId}`,
      sql`SELECT COUNT(*)::int as c FROM licitacoes_tarefas WHERE licitacoes_tarefa_autor = ${userId} AND licitacoes_tarefa_andamento = 0`,
      sql`SELECT COUNT(*)::int as c FROM licitacoes_tarefas WHERE licitacoes_tarefa_autor = ${userId} AND licitacoes_tarefa_andamento = 0 AND licitacoes_tarefa_prazo IS NOT NULL AND licitacoes_tarefa_prazo < NOW()`,
      sql`SELECT COUNT(*)::int as c FROM licitacoes_oportunidades WHERE licitacoes_oportunidade_autor = ${userId}`,
      sql`SELECT COUNT(*)::int as c FROM notificacoes WHERE notificacao_destinatario = ${userId} AND notificacao_lido = 0`,
      sql`SELECT COUNT(*)::int as c FROM favoritos WHERE favorito_autor = ${userId} AND favorito_data >= NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*)::int as c FROM licitacoes_tarefas WHERE licitacoes_tarefa_autor = ${userId} AND licitacoes_tarefa_data >= NOW() - INTERVAL '7 days'`,
    ]);

    return {
      favoritos:        Number(favCount[0]?.c || 0),
      favoritosNew:     Number(lastFavWeek[0]?.c || 0),
      tarefas:          Number(taskOpen[0]?.c || 0),
      tarefasAtrasadas: Number(taskOverdue[0]?.c || 0),
      tarefasNew:       Number(lastTaskWeek[0]?.c || 0),
      oportunidades:    Number(oppCount[0]?.c || 0),
      notificacoes:     Number(notifCount[0]?.c || 0),
    };
  } catch {
    return { favoritos: 0, favoritosNew: 0, tarefas: 0, tarefasAtrasadas: 0, tarefasNew: 0, oportunidades: 0, notificacoes: 0 };
  }
}

async function getDocumentosResumo(userId: string) {
  try {
    const [total, vencidos, vencendo, recentes] = await Promise.all([
      sql`SELECT COUNT(*)::int as c FROM licitacoes_habilitacoes WHERE licitacoes_habilitacao_autor = ${userId}`,
      sql`SELECT COUNT(*)::int as c FROM licitacoes_habilitacoes WHERE licitacoes_habilitacao_autor = ${userId} AND licitacoes_habilitacao_data_validade IS NOT NULL AND licitacoes_habilitacao_data_validade < CURRENT_DATE`,
      sql`SELECT COUNT(*)::int as c FROM licitacoes_habilitacoes WHERE licitacoes_habilitacao_autor = ${userId} AND licitacoes_habilitacao_data_validade IS NOT NULL AND licitacoes_habilitacao_data_validade BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
      sql`SELECT licitacoes_habilitacao_id, licitacoes_habilitacao_nome, licitacoes_habilitacao_data_validade
          FROM licitacoes_habilitacoes
          WHERE licitacoes_habilitacao_autor = ${userId}
            AND licitacoes_habilitacao_data_validade IS NOT NULL
            AND licitacoes_habilitacao_data_validade BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
          ORDER BY licitacoes_habilitacao_data_validade ASC
          LIMIT 4`,
    ]);
    return {
      total:    Number(total[0]?.c || 0),
      vencidos: Number(vencidos[0]?.c || 0),
      vencendo: Number(vencendo[0]?.c || 0),
      validos:  Number(total[0]?.c || 0) - Number(vencidos[0]?.c || 0),
      vencendoLista: recentes,
    };
  } catch {
    return { total: 0, vencidos: 0, vencendo: 0, validos: 0, vencendoLista: [] as any[] };
  }
}

async function getPipeline(empresaId: string | null) {
  try {
    if (!empresaId) return { total: 0, valorTotal: 0, byStatus: [] as { status: string; count: number }[], recentes: [] as any[] };
    const [byStatus, totalAndValue, recentes] = await Promise.all([
      sql`SELECT COALESCE(lg_situacao, 'Sem status') as status, COUNT(*)::int as count
          FROM licitacoes_gerenciadas
          WHERE lg_conta = ${empresaId}
          GROUP BY lg_situacao
          ORDER BY count DESC`,
      sql`SELECT COUNT(*)::int as total, COALESCE(SUM(lg_valor)::numeric, 0) as valor_total
          FROM licitacoes_gerenciadas
          WHERE lg_conta = ${empresaId}`,
      sql`SELECT lg_id, lg_identificador, lg_objeto, lg_orgao, lg_uf, lg_valor, lg_situacao, lg_data_abertura
          FROM licitacoes_gerenciadas
          WHERE lg_conta = ${empresaId}
          ORDER BY lg_criado_em DESC
          LIMIT 4`,
    ]);
    return {
      total:      Number(totalAndValue[0]?.total || 0),
      valorTotal: Number(totalAndValue[0]?.valor_total || 0),
      byStatus:   byStatus.map((r: any) => ({ status: r.status, count: Number(r.count) })),
      recentes,
    };
  } catch {
    return { total: 0, valorTotal: 0, byStatus: [], recentes: [] };
  }
}

async function getProximasTarefas(userId: string) {
  try {
    const rows = await sql`
      SELECT licitacoes_tarefa_id, licitacoes_tarefa_nome, licitacoes_tarefa_prazo,
             licitacoes_tarefa_prioridade, licitacoes_tarefa_licitacao_governo
      FROM licitacoes_tarefas
      WHERE licitacoes_tarefa_autor = ${userId}
        AND licitacoes_tarefa_andamento = 0
      ORDER BY
        CASE WHEN licitacoes_tarefa_prazo IS NULL THEN 1 ELSE 0 END,
        licitacoes_tarefa_prazo ASC NULLS LAST
      LIMIT 5
    `;
    return rows;
  } catch {
    return [];
  }
}

async function getOportunidadeConfig(userId: string) {
  try {
    const rows = await sql`
      SELECT licitacoes_oportunidade_tagmento, licitacoes_oportunidade_regioes
      FROM licitacoes_oportunidades
      WHERE licitacoes_oportunidade_autor = ${userId}
      ORDER BY licitacoes_oportunidade_id DESC
      LIMIT 1
    `;
    if (rows.length === 0) return { keywords: [] as string[], region: '' };
    const raw = rows[0].licitacoes_oportunidade_tagmento || '';
    let keywords: string[] = [];
    try {
      const p = JSON.parse(raw);
      keywords = Array.isArray(p) ? p.map(String).filter(Boolean) : [];
    } catch {
      keywords = String(raw).split(',').map(s => s.trim()).filter(Boolean);
    }
    return { keywords, region: rows[0].licitacoes_oportunidade_regioes || '' };
  } catch {
    return { keywords: [], region: '' };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function daysUntil(d: string | Date | null): number | null {
  if (!d) return null;
  const target = new Date(d);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function relativeDayLabel(days: number | null): string {
  if (days === null) return '—';
  if (days < 0)  return `${Math.abs(days)}d atrás`;
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days < 7)  return `Em ${days} dias`;
  return `Em ${days} dias`;
}

function priorityColor(p: string | null): { bg: string; fg: string } {
  switch ((p || '').toLowerCase()) {
    case 'urgente': return { bg: '#FEE2E2', fg: '#DC2626' };
    case 'alta':    return { bg: '#FFEDD5', fg: '#EA580C' };
    case 'média':
    case 'media':   return { bg: '#FEF3C7', fg: '#CA8A04' };
    case 'baixa':   return { bg: '#DCFCE7', fg: '#16A34A' };
    default:        return { bg: '#F1F5F9', fg: '#64748B' };
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || '0';
  const empresaId = (session?.user as any)?.empresaId || null;
  const empresaNome = (session?.user as any)?.empresaNome || null;

  // Load user config first (needed for oportunidade fetch), then everything in parallel
  const oppConfig = await getOportunidadeConfig(userId);

  const [ultimasOpp, stats, docs, pipeline, tarefas] = await Promise.all([
    getUltimasOportunidades(oppConfig.keywords, oppConfig.region),
    getStats(userId),
    getDocumentosResumo(userId),
    getPipeline(empresaId),
    getProximasTarefas(userId),
  ]);

  const firstName = session?.user?.name?.split(' ')[0] || 'Usuário';

  // ── Build alerts ─────────────────────────────────────────────────────────
  const alerts: { icon: any; text: string; tone: 'red' | 'amber' | 'blue'; href: string }[] = [];
  if (stats.tarefasAtrasadas > 0) {
    alerts.push({ icon: AlertTriangle, text: `${stats.tarefasAtrasadas} tarefa${stats.tarefasAtrasadas > 1 ? 's' : ''} atrasada${stats.tarefasAtrasadas > 1 ? 's' : ''}`, tone: 'red', href: '/dashboard/tarefas' });
  }
  if (docs.vencidos > 0) {
    alerts.push({ icon: AlertTriangle, text: `${docs.vencidos} documento${docs.vencidos > 1 ? 's' : ''} vencido${docs.vencidos > 1 ? 's' : ''}`, tone: 'red', href: '/dashboard/documentacao' });
  }
  if (docs.vencendo > 0) {
    alerts.push({ icon: Clock, text: `${docs.vencendo} documento${docs.vencendo > 1 ? 's' : ''} vence${docs.vencendo > 1 ? 'm' : ''} em até 30 dias`, tone: 'amber', href: '/dashboard/documentacao' });
  }
  if (stats.notificacoes > 0) {
    alerts.push({ icon: Bell, text: `${stats.notificacoes} notificaç${stats.notificacoes > 1 ? 'ões não lidas' : 'ão não lida'}`, tone: 'blue', href: '/dashboard/notificacoes' });
  }

  const toneStyles: Record<string, { bg: string; bd: string; fg: string }> = {
    red:   { bg: '#FEF2F2', bd: '#FECACA', fg: '#B91C1C' },
    amber: { bg: '#FFFBEB', bd: '#FDE68A', fg: '#B45309' },
    blue:  { bg: '#EFF6FF', bd: '#BFDBFE', fg: '#1D4ED8' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ╔══════════ HERO ══════════╗ */}
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          padding: '28px 32px',
          background: 'linear-gradient(135deg, #0a1175 0%, #1e2db4 60%, #2a3fd1 100%)',
          color: '#fff',
          overflow: 'hidden',
        }}
      >
        {/* decorative blobs */}
        <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,102,0,0.25) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '20%', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: '1 1 360px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>
              <Sparkles className="h-3.5 w-3.5" />
              {empresaNome ? <span style={{ fontWeight: 600 }}>{empresaNome}</span> : 'Sua plataforma de licitações'}
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              {greeting()}, {firstName}!
            </h1>
            <p style={{ marginTop: '8px', fontSize: '14px', opacity: 0.85, maxWidth: '520px', lineHeight: 1.5 }}>
              {stats.tarefas > 0 || docs.vencendo > 0
                ? `Você tem ${stats.tarefas} tarefa${stats.tarefas !== 1 ? 's' : ''} aberta${stats.tarefas !== 1 ? 's' : ''}${docs.vencendo > 0 ? ` e ${docs.vencendo} documento${docs.vencendo !== 1 ? 's' : ''} vencendo em breve` : ''}.`
                : 'Tudo sob controle por aqui. Aproveite para descobrir novas oportunidades.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/dashboard/licitacoes" style={{
              backgroundColor: '#FF6600', color: '#fff', height: '46px',
              padding: '0 22px', borderRadius: '10px',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              boxShadow: '0 6px 18px rgba(255,102,0,0.35)',
            }}>
              <Search className="h-4 w-4" /> Buscar Licitações
            </Link>
            <Link href="/dashboard/oportunidades" style={{
              backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', height: '46px',
              padding: '0 18px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              backdropFilter: 'blur(8px)',
            }}>
              <Target className="h-4 w-4" /> Oportunidades
            </Link>
          </div>
        </div>
      </div>

      {/* ╔══════════ ALERT BAR ══════════╗ */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {alerts.map((a, i) => {
            const t = toneStyles[a.tone];
            const Icon = a.icon;
            return (
              <Link key={i} href={a.href} style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                backgroundColor: t.bg, border: `1px solid ${t.bd}`, color: t.fg,
                padding: '8px 14px', borderRadius: '10px', textDecoration: 'none',
                fontSize: '13px', fontWeight: 600,
                transition: 'transform 0.15s',
              }}>
                <Icon className="h-4 w-4" />
                {a.text}
                <ArrowUpRight className="h-3.5 w-3.5" style={{ marginLeft: '2px' }} />
              </Link>
            );
          })}
        </div>
      )}

      {/* ╔══════════ KPI CARDS ══════════╗ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <KPICard
          icon={Target} iconColor="#FF6600" iconBg="#FFF3E8"
          label="Oportunidades ativas"
          value={oppConfig.keywords.length}
          unit={oppConfig.keywords.length === 1 ? 'palavra-chave' : 'palavras-chave'}
          trend={oppConfig.keywords.length > 0 ? { text: oppConfig.keywords.slice(0, 2).join(', ') + (oppConfig.keywords.length > 2 ? ` +${oppConfig.keywords.length - 2}` : ''), tone: 'neutral' } : undefined}
          href="/dashboard/oportunidades"
        />
        <KPICard
          icon={Briefcase} iconColor="#1D4ED8" iconBg="#DBEAFE"
          label="Pipeline gerenciado"
          value={pipeline.total}
          unit={pipeline.total === 1 ? 'licitação' : 'licitações'}
          trend={pipeline.valorTotal > 0 ? { text: formatCurrency(pipeline.valorTotal), tone: 'positive' } : undefined}
          href="/dashboard/minhas-licitacoes"
        />
        <KPICard
          icon={FolderOpen} iconColor={docs.vencendo > 0 ? '#EA580C' : '#16A34A'} iconBg={docs.vencendo > 0 ? '#FFEDD5' : '#DCFCE7'}
          label="Documentos"
          value={docs.total}
          unit={docs.total === 1 ? 'cadastrado' : 'cadastrados'}
          trend={
            docs.vencidos > 0
              ? { text: `${docs.vencidos} vencido${docs.vencidos > 1 ? 's' : ''}`, tone: 'negative' }
              : docs.vencendo > 0
              ? { text: `${docs.vencendo} vencendo`, tone: 'warning' }
              : docs.total > 0 ? { text: 'Todos válidos', tone: 'positive' } : undefined
          }
          href="/dashboard/documentacao"
        />
        <KPICard
          icon={CheckCircle2} iconColor={stats.tarefasAtrasadas > 0 ? '#DC2626' : '#0A1175'} iconBg={stats.tarefasAtrasadas > 0 ? '#FEE2E2' : '#EEF0FF'}
          label="Tarefas abertas"
          value={stats.tarefas}
          unit={stats.tarefas === 1 ? 'pendente' : 'pendentes'}
          trend={
            stats.tarefasAtrasadas > 0
              ? { text: `${stats.tarefasAtrasadas} atrasada${stats.tarefasAtrasadas > 1 ? 's' : ''}`, tone: 'negative' }
              : stats.tarefasNew > 0
              ? { text: `+${stats.tarefasNew} esta semana`, tone: 'neutral' } : undefined
          }
          href="/dashboard/tarefas"
        />
      </div>

      {/* ╔══════════ MAIN GRID (left 2/3, right 1/3) ══════════╗ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '20px' }} className="dashboard-main-grid">

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

          {/* Pipeline */}
          <Card title="Pipeline de licitações" icon={Briefcase} href="/dashboard/minhas-licitacoes" linkLabel="Gerenciar">
            {pipeline.total === 0 ? (
              <EmptyBlock
                icon={Briefcase}
                title="Você ainda não gerencia nenhuma licitação"
                desc="Adicione licitações ao seu pipeline para acompanhar prazos, anotações e documentos."
                cta={{ href: '/dashboard/licitacoes', label: 'Buscar licitações' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Status breakdown */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#7B7B7B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Valor total acompanhado</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#0a1175', marginTop: '2px' }}>{formatCurrency(pipeline.valorTotal)}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#7B7B7B' }}>
                      {pipeline.total} {pipeline.total === 1 ? 'licitação' : 'licitações'} no total
                    </div>
                  </div>
                  {/* Stacked bar */}
                  <PipelineBar items={pipeline.byStatus} total={pipeline.total} />
                </div>

                {/* Recent gerenciadas */}
                {pipeline.recentes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F0F0F0', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12px', color: '#7B7B7B', fontWeight: 700, marginBottom: '4px' }}>Adicionadas recentemente</div>
                    {pipeline.recentes.map((r: any) => (
                      <Link
                        key={r.lg_id}
                        href={`/dashboard/licitacoes/gerenciar/${encodeURIComponent(r.lg_identificador)}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 12px', borderRadius: '10px',
                          backgroundColor: '#FAFAFA', textDecoration: 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 className="h-4 w-4" style={{ color: '#0a1175' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#262E3A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.lg_objeto || r.lg_identificador}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#7B7B7B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.lg_orgao}{r.lg_uf ? ` · ${r.lg_uf}` : ''}
                          </div>
                        </div>
                        {r.lg_valor && (
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0a1175', flexShrink: 0 }}>
                            {formatCurrency(Number(r.lg_valor))}
                          </div>
                        )}
                        <ChevronRight className="h-4 w-4" style={{ color: '#9B9B9B', flexShrink: 0 }} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Últimas oportunidades (filtradas pelas keywords do usuário) */}
          <Card title="Últimas oportunidades" icon={Target} href="/dashboard/oportunidades" linkLabel="Ver todas">
            {oppConfig.keywords.length === 0 ? (
              <EmptyBlock
                icon={Target}
                title="Configure suas oportunidades"
                desc="Defina palavras-chave do seu segmento para receber automaticamente licitações relevantes ao seu negócio."
                cta={{ href: '/dashboard/oportunidades', label: 'Definir oportunidades' }}
              />
            ) : ultimasOpp.length === 0 ? (
              <EmptyBlock
                icon={Target}
                title="Nenhuma oportunidade nos últimos 30 dias"
                desc="Tente ampliar suas palavras-chave ou aumentar a região para receber mais resultados."
                cta={{ href: '/dashboard/oportunidades', label: 'Ajustar filtros' }}
              />
            ) : (
              <>
                {/* Keywords/region preview chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px dashed #F0F0F0' }}>
                  <span style={{ fontSize: '11.5px', color: '#7B7B7B', fontWeight: 600, marginRight: '4px', alignSelf: 'center' }}>Filtrando por:</span>
                  {oppConfig.keywords.slice(0, 4).map(kw => (
                    <span key={kw} style={{ backgroundColor: '#0a1175', color: '#fff', fontSize: '10.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px' }}>
                      {kw}
                    </span>
                  ))}
                  {oppConfig.keywords.length > 4 && (
                    <span style={{ fontSize: '10.5px', color: '#7B7B7B', fontWeight: 700, alignSelf: 'center' }}>
                      +{oppConfig.keywords.length - 4}
                    </span>
                  )}
                  {oppConfig.region && (
                    <span style={{ backgroundColor: '#FF6600', color: '#fff', fontSize: '10.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      📍 {oppConfig.region.replace(':', ' - ')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {ultimasOpp.map((l, idx) => {
                    const pubDate = l.dataPublicacaoPncp ? new Date(l.dataPublicacaoPncp) : null;
                    const days = pubDate ? daysUntil(pubDate) : null;
                    const ago = days !== null ? Math.abs(days) : null;
                    const recencyLabel = ago === null ? '' : ago === 0 ? 'Hoje' : ago === 1 ? 'Ontem' : `Há ${ago}d`;
                    return (
                      <Link
                        key={l.numeroControlePNCP}
                        href={`/dashboard/licitacoes/${encodeURIComponent(l.numeroControlePNCP)}`}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '14px',
                          padding: '14px 0', textDecoration: 'none',
                          borderBottom: idx < ultimasOpp.length - 1 ? '1px solid #F5F5F5' : 'none',
                        }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFF3E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Target className="h-4 w-4" style={{ color: '#FF6600' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#262E3A', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {l.objetoCompra}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11.5px', color: '#7B7B7B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                              {l.unidadeOrgao?.municipioNome} · {l.unidadeOrgao?.ufSigla}
                            </span>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#0a1175', backgroundColor: '#EEF0FF', padding: '2px 8px', borderRadius: '6px' }}>
                              {l.modalidadeNome}
                            </span>
                            {recencyLabel && (
                              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Clock className="h-3 w-3" /> {recencyLabel}
                              </span>
                            )}
                          </div>
                        </div>
                        {l.valorTotalEstimado && l.valorTotalEstimado > 0 ? (
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0a1175' }}>
                              {formatCurrency(l.valorTotalEstimado)}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#9B9B9B', fontWeight: 600, marginTop: '1px' }}>
                              valor estimado
                            </div>
                          </div>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

          {/* Próximas tarefas */}
          <Card title="Próximas tarefas" icon={CheckCircle2} href="/dashboard/tarefas" linkLabel="Ver todas">
            {tarefas.length === 0 ? (
              <EmptyBlock
                icon={CheckCircle2}
                title="Tudo em dia!"
                desc="Você não tem tarefas pendentes."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tarefas.map((t: any) => {
                  const days = daysUntil(t.licitacoes_tarefa_prazo);
                  const overdue = days !== null && days < 0;
                  const soon = days !== null && days >= 0 && days <= 2;
                  const prio = priorityColor(t.licitacoes_tarefa_prioridade);
                  return (
                    <div key={t.licitacoes_tarefa_id}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '10px', backgroundColor: overdue ? '#FEF2F2' : '#FAFAFA', border: overdue ? '1px solid #FECACA' : '1px solid #F0F0F0' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: prio.fg, marginTop: '6px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#262E3A', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.licitacoes_tarefa_nome}>
                          {t.licitacoes_tarefa_nome}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: prio.fg, backgroundColor: prio.bg, padding: '1px 7px', borderRadius: '4px' }}>
                            {t.licitacoes_tarefa_prioridade || 'Sem prioridade'}
                          </span>
                          {t.licitacoes_tarefa_prazo && (
                            <span style={{ fontSize: '11px', color: overdue ? '#DC2626' : soon ? '#EA580C' : '#7B7B7B', fontWeight: overdue ? 700 : 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Clock className="h-3 w-3" /> {relativeDayLabel(days)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Documentos resumo */}
          <Card title="Documentação" icon={FolderOpen} href="/dashboard/documentacao" linkLabel="Gerenciar">
            {docs.total === 0 ? (
              <EmptyBlock
                icon={FolderOpen}
                title="Sem documentos cadastrados"
                desc="Cadastre certidões e habilitações para vincular às suas licitações."
                cta={{ href: '/dashboard/documentacao', label: 'Adicionar documento' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Mini stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <MiniStat value={docs.validos - docs.vencendo} label="Válidos" color="#16A34A" />
                  <MiniStat value={docs.vencendo}              label="Vencendo" color="#EA580C" />
                  <MiniStat value={docs.vencidos}              label="Vencidos" color="#DC2626" />
                </div>

                {/* Vencendo list */}
                {docs.vencendoLista.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #F0F0F0', paddingTop: '12px' }}>
                    <div style={{ fontSize: '11.5px', color: '#7B7B7B', fontWeight: 700, marginBottom: '4px' }}>Próximos vencimentos</div>
                    {docs.vencendoLista.map((d: any) => {
                      const days = daysUntil(d.licitacoes_habilitacao_data_validade);
                      const urgent = days !== null && days <= 7;
                      return (
                        <div key={d.licitacoes_habilitacao_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                          <FileText className="h-3.5 w-3.5" style={{ color: urgent ? '#DC2626' : '#7B7B7B', flexShrink: 0 }} />
                          <span style={{ fontSize: '12.5px', color: '#262E3A', fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.licitacoes_habilitacao_nome}>
                            {d.licitacoes_habilitacao_nome}
                          </span>
                          <span style={{ fontSize: '11px', color: urgent ? '#DC2626' : '#7B7B7B', fontWeight: 700, flexShrink: 0 }}>
                            {relativeDayLabel(days)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Atalhos rápidos */}
          <Card title="Atalhos rápidos" icon={Sparkles}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <QuickAction href="/dashboard/licitacoes"      icon={Search}     label="Buscar"       color="#FF6600" />
              <QuickAction href="/dashboard/oportunidades"   icon={Target}     label="Oportunidades" color="#16A34A" />
              <QuickAction href="/dashboard/documentacao"    icon={FolderOpen} label="Documentos"   color="#0A1175" />
              <QuickAction href="/dashboard/declaracoes"     icon={FileText}   label="Declarações"  color="#EA580C" />
              <QuickAction href="/dashboard/favoritos"       icon={Star}       label="Favoritos"    color="#CA8A04" />
              <QuickAction href="/dashboard/notificacoes"    icon={Bell}       label="Notificações" color="#DC2626" badge={stats.notificacoes} />
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile: collapse to single column */}
      <style>{`
        @media (max-width: 980px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Reusable atoms ────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, href, linkLabel, children }: {
  title: string; icon: any; href?: string; linkLabel?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '14px',
      border: '1px solid #EEF0F4', boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid #F5F5F5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: '#F5F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon className="h-4 w-4" style={{ color: '#0A1175' }} />
          </div>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#262E3A', margin: 0 }}>{title}</h3>
        </div>
        {href && linkLabel && (
          <Link href={href} style={{
            fontSize: '12.5px', fontWeight: 700, color: '#0A1175',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px',
          }}>
            {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

function KPICard({ icon: Icon, iconColor, iconBg, label, value, unit, trend, href }: {
  icon: any; iconColor: string; iconBg: string;
  label: string; value: number; unit?: string;
  trend?: { text: string; tone: 'positive' | 'negative' | 'warning' | 'neutral' };
  href: string;
}) {
  const toneFg: Record<string, string> = {
    positive: '#16A34A', negative: '#DC2626', warning: '#EA580C', neutral: '#7B7B7B',
  };
  return (
    <Link href={href} style={{
      backgroundColor: '#fff', borderRadius: '14px',
      border: '1px solid #EEF0F4', padding: '16px 18px',
      boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
      display: 'flex', flexDirection: 'column', gap: '8px',
      textDecoration: 'none', transition: 'all 0.15s',
      minHeight: '120px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <ArrowUpRight className="h-4 w-4" style={{ color: '#C0C0C0' }} />
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#7B7B7B', fontWeight: 600 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{value}</span>
          {unit && <span style={{ fontSize: '12px', color: '#7B7B7B', fontWeight: 600 }}>{unit}</span>}
        </div>
      </div>
      {trend && (
        <div style={{ fontSize: '11.5px', fontWeight: 700, color: toneFg[trend.tone], display: 'flex', alignItems: 'center', gap: '3px', marginTop: 'auto' }}>
          {trend.tone === 'positive' && <TrendingUp className="h-3 w-3" />}
          {trend.tone === 'warning' && <Clock className="h-3 w-3" />}
          {trend.tone === 'negative' && <AlertTriangle className="h-3 w-3" />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trend.text}</span>
        </div>
      )}
    </Link>
  );
}

function PipelineBar({ items, total }: { items: { status: string; count: number }[]; total: number }) {
  const palette = ['#0A1175', '#FF6600', '#16A34A', '#0EA5E9', '#A855F7', '#CA8A04'];
  if (total === 0 || items.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', height: '12px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F0F0F0' }}>
        {items.map((it, i) => (
          <div key={i} title={`${it.status}: ${it.count}`}
            style={{ width: `${(it.count / total) * 100}%`, backgroundColor: palette[i % palette.length] }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: palette[i % palette.length] }} />
            <span style={{ fontSize: '11.5px', color: '#262E3A', fontWeight: 600 }}>{it.status}</span>
            <span style={{ fontSize: '11.5px', color: '#7B7B7B', fontWeight: 700 }}>{it.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      backgroundColor: '#FAFAFA', borderRadius: '10px',
      padding: '10px 8px', textAlign: 'center', border: '1px solid #F0F0F0',
    }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10.5px', color: '#7B7B7B', fontWeight: 600, marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, color, badge }: {
  href: string; icon: any; label: string; color: string; badge?: number;
}) {
  return (
    <Link href={href} style={{
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '12px 10px', borderRadius: '10px',
      backgroundColor: '#FAFAFA', border: '1px solid #F0F0F0',
      textDecoration: 'none', transition: 'all 0.15s',
    }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#262E3A' }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          position: 'absolute', top: '6px', right: '6px',
          backgroundColor: color, color: '#fff',
          fontSize: '10px', fontWeight: 800,
          padding: '1px 6px', borderRadius: '8px', minWidth: '18px',
          textAlign: 'center', lineHeight: '14px',
        }}>{badge}</span>
      )}
    </Link>
  );
}

function EmptyBlock({ icon: Icon, title, desc, cta }: {
  icon: any; title: string; desc: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 12px', color: '#7B7B7B' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#F5F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
        <Icon className="h-5 w-5" style={{ color: '#0A1175' }} />
      </div>
      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#262E3A', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '12.5px', color: '#7B7B7B', maxWidth: '320px', margin: '0 auto', lineHeight: 1.5 }}>{desc}</div>
      {cta && (
        <Link href={cta.href} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          marginTop: '12px', backgroundColor: '#FF6600', color: '#fff',
          padding: '8px 16px', borderRadius: '8px',
          fontSize: '12.5px', fontWeight: 700, textDecoration: 'none',
        }}>
          <Plus className="h-3.5 w-3.5" /> {cta.label}
        </Link>
      )}
    </div>
  );
}
