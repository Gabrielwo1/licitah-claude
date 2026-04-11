'use client';

import { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LicitacaoCard } from '@/components/licitacoes/LicitacaoCard';
import { Licitacao } from '@/lib/types';
import { todayISO, sevenDaysAgoISO } from '@/lib/utils';

const MODALIDADES = [
  { value: '7', label: 'Pregão Eletrônico' },
  { value: '8', label: 'Pregão Presencial' },
  { value: '5', label: 'Concorrência Eletrônica' },
  { value: '6', label: 'Concorrência Presencial' },
  { value: '1', label: 'Leilão Eletrônico' },
  { value: '2', label: 'Diálogo Competitivo' },
  { value: '3', label: 'Concurso' },
  { value: '14', label: 'Dispensa de Licitação' },
  { value: '15', label: 'Inexigibilidade' },
  { value: '11', label: 'Credenciamento' },
  { value: '12', label: 'Manifestação de Interesse' },
  { value: '13', label: 'Pré-qualificação' },
];

const UFS = [
  { value: 'all', label: 'Todos os estados' },
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' }, { value: 'AM', label: 'Amazonas' },
  { value: 'AP', label: 'Amapá' }, { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' }, { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' }, { value: 'MG', label: 'Minas Gerais' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MT', label: 'Mato Grosso' }, { value: 'PA', label: 'Pará' }, { value: 'PB', label: 'Paraíba' },
  { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' }, { value: 'PR', label: 'Paraná' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' }, { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' }, { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SE', label: 'Sergipe' }, { value: 'SP', label: 'São Paulo' }, { value: 'TO', label: 'Tocantins' },
];

export default function LicitacoesPage() {
  const [busca, setBusca] = useState('');
  const [modalidade, setModalidade] = useState('7');
  const [uf, setUf] = useState('all');
  const [dataInicial, setDataInicial] = useState(sevenDaysAgoISO());
  const [dataFinal, setDataFinal] = useState(todayISO());
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [apiError, setApiError] = useState('');

  const PAGE_SIZE = 20;

  async function fetchLicitacoes(page = 1) {
    setLoading(true);
    setApiError('');
    try {
      const params = new URLSearchParams();
      params.set('pagina', String(page));
      params.set('tamanhoPagina', String(PAGE_SIZE));
      params.set('dataInicial', dataInicial);
      params.set('dataFinal', dataFinal);
      params.set('modalidade', modalidade);
      if (uf !== 'all') params.set('uf', uf);
      if (busca.trim()) params.set('busca', busca.trim());

      const res = await fetch(`/api/licitacoes?${params.toString()}`);
      const json = await res.json();

      if (json.error) {
        setApiError('A API do governo está temporariamente indisponível. Tente novamente em alguns instantes.');
        setLicitacoes([]);
      } else {
        setLicitacoes(json.data || []);
        setTotal(json.totalRegistros || 0);
        setTotalPaginas(json.totalPaginas || 1);
        setHasMore(json.paginasRestantes || false);
      }
      setPagina(page);
      setSearched(true);
    } catch {
      setApiError('Erro de conexão. Verifique sua internet e tente novamente.');
      setLicitacoes([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchLicitacoes(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Licitações</h1>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
          {showFilters ? 'Ocultar filtros' : 'Filtros'}
        </Button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por objeto, órgão..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" loading={loading}>
            Buscar
          </Button>
        </div>

        {/* Filtros rápidos sempre visíveis */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Modalidade</label>
            <Select value={modalidade} onValueChange={setModalidade}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODALIDADES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Estado (UF)</label>
            <Select value={uf} onValueChange={setUf}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showFilters && (
            <>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data inicial</label>
                <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data final</label>
                <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </form>

      {/* Results */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#0a1175]" />
          <p className="text-sm text-gray-500">Consultando API do governo federal...</p>
        </div>
      )}

      {apiError && !loading && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Não foi possível carregar as licitações</p>
            <p className="mt-0.5 text-red-600">{apiError}</p>
          </div>
        </div>
      )}

      {!loading && !searched && !apiError && (
        <div className="text-center py-16 text-gray-400">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-600">Pronto para buscar</p>
          <p className="text-sm mt-1">Selecione a modalidade e clique em Buscar</p>
          <Button className="mt-4" onClick={() => fetchLicitacoes(1)}>
            Ver últimos 7 dias — Pregão Eletrônico
          </Button>
        </div>
      )}

      {!loading && searched && !apiError && licitacoes.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">Nenhuma licitação encontrada</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou ampliar o período</p>
        </div>
      )}

      {!loading && licitacoes.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {total > 0 ? `${total.toLocaleString('pt-BR')} resultado(s)` : `${licitacoes.length} resultado(s)`}
              {totalPaginas > 1 && ` — Página ${pagina} de ${totalPaginas}`}
            </span>
          </div>

          <div className="space-y-3">
            {licitacoes.map((l) => (
              <LicitacaoCard key={l.numeroControlePNCP} licitacao={l} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => fetchLicitacoes(pagina - 1)} disabled={pagina <= 1}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-gray-500">Página {pagina}</span>
            <Button variant="outline" size="sm" onClick={() => fetchLicitacoes(pagina + 1)} disabled={!hasMore && pagina >= totalPaginas}>
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
