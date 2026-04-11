'use client';

import { useState, useCallback } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LicitacaoCard } from '@/components/licitacoes/LicitacaoCard';
import { Licitacao } from '@/lib/types';
import { todayISO, sevenDaysAgoISO } from '@/lib/utils';

const MODALIDADES = [
  { value: 'all', label: 'Todas as modalidades' },
  { value: '1', label: 'Leilão - Eletrônico' },
  { value: '2', label: 'Diálogo Competitivo' },
  { value: '3', label: 'Concurso' },
  { value: '5', label: 'Concorrência - Eletrônica' },
  { value: '6', label: 'Concorrência - Presencial' },
  { value: '7', label: 'Pregão - Eletrônico' },
  { value: '8', label: 'Pregão - Presencial' },
  { value: '9', label: 'RDC - Eletrônico' },
  { value: '10', label: 'RDC - Presencial' },
  { value: '11', label: 'Credenciamento' },
  { value: '12', label: 'Manifestação de Interesse' },
  { value: '13', label: 'Pré-qualificação' },
  { value: '14', label: 'Dispensa de Licitação' },
  { value: '15', label: 'Inexigibilidade' },
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
  const [modalidade, setModalidade] = useState('all');
  const [uf, setUf] = useState('all');
  const [dataInicial, setDataInicial] = useState(sevenDaysAgoISO());
  const [dataFinal, setDataFinal] = useState(todayISO());
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 20;

  async function fetchLicitacoes(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('pagina', String(page));
      params.set('tamanhoPagina', String(PAGE_SIZE));
      params.set('dataInicial', dataInicial);
      params.set('dataFinal', dataFinal);
      if (modalidade !== 'all') params.set('modalidade', modalidade);
      if (uf !== 'all') params.set('uf', uf);
      if (busca) params.set('busca', busca);

      const res = await fetch(`/api/licitacoes?${params.toString()}`);
      const json = await res.json();
      setLicitacoes(json.data || []);
      setTotal(json.totalRegistros || 0);
      setHasMore(json.paginasRestantes || false);
      setPagina(page);
      setSearched(true);
    } catch (err) {
      console.error(err);
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          Filtros
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

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data inicial</label>
              <Input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data final</label>
              <Input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
              />
            </div>
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
          </div>
        )}
      </form>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a1175]" />
        </div>
      )}

      {!loading && !searched && (
        <div className="text-center py-16 text-gray-400">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Busque por licitações</p>
          <p className="text-sm mt-1">Use os filtros e clique em Buscar para encontrar licitações</p>
          <Button className="mt-4" onClick={() => fetchLicitacoes(1)} loading={loading}>
            Ver últimas 7 dias
          </Button>
        </div>
      )}

      {!loading && searched && licitacoes.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>Nenhuma licitação encontrada para os filtros selecionados.</p>
        </div>
      )}

      {!loading && licitacoes.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{total > 0 ? `${total.toLocaleString()} licitação(ões) encontrada(s)` : `${licitacoes.length} resultado(s)`}</span>
            <span>Página {pagina}</span>
          </div>

          <div className="space-y-3">
            {licitacoes.map((l) => (
              <LicitacaoCard
                key={l.numeroControlePNCP}
                licitacao={l}
                isFavorite={favoriteIds.has(l.numeroControlePNCP)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLicitacoes(pagina - 1)}
              disabled={pagina <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-gray-500">Página {pagina}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLicitacoes(pagina + 1)}
              disabled={!hasMore || loading}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
