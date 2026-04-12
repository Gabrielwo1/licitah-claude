'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Star, ExternalLink, MapPin, Calendar, Building2, FileText, Loader2, Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Licitacao, LicitacaoItem, Anotacao, Tarefa } from '@/lib/types';

type StatusVariant = 'aberto' | 'fechado' | 'publicado' | 'suspensa' | 'cancelada' | 'default';

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
          setItems(d.items || []);
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
          {licitacao?.linkSistemaOrigem && (
            <a href={licitacao.linkSistemaOrigem} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
                Portal oficial
              </Button>
            </a>
          )}
        </div>
      </div>

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
      {items.length > 0 && (
        <div
          className="bg-white rounded-[10px]"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <div
            className="px-6 py-4 font-bold text-base"
            style={{ borderBottom: '1px solid #F0F0F0', color: '#262E3A' }}
          >
            Itens da Licitação ({items.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: '#F6F5FA' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#7B7B7B' }}>#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#7B7B7B' }}>Descrição</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: '#7B7B7B' }}>Qtd</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: '#7B7B7B' }}>Valor Unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: '#7B7B7B' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: i < items.length - 1 ? '1px solid #F0F0F0' : 'none' }}
                  >
                    <td className="px-4 py-3" style={{ color: '#7B7B7B' }}>{item.numeroItem || i + 1}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#262E3A' }}>{item.descricao}</td>
                    <td className="px-4 py-3 text-right" style={{ color: '#7B7B7B' }}>{item.quantidade} {item.unidadeMedida}</td>
                    <td className="px-4 py-3 text-right" style={{ color: '#7B7B7B' }}>{formatCurrency(item.valorUnitarioEstimado)}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: '#0a1175' }}>{formatCurrency(item.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    </div>
  );
}
