'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, ExternalLink, MapPin, Calendar, Building2, FileText, Loader2, Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Licitacao, LicitacaoItem, Anotacao, Tarefa } from '@/lib/types';

// We need a server-side way to get licitação data — use client-side fetch from API
async function fetchFromGovAPI(id: string): Promise<Licitacao | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 86400000).toISOString().split('T')[0];
    const res = await fetch(
      `/api/licitacoes?pagina=1&tamanhoPagina=500&dataInicial=${threeYearsAgo}&dataFinal=${today}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data || []).find((l: Licitacao) => l.numeroControlePNCP === id) || null;
  } catch {
    return null;
  }
}

export default function LicitacaoDetailPage() {
  const params = useParams();
  const router = useRouter();
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
    async function load() {
      setLoading(true);
      try {
        // Fetch items from items API (via our proxy)
        const [itemsRes, anotacoesRes, tarefasRes, favRes] = await Promise.all([
          fetch(`/api/licitacoes/${encodeURIComponent(id)}`),
          fetch(`/api/anotacoes/${encodeURIComponent(id)}`),
          fetch('/api/tarefas'),
          fetch('/api/favoritos'),
        ]);

        if (itemsRes.ok) {
          const d = await itemsRes.json();
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

  // We'll store licitação data passed via sessionStorage or re-fetch from the list
  // For now, let's do a search-based fetch
  useEffect(() => {
    async function fetchLic() {
      try {
        // Try to get from broader date range
        const today = new Date().toISOString().split('T')[0];
        const yearStart = `${new Date().getFullYear()}-01-01`;
        const res = await fetch(`/api/licitacoes?pagina=1&tamanhoPagina=500&dataInicial=${yearStart}&dataFinal=${today}`);
        if (res.ok) {
          const json = await res.json();
          const found = (json.data || []).find((l: Licitacao) => l.numeroControlePNCP === id);
          if (found) setLicitacao(found);
        }
      } catch {}
    }
    fetchLic();
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

  function getSituacaoBadge(situacaoId: number, nome: string) {
    if (situacaoId === 1) return <Badge variant="success">{nome}</Badge>;
    if (situacaoId === 2) return <Badge variant="destructive">{nome}</Badge>;
    if (situacaoId === 3) return <Badge variant="warning">{nome}</Badge>;
    return <Badge variant="secondary">{nome}</Badge>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFavorite}
            disabled={favLoading}
            className={isFavorite ? 'text-[#ff6600] border-[#ff6600]' : ''}
          >
            <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </Button>
          {licitacao?.linkSistemaOrigem && (
            <a href={licitacao.linkSistemaOrigem} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                Portal oficial
              </Button>
            </a>
          )}
        </div>
      </div>

      {loading && !licitacao && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#0a1175]" />
        </div>
      )}

      {/* Main info */}
      {licitacao && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {getSituacaoBadge(licitacao.situacaoCompraId, licitacao.situacaoCompraNome)}
                <Badge variant="outline">{licitacao.modalidadeNome}</Badge>
              </div>
              <p className="text-xs text-gray-400 font-mono">{licitacao.numeroControlePNCP}</p>
            </div>

            <h1 className="text-xl font-bold text-gray-900 leading-snug">{licitacao.objetoCompra}</h1>

            {licitacao.valorTotalEstimado && licitacao.valorTotalEstimado > 0 && (
              <p className="text-2xl font-bold text-[#0a1175]">
                {formatCurrency(licitacao.valorTotalEstimado)}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">{licitacao.orgaoEntidade?.razaoSocial}</p>
                  <p className="text-xs text-gray-400">CNPJ: {licitacao.orgaoEntidade?.cnpj}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                {licitacao.unidadeOrgao?.municipioNome}, {licitacao.unidadeOrgao?.ufNome}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span>Publicação: {formatDate(licitacao.dataPublicacaoPncp)}</span>
              </div>
              {licitacao.dataAberturaProposta && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>Abertura: {formatDate(licitacao.dataAberturaProposta)}</span>
                </div>
              )}
              {licitacao.dataEncerramentoProposta && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>Encerramento: {formatDate(licitacao.dataEncerramentoProposta)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Itens da Licitação ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Descrição</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                    <th className="px-4 py-3 text-right">Valor Unit.</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{item.numeroItem || i + 1}</td>
                      <td className="px-4 py-3 text-gray-900">{item.descricao}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.quantidade} {item.unidadeMedida}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.valorUnitarioEstimado)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarefas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tarefas ({tarefas.length})
          </CardTitle>
          <Dialog open={tarefaOpen} onOpenChange={setTarefaOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Nova tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitTarefa} className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
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
                <Button type="submit" className="w-full" loading={tarefaLoading}>Criar tarefa</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {tarefas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma tarefa criada para esta licitação.</p>
          ) : (
            <div className="space-y-2">
              {tarefas.map((t) => (
                <div key={t.licitacoes_tarefa_id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => t.licitacoes_tarefa_status === 0 && concluirTarefa(t.licitacoes_tarefa_id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        t.licitacoes_tarefa_status === 1
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {t.licitacoes_tarefa_status === 1 && <span className="text-xs">✓</span>}
                    </button>
                    <span className={`text-sm ${t.licitacoes_tarefa_status === 1 ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {t.licitacoes_tarefa_nome}
                    </span>
                  </div>
                  {t.licitacoes_tarefa_prazo && (
                    <span className="text-xs text-gray-400">{formatDate(t.licitacoes_tarefa_prazo)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anotações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Anotações ({anotacoes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submitAnotacao} className="flex gap-2">
            <Input
              placeholder="Adicionar anotação..."
              value={novaAnotacao}
              onChange={(e) => setNovaAnotacao(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" loading={anotacaoLoading} size="sm">
              Salvar
            </Button>
          </form>

          {anotacoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">Nenhuma anotação ainda.</p>
          ) : (
            <div className="space-y-3">
              {anotacoes.map((a) => (
                <div key={a.licitacoes_anotacao_id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <p className="text-sm text-gray-800">{a.licitacoes_anotacao_texto}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(a as any).autor_nome || 'Usuário'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
