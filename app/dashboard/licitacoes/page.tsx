'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { LicitacaoCard } from '@/components/licitacoes/LicitacaoCard';
import { Licitacao } from '@/lib/types';

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
  const [codigoIbge, setCodigoIbge] = useState('');
  const [cidades, setCidades] = useState<{ nome: string; id: string }[]>([]);
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

  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'recente' | 'antiga' | 'maior' | 'menor'>('recente');
  const didAutoSearch = useRef(false);

  // Server-side pagination state
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [serverPage, setServerPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const [searched, setSearched] = useState(false);
  const [apiError, setApiError] = useState('');
  const [managedIds, setManagedIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Carrega cidades do IBGE quando o estado muda
  useEffect(() => {
    if (!uf) {
      setCidades([]);
      setCidade('');
      setCodigoIbge('');
      return;
    }
    setLoadingCidades(true);
    setCidade('');
    setCodigoIbge('');
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: any[]) => setCidades(data.map(m => ({ nome: m.nome, id: String(m.id) }))))
      .catch(() => setCidades([]))
      .finally(() => setLoadingCidades(false));
  }, [uf]);

  // Carrega IDs das licitações gerenciadas e favoritas em paralelo
  useEffect(() => {
    Promise.all([
      fetch('/api/gerenciadas').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/favoritos').then(r => r.ok ? r.json() : []),
    ]).then(([gerJson, favJson]) => {
      setManagedIds(new Set((gerJson.data || []).map((g: any) => g.lg_identificador as string)));
      setFavoriteIds(new Set(
        (Array.isArray(favJson) ? favJson : [])
          .filter((f: any) => f.favorito_modulo === 'licitacao')
          .map((f: any) => f.favorito_identificador as string)
      ));
    }).catch(() => {});
  }, []);

  // Auto-busca ao abrir o módulo
  useEffect(() => {
    if (didAutoSearch.current) return;
    didAutoSearch.current = true;
    fetchLicitacoes(1, 'recente');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtro de situação dentro da página atual (client-side)
  const displayedLicitacoes = situacao
    ? licitacoes.filter(l => (l.situacaoCompraNome?.toLowerCase() || '').includes(situacao.toLowerCase()))
    : licitacoes;

  function buildParams(page: number, sort: string) {
    const params = new URLSearchParams();
    if (dataAberturaInicio) params.set('dataInicial', dataAberturaInicio);
    if (dataAberturaFim)    params.set('dataFinal',   dataAberturaFim);
    if (modalidade)         params.set('modalidade',  modalidade);
    if (uf)                 params.set('uf',          uf);
    if (cidade)             params.set('municipio',   cidade);
    if (codigoIbge)         params.set('codigoIbge',  codigoIbge);
    const termoBusca = [busca.trim(), ...oportunidadesSelecionadas].filter(Boolean).join(' ');
    if (termoBusca)         params.set('busca',       termoBusca);
    if (codigoOrgao.trim()) params.set('cnpj',        codigoOrgao.trim());
    params.set('page',     String(page));
    params.set('pageSize', '100');
    params.set('sort',     sort);
    return params;
  }

  async function fetchLicitacoes(page = 1, sort = sortBy) {
    setApiError('');
    setLoading(true);
    try {
      const params = buildParams(page, sort);
      const res = await fetch(`/api/licitacoes?${params.toString()}`);
      const json = await res.json();
      if (json.error) {
        setApiError('A API do governo está temporariamente indisponível. Tente novamente em alguns instantes.');
        setLicitacoes([]);
        return;
      }
      setLicitacoes(json.data || []);
      setServerPage(json.page ?? page);
      setTotalPages(json.totalPages ?? 1);
      setTotalRegistros(json.totalRegistros ?? 0);
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
    fetchLicitacoes(1, sortBy);
  }

  function handleSortChange(key: 'recente' | 'antiga' | 'maior' | 'menor') {
    setSortBy(key);
    fetchLicitacoes(1, key);
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages || newPage === serverPage) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchLicitacoes(newPage, sortBy);
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
                  onChange={(e) => {
                    const selected = cidades.find(c => c.nome === e.target.value);
                    setCidade(e.target.value);
                    setCodigoIbge(selected?.id || '');
                  }}
                  style={selectStyle}
                >
                  <option value="">Todas as cidades</option>
                  {cidades.map((c) => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
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
              Consultando banco de dados...
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

        {/* Waiting for first search */}
        {!loading && !searched && !apiError && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0a1175' }} />
          </div>
        )}

        {/* No results */}
        {!loading && searched && !apiError && displayedLicitacoes.length === 0 && (
          <div className="text-center py-16" style={{ color: '#7B7B7B' }}>
            <p style={{ fontWeight: 600 }}>Nenhuma licitação encontrada</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Tente ajustar os filtros ou ampliar o período
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && displayedLicitacoes.length > 0 && (
          <>
            {/* Result count + refresh + sort buttons */}
            <div
              className="flex items-center justify-between flex-wrap gap-2"
              style={{ marginBottom: '12px' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: '13px', color: '#7B7B7B', fontWeight: 500 }}>
                  <strong style={{ color: '#262E3A' }}>{totalRegistros.toLocaleString('pt-BR')}</strong>
                  {' '}licitação{totalRegistros !== 1 ? 'ões' : ''}
                  {totalPages > 1 && (
                    <> — Página <strong style={{ color: '#262E3A' }}>{serverPage}</strong> de <strong style={{ color: '#262E3A' }}>{totalPages}</strong></>
                  )}
                </span>
                <button
                  onClick={() => fetchLicitacoes(serverPage, sortBy)}
                  disabled={loading}
                  title="Atualizar resultados"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    height: '30px', padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #D3D3D3',
                    backgroundColor: '#fff',
                    color: '#262E3A',
                    fontSize: '12.5px', fontWeight: 600,
                    cursor: loading ? 'wait' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: loading ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.backgroundColor = '#0a1175'; (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#0a1175'; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fff'; (e.currentTarget as HTMLElement).style.color = '#262E3A'; (e.currentTarget as HTMLElement).style.borderColor = '#D3D3D3'; }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

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
                    onClick={() => handleSortChange(key)}
                    disabled={loading}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: sortBy === key ? 'none' : '1px solid #D3D3D3',
                      backgroundColor: sortBy === key ? '#262E3A' : '#fff',
                      color: sortBy === key ? '#fff' : '#7B7B7B',
                      cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (sortBy !== key && !loading) (e.currentTarget as HTMLElement).style.borderColor = '#262E3A';
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
            {displayedLicitacoes.map((l) => (
              <LicitacaoCard
                key={l.numeroControlePNCP}
                licitacao={l}
                isFavorite={favoriteIds.has(l.numeroControlePNCP)}
                onFavoriteToggle={(id) => setFavoriteIds(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                })}
              />
            ))}

            {/* Server-side pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-4 pb-2">
                <PaginationBtn
                  onClick={() => handlePageChange(serverPage - 1)}
                  disabled={serverPage <= 1 || loading}
                  label="←"
                />

                {(() => {
                  const pages: (number | '...')[] = [];
                  const cur = serverPage;
                  const tot = totalPages;
                  if (tot <= 7) {
                    for (let i = 1; i <= tot; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (cur > 3) pages.push('...');
                    for (let i = Math.max(2, cur - 1); i <= Math.min(tot - 1, cur + 1); i++) pages.push(i);
                    if (cur < tot - 2) pages.push('...');
                    pages.push(tot);
                  }
                  return pages.map((p, i) =>
                    p === '...'
                      ? <span key={`e${i}`} style={{ padding: '0 4px', fontSize: '13px', color: '#7B7B7B' }}>...</span>
                      : <PaginationBtn
                          key={p}
                          label={String(p)}
                          active={p === cur}
                          disabled={loading}
                          onClick={() => handlePageChange(p as number)}
                        />
                  );
                })()}

                <PaginationBtn
                  onClick={() => handlePageChange(serverPage + 1)}
                  disabled={serverPage >= totalPages || loading}
                  label="→"
                />
              </div>
            )}
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
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((k: string) => {
                if (k && !keywords.includes(k)) keywords.push(k);
              });
            } else if (typeof parsed === 'string' && !keywords.includes(parsed)) {
              keywords.push(parsed);
            }
          } catch {
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
