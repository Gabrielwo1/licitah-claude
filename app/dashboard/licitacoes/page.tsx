'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LicitacaoCard } from '@/components/licitacoes/LicitacaoCard';
import { Licitacao } from '@/lib/types';
import { todayISO, sevenDaysAgoISO } from '@/lib/utils';

const MODALIDADES = [
  { value: 'all', label: 'Todas as modalidades' },
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
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' },
  { value: 'AM', label: 'Amazonas' }, { value: 'AP', label: 'Amapá' },
  { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' }, { value: 'MA', label: 'Maranhão' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MT', label: 'Mato Grosso' }, { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' }, { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' }, { value: 'PR', label: 'Paraná' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RO', label: 'Rondônia' }, { value: 'RR', label: 'Roraima' },
  { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SE', label: 'Sergipe' }, { value: 'SP', label: 'São Paulo' },
  { value: 'TO', label: 'Tocantins' },
];

const SITUACOES = [
  { value: 'all', label: 'Todos' },
  { value: 'Divulgada no PNCP', label: 'Divulgada no PNCP' },
  { value: 'Aberta', label: 'Aberta' },
  { value: 'Encerrada', label: 'Encerrada' },
  { value: 'Suspensa', label: 'Suspensa' },
  { value: 'Cancelada', label: 'Cancelada' },
];

const ESFERAS = [
  { value: 'all', label: 'Todos' },
  { value: 'federal', label: 'Federal' },
  { value: 'estadual', label: 'Estadual' },
  { value: 'municipal', label: 'Municipal' },
];

const PAGE_SIZE = 20;

function labelStyle(): React.CSSProperties {
  return { fontSize: '14px', fontWeight: 600, color: '#262E3A', marginBottom: '6px', display: 'block' };
}

export default function LicitacoesPage() {
  const [busca, setBusca] = useState('');
  const [modalidade, setModalidade] = useState('7');
  const [uf, setUf] = useState('all');
  const [cidade, setCidade] = useState('');
  const [situacao, setSituacao] = useState('all');
  const [dataAberturaInicio, setDataAberturaInicio] = useState(sevenDaysAgoISO());
  const [dataAberturaFim, setDataAberturaFim] = useState(todayISO());
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [esfera, setEsfera] = useState('all');
  const [buscaExata, setBuscaExata] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allLicitacoes, setAllLicitacoes] = useState<Licitacao[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [apiError, setApiError] = useState('');

  // Client-side situação filter
  const licitacoes = situacao === 'all'
    ? allLicitacoes
    : allLicitacoes.filter((l) => {
        const nome = l.situacaoCompraNome?.toLowerCase() || '';
        const filter = situacao.toLowerCase();
        return nome.includes(filter);
      });

  async function fetchLicitacoes(page = 1) {
    setLoading(true);
    setApiError('');
    try {
      const params = new URLSearchParams();
      params.set('pagina', String(page));
      params.set('tamanhoPagina', String(PAGE_SIZE));
      params.set('dataInicial', dataAberturaInicio);
      params.set('dataFinal', dataAberturaFim);
      if (modalidade !== 'all') params.set('modalidade', modalidade);
      if (uf !== 'all') params.set('uf', uf);
      if (busca.trim()) params.set('busca', busca.trim());

      const res = await fetch(`/api/licitacoes?${params.toString()}`);
      const json = await res.json();

      if (json.error) {
        setApiError('A API do governo está temporariamente indisponível. Tente novamente em alguns instantes.');
        setAllLicitacoes([]);
      } else {
        setAllLicitacoes(json.data || []);
        setTotal(json.totalRegistros || 0);
        setTotalPaginas(json.totalPaginas || 1);
        setHasMore(json.paginasRestantes || false);
      }
      setPagina(page);
      setSearched(true);
    } catch {
      setApiError('Erro de conexão. Verifique sua internet e tente novamente.');
      setAllLicitacoes([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchLicitacoes(1);
  }

  const inputStyle: React.CSSProperties = {
    height: '42px',
    border: '1px solid #D3D3D3',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    padding: '0 12px',
    color: '#262E3A',
    backgroundColor: '#fff',
    outline: 'none',
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: '#262E3A' }}>
        Licitações
      </h1>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="bg-white p-5 space-y-4"
        style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        {/* Row 1: Objeto full width */}
        <div>
          <label style={labelStyle()}>Objeto / Busca</label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: '#7B7B7B' }}
            />
            <input
              type="text"
              placeholder="Buscar por objeto, órgão, palavras-chave..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
          </div>
        </div>

        {/* Row 2: Modalidade | Estado | Cidade | Situação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label style={labelStyle()}>Modalidade</label>
            <Select value={modalidade} onValueChange={setModalidade}>
              <SelectTrigger style={{ height: '42px', borderColor: '#D3D3D3' }}>
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
            <label style={labelStyle()}>Estado</label>
            <Select value={uf} onValueChange={setUf}>
              <SelectTrigger style={{ height: '42px', borderColor: '#D3D3D3' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label style={labelStyle()}>Cidade</label>
            <input
              type="text"
              placeholder="Ex: São Paulo"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle()}>Situação</label>
            <Select value={situacao} onValueChange={setSituacao}>
              <SelectTrigger style={{ height: '42px', borderColor: '#D3D3D3' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITUACOES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Data Abertura De | Data Abertura Até | Nº Processo | Esfera */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label style={labelStyle()}>Abertura De</label>
            <input
              type="date"
              value={dataAberturaInicio}
              onChange={(e) => setDataAberturaInicio(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle()}>Abertura Até</label>
            <input
              type="date"
              value={dataAberturaFim}
              onChange={(e) => setDataAberturaFim(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle()}>Nº Processo</label>
            <input
              type="text"
              placeholder="Ex: 001/2024"
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle()}>Esfera</label>
            <Select value={esfera} onValueChange={setEsfera}>
              <SelectTrigger style={{ height: '42px', borderColor: '#D3D3D3' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESFERAS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Busca exata checkbox */}
        <div className="flex items-center gap-2">
          <input
            id="busca-exata"
            type="checkbox"
            checked={buscaExata}
            onChange={(e) => setBuscaExata(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: '#262E3A' }}
          />
          <label
            htmlFor="busca-exata"
            style={{ fontSize: '14px', fontWeight: 600, color: '#262E3A', cursor: 'pointer' }}
          >
            Busca exata (correspondência exata do termo)
          </label>
        </div>

        {/* Search button full width */}
        <Button
          type="submit"
          loading={loading}
          variant="padrao"
          className="w-full"
          style={{ height: '50px', fontSize: '15px' }}
        >
          <Search className="h-4 w-4" />
          Buscar Licitações
        </Button>
      </form>

      {/* Results */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#0a1175' }} />
          <p className="text-sm" style={{ color: '#7B7B7B' }}>
            Consultando API do governo federal...
          </p>
        </div>
      )}

      {apiError && !loading && (
        <div
          className="flex items-start gap-3 p-4 rounded-lg text-sm"
          style={{ backgroundColor: '#FFF0F0', border: '1px solid #FFCDD2', color: '#C62828' }}
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Não foi possível carregar as licitações</p>
            <p className="mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {!loading && !searched && !apiError && (
        <div className="text-center py-16" style={{ color: '#7B7B7B' }}>
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold" style={{ color: '#262E3A' }}>
            Pronto para buscar
          </p>
          <p className="text-sm mt-1">Preencha os filtros e clique em Buscar Licitações</p>
          <Button
            className="mt-4"
            variant="padrao"
            onClick={() => fetchLicitacoes(1)}
          >
            Ver últimos 7 dias — Pregão Eletrônico
          </Button>
        </div>
      )}

      {!loading && searched && !apiError && licitacoes.length === 0 && (
        <div className="text-center py-12" style={{ color: '#7B7B7B' }}>
          <p className="font-semibold">Nenhuma licitação encontrada</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou ampliar o período</p>
        </div>
      )}

      {!loading && licitacoes.length > 0 && (
        <>
          <div
            className="flex items-center justify-between text-sm"
            style={{ color: '#7B7B7B' }}
          >
            <span>
              {total > 0
                ? `${total.toLocaleString('pt-BR')} resultado(s)`
                : `${licitacoes.length} resultado(s)`}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLicitacoes(pagina - 1)}
              disabled={pagina <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-1">
              {pagina > 2 && (
                <button
                  onClick={() => fetchLicitacoes(1)}
                  className="w-8 h-8 rounded text-sm font-semibold"
                  style={{ color: '#7B7B7B' }}
                >
                  1
                </button>
              )}
              {pagina > 3 && (
                <span className="text-sm" style={{ color: '#7B7B7B' }}>...</span>
              )}
              {pagina > 1 && (
                <button
                  onClick={() => fetchLicitacoes(pagina - 1)}
                  className="w-8 h-8 rounded text-sm font-semibold"
                  style={{ color: '#7B7B7B' }}
                >
                  {pagina - 1}
                </button>
              )}
              <button
                className="w-8 h-8 rounded text-sm font-bold text-white"
                style={{ backgroundColor: '#0a1175' }}
              >
                {pagina}
              </button>
              {(hasMore || pagina < totalPaginas) && (
                <button
                  onClick={() => fetchLicitacoes(pagina + 1)}
                  className="w-8 h-8 rounded text-sm font-semibold"
                  style={{ color: '#7B7B7B' }}
                >
                  {pagina + 1}
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLicitacoes(pagina + 1)}
              disabled={!hasMore && pagina >= totalPaginas}
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
