'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { LicitacaoCard } from '@/components/licitacoes/LicitacaoCard';
import { Licitacao } from '@/lib/types';
import { todayISO, threeMonthsAgoISO } from '@/lib/utils';

const MODALIDADES = [
  { value: '', label: 'Todas as modalidades' },
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
  { value: '', label: 'Selecione um opção' },
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
  { value: '', label: 'Selecione uma situação' },
  { value: 'divulgada', label: 'Divulgada no PNCP' },
  { value: 'aberta', label: 'Aberta' },
  { value: 'encerrada', label: 'Encerrada' },
  { value: 'suspensa', label: 'Suspensa' },
  { value: 'cancelada', label: 'Cancelada' },
];

const ESFERAS = [
  { value: '', label: 'Selecione um opção' },
  { value: 'federal', label: 'Federal' },
  { value: 'estadual', label: 'Estadual' },
  { value: 'municipal', label: 'Municipal' },
];

const PAGE_SIZE = 20;

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#262E3A',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '34px',
  border: '1px solid #D3D3D3',
  borderRadius: '5px',
  fontSize: '13px',
  padding: '0 9px',
  color: '#262E3A',
  backgroundColor: '#fff',
  outline: 'none',
  appearance: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237B7B7B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  paddingRight: '28px',
  cursor: 'pointer',
};

const divider: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #ECECEC',
  margin: '12px 0',
};

export default function LicitacoesPage() {
  const [busca, setBusca] = useState('');
  const [buscaExata, setBuscaExata] = useState(false);
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [modalidade, setModalidade] = useState('');
  const [dataAberturaInicio, setDataAberturaInicio] = useState('');
  const [dataAberturaFim, setDataAberturaFim] = useState('');
  const [nConciliacao, setNConciliacao] = useState('');
  const [codigoOrgao, setCodigoOrgao] = useState('');
  const [esfera, setEsfera] = useState('');
  const [nProcesso, setNProcesso] = useState('');
  const [situacao, setSituacao] = useState('');
  const [orgao, setOrgao] = useState('');
  const [itens, setItens] = useState('');
  const [concAto, setConcAto] = useState(false);
  const [concAviso, setConcAviso] = useState(false);
  const [concEdital, setConcEdital] = useState(false);
  const [oportunidadesSelecionadas, setOportunidadesSelecionadas] = useState<string[]>([]);

  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'recente' | 'antiga' | 'maior' | 'menor'>('recente');
  const didAutoSearch = useRef(false);
  const [allLicitacoes, setAllLicitacoes] = useState<Licitacao[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [apiError, setApiError] = useState('');

  // Carrega cidades do IBGE quando o estado muda
  useEffect(() => {
    if (!uf) {
      setCidades([]);
      setCidade('');
      return;
    }
    setLoadingCidades(true);
    setCidade('');
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: any[]) => setCidades(data.map(m => m.nome)))
      .catch(() => setCidades([]))
      .finally(() => setLoadingCidades(false));
  }, [uf]);

  // Auto-busca ao abrir o módulo
  useEffect(() => {
    if (didAutoSearch.current) return;
    didAutoSearch.current = true;
    fetchLicitacoes(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side situação filter
  const licitacoes = situacao
    ? allLicitacoes.filter((l) => {
        const nome = l.situacaoCompraNome?.toLowerCase() || '';
        return nome.includes(situacao.toLowerCase());
      })
    : allLicitacoes;

  const afterCidade = licitacoes;

  // Client-side sort
  const filtered = [...afterCidade].sort((a, b) => {
    if (sortBy === 'maior') return (b.valorTotalEstimado ?? -1) - (a.valorTotalEstimado ?? -1);
    if (sortBy === 'menor') {
      if (!a.valorTotalEstimado && !b.valorTotalEstimado) return 0;
      if (!a.valorTotalEstimado) return 1;
      if (!b.valorTotalEstimado) return -1;
      return a.valorTotalEstimado - b.valorTotalEstimado;
    }
    const da = new Date(a.dataAberturaProposta || 0).getTime();
    const db = new Date(b.dataAberturaProposta || 0).getTime();
    if (sortBy === 'recente') return db - da; // abertura mais recente primeiro
    return da - db; // abertura mais antiga primeiro
  });

  async function fetchLicitacoes(page = 1) {
    setLoading(true);
    setApiError('');
    try {
      const params = new URLSearchParams();
      params.set('pagina', String(page));
      params.set('tamanhoPagina', String(PAGE_SIZE));

      if (dataAberturaInicio) params.set('dataInicial', dataAberturaInicio);
      if (dataAberturaFim) params.set('dataFinal', dataAberturaFim);

      if (modalidade) params.set('modalidade', modalidade);
      if (uf) params.set('uf', uf);
      if (cidade) params.set('municipio', cidade);
      // Combina busca manual com oportunidades selecionadas
      const termoBusca = [
        busca.trim(),
        ...oportunidadesSelecionadas,
      ].filter(Boolean).join(' ');
      if (termoBusca) params.set('busca', termoBusca);
      if (codigoOrgao.trim()) params.set('cnpj', codigoOrgao.trim());

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

  return (
    <div className="flex gap-5 min-h-full" style={{ alignItems: 'flex-start' }}>

      {/* ── LEFT FILTER SIDEBAR ── */}
      <aside
        className="shrink-0"
        style={{ width: '220px', minWidth: '220px' }}
      >
        <form onSubmit={handleSearch}>
          <div
            className="bg-white"
            style={{
              borderRadius: '8px',
              border: '1px solid #E8E8E8',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              padding: '16px',
            }}
          >

            {/* Objeto */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Objeto</label>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={inputStyle}
                placeholder=""
              />
            </div>

            {/* Busca Exata */}
            <div style={{ marginBottom: '12px' }}>
              <label
                className="flex items-center gap-2 cursor-pointer"
                style={{ fontSize: '13px', color: '#262E3A' }}
              >
                <input
                  type="checkbox"
                  checked={buscaExata}
                  onChange={(e) => setBuscaExata(e.target.checked)}
                  style={{ accentColor: '#262E3A', width: '14px', height: '14px' }}
                />
                Busca Exata
              </label>
            </div>

            <hr style={divider} />

            {/* Estado */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Estado</label>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                style={selectStyle}
              >
                {UFS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            {/* Cidade */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>
                Cidade
                {loadingCidades && (
                  <span style={{ fontSize: '11px', color: '#7B7B7B', fontWeight: 400, marginLeft: '6px' }}>
                    carregando...
                  </span>
                )}
              </label>
              {cidades.length > 0 ? (
                <select
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Todas as cidades</option>
                  {cidades.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  style={{ ...inputStyle, color: uf ? '#262E3A' : '#BDBDBD' }}
                  placeholder={uf ? 'Digite a cidade' : 'Selecione o estado'}
                  disabled={!!uf && loadingCidades}
                />
              )}
            </div>

            <hr style={divider} />

            {/* Modalidades */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Modalidades</label>
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                style={selectStyle}
              >
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <hr style={divider} />

            {/* Data Abertura */}
            <div style={{ marginBottom: '8px' }}>
              <label style={fieldLabel}>Data Abertura</label>
              <div style={{ marginBottom: '6px' }}>
                <label style={{ ...fieldLabel, fontWeight: 400, fontSize: '12px', color: '#7B7B7B', marginBottom: '3px' }}>
                  De:
                </label>
                <input
                  type="date"
                  value={dataAberturaInicio}
                  onChange={(e) => setDataAberturaInicio(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...fieldLabel, fontWeight: 400, fontSize: '12px', color: '#7B7B7B', marginBottom: '3px' }}>
                  Até:
                </label>
                <input
                  type="date"
                  value={dataAberturaFim}
                  onChange={(e) => setDataAberturaFim(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <hr style={divider} />

            {/* N° Conciliação */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>N° Conciliação</label>
              <input
                type="text"
                value={nConciliacao}
                onChange={(e) => setNConciliacao(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Código do orgão */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Código do orgão</label>
              <input
                type="text"
                value={codigoOrgao}
                onChange={(e) => setCodigoOrgao(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Esfera */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Esfera</label>
              <select
                value={esfera}
                onChange={(e) => setEsfera(e.target.value)}
                style={selectStyle}
              >
                {ESFERAS.map((ef) => (
                  <option key={ef.value} value={ef.value}>{ef.label}</option>
                ))}
              </select>
            </div>

            {/* N° processo */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>N° processo</label>
              <input
                type="text"
                value={nProcesso}
                onChange={(e) => setNProcesso(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Situação */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Situação</label>
              <select
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
                style={selectStyle}
              >
                {SITUACOES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Órgão */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Órgão</label>
              <input
                type="text"
                value={orgao}
                onChange={(e) => setOrgao(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Itens */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Itens</label>
              <input
                type="text"
                value={itens}
                onChange={(e) => setItens(e.target.value)}
                style={inputStyle}
              />
            </div>

            <hr style={divider} />

            {/* Concorrências */}
            <div style={{ marginBottom: '12px' }}>
              <label style={fieldLabel}>Concorrências</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="flex items-start gap-2 cursor-pointer" style={{ fontSize: '12px', color: '#262E3A', lineHeight: '1.4' }}>
                  <input
                    type="checkbox"
                    checked={concAto}
                    onChange={(e) => setConcAto(e.target.checked)}
                    style={{ accentColor: '#262E3A', width: '13px', height: '13px', marginTop: '2px', flexShrink: 0 }}
                  />
                  Ato que autoriza a Contratação Direta
                </label>
                <label className="flex items-start gap-2 cursor-pointer" style={{ fontSize: '12px', color: '#262E3A', lineHeight: '1.4' }}>
                  <input
                    type="checkbox"
                    checked={concAviso}
                    onChange={(e) => setConcAviso(e.target.checked)}
                    style={{ accentColor: '#262E3A', width: '13px', height: '13px', marginTop: '2px', flexShrink: 0 }}
                  />
                  Aviso de Contratação Direta
                </label>
                <label className="flex items-start gap-2 cursor-pointer" style={{ fontSize: '12px', color: '#262E3A', lineHeight: '1.4' }}>
                  <input
                    type="checkbox"
                    checked={concEdital}
                    onChange={(e) => setConcEdital(e.target.checked)}
                    style={{ accentColor: '#262E3A', width: '13px', height: '13px', marginTop: '2px', flexShrink: 0 }}
                  />
                  Edital
                </label>
              </div>
            </div>

            <hr style={divider} />

            {/* Oportunidades checkboxes */}
            <div style={{ marginBottom: '16px' }}>
              <label style={fieldLabel}>Oportunidades</label>
              <OportunidadesCheckboxes
                selected={oportunidadesSelecionadas}
                onChange={setOportunidadesSelecionadas}
              />
            </div>

            {/* Procurar button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '42px',
                backgroundColor: loading ? '#555' : '#262E3A',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2029'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#262E3A'; }}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Buscando...' : 'Procurar'}
            </button>
          </div>
        </form>
      </aside>

      {/* ── RIGHT RESULTS AREA ── */}
      <main className="flex-1 min-w-0">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#0a1175' }} />
            <p style={{ fontSize: '13px', color: '#7B7B7B' }}>
              Consultando API do governo federal...
            </p>
          </div>
        )}

        {/* Error */}
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

        {/* Empty state — só antes da primeira busca automática carregar */}
        {!loading && !searched && !apiError && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0a1175' }} />
          </div>
        )}

        {/* No results */}
        {!loading && searched && !apiError && filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: '#7B7B7B' }}>
            <p style={{ fontWeight: 600 }}>Nenhuma licitação encontrada</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Tente ajustar os filtros ou ampliar o período
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && filtered.length > 0 && (
          <>
            {/* Result count + sort buttons */}
            <div
              className="flex items-center justify-between flex-wrap gap-2"
              style={{ marginBottom: '12px' }}
            >
              <span style={{ fontSize: '13px', color: '#7B7B7B', fontWeight: 500 }}>
                {total > 0
                  ? `${total.toLocaleString('pt-BR')} resultado(s)`
                  : `${filtered.length} resultado(s)`}
                {totalPaginas > 1 && ` — Página ${pagina} de ${totalPaginas}`}
              </span>

              {/* Sort pills */}
              <div className="flex items-center gap-1.5">
                {([
                  { key: 'recente', label: 'Mais recentes' },
                  { key: 'antiga',  label: 'Mais antigas' },
                  { key: 'maior',   label: 'Maior valor' },
                  { key: 'menor',   label: 'Menor valor' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: sortBy === key ? 'none' : '1px solid #D3D3D3',
                      backgroundColor: sortBy === key ? '#262E3A' : '#fff',
                      color: sortBy === key ? '#fff' : '#7B7B7B',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (sortBy !== key) (e.currentTarget as HTMLElement).style.borderColor = '#262E3A';
                    }}
                    onMouseLeave={e => {
                      if (sortBy !== key) (e.currentTarget as HTMLElement).style.borderColor = '#D3D3D3';
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards */}
            {filtered.map((l) => (
              <LicitacaoCard key={l.numeroControlePNCP} licitacao={l} />
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-1 pt-4 pb-2">
              <PaginationBtn
                onClick={() => fetchLicitacoes(pagina - 1)}
                disabled={pagina <= 1}
                label="←"
              />

              {pagina > 2 && (
                <PaginationBtn onClick={() => fetchLicitacoes(1)} label="1" />
              )}
              {pagina > 3 && (
                <span style={{ padding: '0 4px', fontSize: '13px', color: '#7B7B7B' }}>...</span>
              )}
              {pagina > 1 && (
                <PaginationBtn onClick={() => fetchLicitacoes(pagina - 1)} label={String(pagina - 1)} />
              )}
              <PaginationBtn label={String(pagina)} active />
              {(hasMore || pagina < totalPaginas) && (
                <PaginationBtn onClick={() => fetchLicitacoes(pagina + 1)} label={String(pagina + 1)} />
              )}
              {totalPaginas > pagina + 2 && (
                <span style={{ padding: '0 4px', fontSize: '13px', color: '#7B7B7B' }}>...</span>
              )}
              {totalPaginas > pagina + 1 && (
                <PaginationBtn onClick={() => fetchLicitacoes(totalPaginas)} label={String(totalPaginas)} />
              )}

              <PaginationBtn
                onClick={() => fetchLicitacoes(pagina + 1)}
                disabled={!hasMore && pagina >= totalPaginas}
                label="→"
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PaginationBtn({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: '32px',
        height: '32px',
        padding: '0 8px',
        borderRadius: '5px',
        border: active ? 'none' : '1px solid #E0E0E0',
        backgroundColor: active ? '#0a1175' : disabled ? '#F5F5F5' : '#fff',
        color: active ? '#fff' : disabled ? '#CFCFCF' : '#262E3A',
        fontSize: '13px',
        fontWeight: active ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.backgroundColor = '#F0F0F0'; }}
      onMouseLeave={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.backgroundColor = '#fff'; }}
    >
      {label}
    </button>
  );
}

// Oportunidades como checkboxes
function OportunidadesCheckboxes({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/oportunidades')
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const keywords: string[] = [];
        data.forEach((o: any) => {
          const raw = o.licitacoes_oportunidade_tagmento;
          if (!raw) return;
          try {
            // Tenta parsear como JSON array: ["impressora","arroz"]
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((k: string) => {
                if (k && !keywords.includes(k)) keywords.push(k);
              });
            } else if (typeof parsed === 'string' && !keywords.includes(parsed)) {
              keywords.push(parsed);
            }
          } catch {
            // Não é JSON, usa direto como string
            if (!keywords.includes(raw)) keywords.push(raw);
          }
        });
        setTags(keywords);
      })
      .catch(() => {});
  }, []);

  if (tags.length === 0) return (
    <span style={{ fontSize: '12px', color: '#BDBDBD' }}>Nenhuma oportunidade cadastrada</span>
  );

  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {tags.map((tag) => (
        <label
          key={tag}
          className="flex items-center gap-2 cursor-pointer"
          style={{ fontSize: '12px', color: '#262E3A' }}
        >
          <input
            type="checkbox"
            checked={selected.includes(tag)}
            onChange={() => toggle(tag)}
            style={{ accentColor: '#0a1175', width: '13px', height: '13px', flexShrink: 0 }}
          />
          {tag}
        </label>
      ))}
    </div>
  );
}

// mantido para não quebrar importações antigas
function OportunidadesTags() {
  const [tags] = useState<string[]>([]);
  if (tags.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {tags.map((tag, i) => (
        <span
          key={i}
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: '#F1F1FC',
            color: '#0a1175',
            fontWeight: 600,
            cursor: 'default',
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
