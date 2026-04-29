'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Star, ExternalLink, MapPin, Calendar, Building2, FileText, Loader2, Plus, CheckSquare, Sparkles, MessageCircle } from 'lucide-react';
import AIResumoModal from '@/components/ai/AIResumoModal';
import AIPerguntarModal from '@/components/ai/AIPerguntarModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Licitacao, LicitacaoItem, Anotacao, Tarefa } from '@/lib/types';

type StatusVariant = 'aberto' | 'fechado' | 'publicado' | 'suspensa' | 'cancelada' | 'default';

function buildPncpUrl(id: string): string {
  try {
    const parts = id.split('-');
    const cnpj = parts[0];
    const last = parts[parts.length - 1];
    const [seqStr, ano] = last.split('/');
    const sequencial = parseInt(seqStr, 10);
    return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${sequencial}`;
  } catch {
    return '#';
  }
}

function getStatusVariant(situacaoId: number, nome: string): StatusVariant {
  const lower = nome?.toLowerCase() || '';
  if (lower.includes('divulg') || lower.includes('aberta') || lower.includes('aberto')) return 'aberto';
  if (lower.includes('encerr') || lower.includes('fechad')) return 'fechado';
  if (lower.includes('publicad')) return 'publicado';
  if (lower.includes('suspens')) return 'suspensa';
  if (lower.includes('cancel')) return 'cancelada';
  if (situacaoId === 1) return 'aberto';
  if (situacaoId === 2) return 'fechado';
  if (situacaoId === 3) return 'suspensa';
  return 'default';
}

export default function LicitacaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = decodeURIComponent(params.id as string);

  const [licitacao, setLicitacao] = useState<Licitacao | null>(null);
  const [items, setItems] = useState<LicitacaoItem[]>([]);
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [novaTarefa, setNovaTarefa] = useState({ nome: '', prazo: '' });
  const [anotacaoLoading, setAnotacaoLoading] = useState(false);
  const [tarefaLoading, setTarefaLoading] = useState(false);
  const [tarefaOpen, setTarefaOpen] = useState(false);
  const [aiResumoOpen, setAiResumoOpen] = useState(false);
  const [aiPerguntarOpen, setAiPerguntarOpen] = useState(false);

  useEffect(() => {
    // Auto-open tarefa dialog if coming from "Criar tarefa" button
    if (searchParams.get('criar_tarefa') === '1') {
      setTarefaOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [detailRes, anotacoesRes, tarefasRes, favRes] = await Promise.all([
          fetch(`/api/licitacoes/${encodeURIComponent(id)}`),
          fetch(`/api/anotacoes/${encodeURIComponent(id)}`),
          fetch('/api/tarefas'),
          fetch('/api/favoritos'),
        ]);

        if (detailRes.ok) {
          const d = await detailRes.json();
          if (d.licitacao) setLicitacao(d.licitacao);
          const fetchedItems = d.items || [];
          setItems(fetchedItems);
          // Salva itens no localStorage para o ItensTab do gerenciar usar
          if (fetchedItems.length > 0) {
            try {
              localStorage.setItem(`pncp_itens:${id}`, JSON.stringify({ data: fetchedItems, ts: Date.now() }));
            } catch {}
          }
        }
        if (anotacoesRes.ok) {
          setAnotacoes(await anotacoesRes.json());
        }
        if (tarefasRes.ok) {
          const all: Tarefa[] = await tarefasRes.json();
          setTarefas(all.filter(t => t.licitacoes_tarefa_licitacao_governo === id));
        }
        if (favRes.ok) {
          const favs = await favRes.json();
          setIsFavorite(favs.some((f: any) => f.favorito_identificador === id));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function toggleFavorite() {
    setFavLoading(true);
    try {
      const res = await fetch('/api/favoritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: id, modulo: 'licitacao' }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFavorite(data.favorited);
      }
    } finally {
      setFavLoading(false);
    }
  }

  async function submitAnotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAnotacao.trim()) return;
    setAnotacaoLoading(true);
    try {
      const res = await fetch('/api/anotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: novaAnotacao, licitacaoGoverno: id }),
      });
      if (res.ok) {
        const nova = await res.json();
        setAnotacoes(prev => [nova, ...prev]);
        setNovaAnotacao('');
      }
    } finally {
      setAnotacaoLoading(false);
    }
  }

  async function submitTarefa(e: React.FormEvent) {
    e.preventDefault();
    if (!novaTarefa.nome.trim()) return;
    setTarefaLoading(true);
    try {
      const res = await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaTarefa.nome, prazo: novaTarefa.prazo, licitacaoGoverno: id }),
      });
      if (res.ok) {
        const nova = await res.json();
        setTarefas(prev => [nova, ...prev]);
        setNovaTarefa({ nome: '', prazo: '' });
        setTarefaOpen(false);
      }
    } finally {
      setTarefaLoading(false);
    }
  }

  async function concluirTarefa(tarefaId: number) {
    const res = await fetch(`/api/tarefas/${tarefaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 1 }),
    });
    if (res.ok) {
      setTarefas(prev => prev.map(t => t.licitacoes_tarefa_id === tarefaId ? { ...t, licitacoes_tarefa_status: 1 } : t));
    }
  }

  const statusVariant = licitacao ? getStatusVariant(licitacao.situacaoCompraId, licitacao.situacaoCompraNome) : 'default';

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-semibold transition-colors"
          style={{ color: '#7B7B7B' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#262E3A')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7B7B7B')}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFavorite}
            disabled={favLoading}
            className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md border transition-colors"
            style={
              isFavorite
                ? { borderColor: '#FF6600', color: '#FF6600', backgroundColor: '#FFF5EE' }
                : { borderColor: '#D3D3D3', color: '#7B7B7B', backgroundColor: '#fff' }
            }
          >
            <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </button>
          <a href={buildPncpUrl(id)} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5" />
              Consultar edital
            </Button>
          </a>
        </div>
      </div>

      {/* ── AI Actions row ── */}
      {licitacao && (
        <div style={{
          backgroundColor: '#fff', borderRadius: '12px', padding: '14px 18px',
          border: '1px solid #EEF0F4', boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', minWidth: 0 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, #4F46E5 0%, #A855F7 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles className="h-4 w-4" style={{ color: '#fff' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#262E3A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Ações com IA
                <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#EDE9FE', color: '#7C3AED', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>BETA</span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#7B7B7B' }}>
                Use IA para resumir o edital ou tirar dúvidas em tempo real.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setAiResumoOpen(true)}
              style={{
                height: '38px', padding: '0 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #A855F7 100%)',
                color: '#fff', fontSize: '13px', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(124,58,237,0.35)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(124,58,237,0.25)'; }}
            >
              <Sparkles className="h-4 w-4" /> Resumo do Edital
            </button>
            <button
              onClick={() => setAiPerguntarOpen(true)}
              style={{
                height: '38px', padding: '0 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #0EA5E9 0%, #0891B2 50%, #0E7490 100%)',
                color: '#fff', fontSize: '13px', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                boxShadow: '0 2px 8px rgba(14,165,233,0.25)',
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(14,165,233,0.35)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(14,165,233,0.25)'; }}
            >
              <MessageCircle className="h-4 w-4" /> Pergunte ao Edital
            </button>
          </div>
        </div>
      )}

      {loading && !licitacao && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#0a1175' }} />
        </div>
      )}

      {/* Main info card */}
      {licitacao && (
        <div
          className="bg-white rounded-[10px] p-6 space-y-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Badge variant={statusVariant as any}>{licitacao.situacaoCompraNome}</Badge>
              <Badge variant="outline">{licitacao.modalidadeNome}</Badge>
            </div>
            <p className="text-xs font-mono" style={{ color: '#7B7B7B' }}>{licitacao.numeroControlePNCP}</p>
          </div>

          <h1 className="text-xl font-bold leading-snug" style={{ color: '#262E3A' }}>
            {licitacao.objetoCompra}
          </h1>

          {licitacao.valorTotalEstimado && licitacao.valorTotalEstimado > 0 && (
            <p className="text-2xl font-bold" style={{ color: '#0a1175' }}>
              {formatCurrency(licitacao.valorTotalEstimado)}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#7B7B7B' }} />
              <div>
                <p className="font-medium" style={{ color: '#262E3A' }}>{licitacao.orgaoEntidade?.razaoSocial}</p>
                <p className="text-xs" style={{ color: '#7B7B7B' }}>CNPJ: {licitacao.orgaoEntidade?.cnpj}</p>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{ color: '#7B7B7B' }}>
              <MapPin className="h-4 w-4 shrink-0" style={{ color: '#0a1175' }} />
              {licitacao.unidadeOrgao?.municipioNome}, {licitacao.unidadeOrgao?.ufNome}
            </div>
            <div className="flex items-center gap-2" style={{ color: '#7B7B7B' }}>
              <Calendar className="h-4 w-4 shrink-0" style={{ color: '#0a1175' }} />
              <span>Publicação: {formatDate(licitacao.dataPublicacaoPncp)}</span>
            </div>
            {licitacao.dataAberturaProposta && (
              <div className="flex items-center gap-2" style={{ color: '#7B7B7B' }}>
                <Calendar className="h-4 w-4 shrink-0" style={{ color: '#259F46' }} />
                <span>Abertura: {formatDate(licitacao.dataAberturaProposta)}</span>
              </div>
            )}
            {licitacao.dataEncerramentoProposta && (
              <div className="flex items-center gap-2" style={{ color: '#7B7B7B' }}>
                <Calendar className="h-4 w-4 shrink-0" style={{ color: '#FF6600' }} />
                <span>Encerramento: {formatDate(licitacao.dataEncerramentoProposta)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      {items.length > 0 && <ItensTable items={items} />}

      {/* Tarefas */}
      <div
        className="bg-white rounded-[10px]"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <h2 className="font-bold text-base flex items-center gap-2" style={{ color: '#262E3A' }}>
            <CheckSquare className="h-4 w-4" style={{ color: '#0a1175' }} />
            Tarefas ({tarefas.length})
          </h2>
          <Dialog open={tarefaOpen} onOpenChange={setTarefaOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="orange-outline">
                <Plus className="h-3.5 w-3.5" />
                Nova tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitTarefa} className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input
                    placeholder="Descreva a tarefa..."
                    value={novaTarefa.nome}
                    onChange={(e) => setNovaTarefa(p => ({ ...p, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={novaTarefa.prazo}
                    onChange={(e) => setNovaTarefa(p => ({ ...p, prazo: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full" loading={tarefaLoading} variant="padrao">
                  Criar tarefa
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="p-6">
          {tarefas.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#7B7B7B' }}>
              Nenhuma tarefa criada para esta licitação.
            </p>
          ) : (
            <div className="space-y-2">
              {tarefas.map((t) => (
                <div
                  key={t.licitacoes_tarefa_id}
                  className="flex items-center justify-between p-3 rounded-[8px]"
                  style={{ backgroundColor: '#F6F5FA' }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => t.licitacoes_tarefa_status === 0 && concluirTarefa(t.licitacoes_tarefa_id)}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0"
                      style={
                        t.licitacoes_tarefa_status === 1
                          ? { backgroundColor: '#32CD32', borderColor: '#32CD32', color: '#fff' }
                          : { borderColor: '#D3D3D3', backgroundColor: '#fff' }
                      }
                    >
                      {t.licitacoes_tarefa_status === 1 && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: t.licitacoes_tarefa_status === 1 ? '#7B7B7B' : '#262E3A',
                        textDecoration: t.licitacoes_tarefa_status === 1 ? 'line-through' : 'none',
                      }}
                    >
                      {t.licitacoes_tarefa_nome}
                    </span>
                  </div>
                  {t.licitacoes_tarefa_prazo && (
                    <span className="text-xs" style={{ color: '#7B7B7B' }}>
                      {formatDate(t.licitacoes_tarefa_prazo)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Anotações */}
      <div
        className="bg-white rounded-[10px]"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        <div
          className="px-6 py-4 font-bold text-base flex items-center gap-2"
          style={{ borderBottom: '1px solid #F0F0F0', color: '#262E3A' }}
        >
          <FileText className="h-4 w-4" style={{ color: '#0a1175' }} />
          Anotações ({anotacoes.length})
        </div>
        <div className="p-6 space-y-4">
          <form onSubmit={submitAnotacao} className="flex gap-2">
            <Input
              placeholder="Adicionar anotação..."
              value={novaAnotacao}
              onChange={(e) => setNovaAnotacao(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" loading={anotacaoLoading} size="sm" variant="padrao">
              Salvar
            </Button>
          </form>

          {anotacoes.length === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: '#7B7B7B' }}>
              Nenhuma anotação ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {anotacoes.map((a) => (
                <div
                  key={a.licitacoes_anotacao_id}
                  className="p-3 rounded-[8px]"
                  style={{ backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7' }}
                >
                  <p className="text-sm" style={{ color: '#262E3A' }}>{a.licitacoes_anotacao_texto}</p>
                  <p className="text-xs mt-1" style={{ color: '#7B7B7B' }}>
                    {(a as any).autor_nome || 'Usuário'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Modals */}
      {licitacao && (
        <>
          <AIResumoModal
            open={aiResumoOpen}
            onClose={() => setAiResumoOpen(false)}
            licitacaoId={id}
            licitacao={licitacao}
            items={items}
          />
          <AIPerguntarModal
            open={aiPerguntarOpen}
            onClose={() => setAiPerguntarOpen(false)}
            licitacaoId={id}
            licitacao={licitacao}
            items={items}
          />
        </>
      )}
    </div>
  );
}

// ─── Tabela de Itens estilo PNCP ─────────────────────────────────────────────

const ITENS_PAGE_SIZES_DETAIL = [5, 10, 20, 50];

function ItensTable({ items }: { items: LicitacaoItem[] }) {
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [detalhe, setDetalhe] = useState<LicitacaoItem | null>(null);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, items.length);
  const slice = items.slice(start, end);

  const thSt: React.CSSProperties = {
    padding: '10px 14px', fontSize: '13px', fontWeight: 700,
    color: '#1a237e', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const tdSt: React.CSSProperties = {
    padding: '12px 14px', fontSize: '13px', color: '#262E3A',
    borderBottom: '1px solid #EBEBEB', verticalAlign: 'top',
  };
  const selSt: React.CSSProperties = {
    border: '1px solid #D0D0D0', borderRadius: '4px', padding: '3px 24px 3px 8px',
    fontSize: '13px', cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%237B7B7B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
  };
  const navBtn = (disabled: boolean): React.CSSProperties => ({
    border: '1px solid #D0D0D0', borderRadius: '4px', padding: '4px 8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: '#fff', color: disabled ? '#CFCFCF' : '#1a237e',
    fontWeight: 700, fontSize: '14px', lineHeight: '1',
  });

  return (
    <>
      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDetalhe(null)}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '560px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontWeight: 800, fontSize: '16px', color: '#1a237e' }}>Item #{detalhe.numeroItem}</span>
              <button onClick={() => setDetalhe(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            {([
              ['Descrição', detalhe.descricao],
              ['Quantidade', detalhe.quantidade != null ? `${Number(detalhe.quantidade).toLocaleString('pt-BR')} ${detalhe.unidadeMedida || ''}` : '—'],
              ['Valor unitário estimado', detalhe.valorUnitarioEstimado != null ? formatCurrency(detalhe.valorUnitarioEstimado) : '—'],
              ['Valor total estimado', detalhe.valorTotal != null ? formatCurrency(detalhe.valorTotal) : '—'],
            ] as [string, string | null | undefined][]).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #F0F0F0' }}>
                <span style={{ fontSize: '13px', color: '#7B7B7B', minWidth: '200px', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '13px', color: '#262E3A', fontWeight: 500 }}>{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[10px]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#F5F5F5', borderBottom: '2px solid #E0E0E0' }}>
              <tr>
                {[
                  { label: 'Número', w: '90px' },
                  { label: 'Descrição', w: 'auto' },
                  { label: 'Quantidade', w: '110px' },
                  { label: 'Valor unitário estimado', w: '170px' },
                  { label: 'Valor total estimado', w: '160px' },
                  { label: 'Detalhar', w: '80px' },
                ].map(({ label, w }) => (
                  <th key={label} style={{ ...thSt, width: w }}>
                    {label} <span style={{ fontSize: '10px', color: '#9e9e9e' }}>↕</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: '#fff' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#F9F9FF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#fff'}>
                  <td style={tdSt}>{item.numeroItem || idx + 1}</td>
                  <td style={{ ...tdSt, maxWidth: '380px' }}>
                    <span title={item.descricao || ''} style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                      {item.descricao || '—'}
                    </span>
                  </td>
                  <td style={tdSt}>{item.quantidade != null ? `${Number(item.quantidade).toLocaleString('pt-BR')} ${item.unidadeMedida || ''}` : '—'}</td>
                  <td style={tdSt}>{item.valorUnitarioEstimado != null ? formatCurrency(item.valorUnitarioEstimado) : '—'}</td>
                  <td style={{ ...tdSt, fontWeight: 600 }}>{item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}</td>
                  <td style={{ ...tdSt, textAlign: 'center' }}>
                    <button onClick={() => setDetalhe(item)} title="Ver detalhes"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a237e', padding: '4px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer paginação */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #E0E0E0', backgroundColor: '#FAFAFA', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#262E3A' }}>
            <span>Exibir:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} style={selSt}>
              {ITENS_PAGE_SIZES_DETAIL.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ color: '#7B7B7B' }}>
              {items.length === 0 ? '0 itens' : `${start + 1}-${end} de ${items.length} itens`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#262E3A' }}>
            <span>Página:</span>
            <select value={safePage} onChange={e => setPage(Number(e.target.value))} style={selSt}>
              {Array.from({ length: totalPages }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} style={navBtn(safePage <= 1)}>‹</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={navBtn(safePage >= totalPages)}>›</button>
          </div>
        </div>
      </div>
    </>
  );
}
