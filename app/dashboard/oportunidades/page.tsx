'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Loader2, MapPin, List, Calendar as CalendarIcon, Search, RefreshCw, Filter } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(d: Date) {
  const s = new Date(d); s.setDate(d.getDate() - d.getDay()); s.setHours(0,0,0,0); return s;
}
function endOfWeek(d: Date) {
  const e = new Date(d); e.setDate(d.getDate() + (6 - d.getDay())); e.setHours(23,59,59,999); return e;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function licitacaoDate(l: any): Date {
  return new Date(l.dataPublicacaoPncp || l.dataAberturaProposta || 0);
}

function relativeDateLabel(d: Date, today: Date): string {
  const dKey = dayKey(d);
  const tKey = dayKey(today);
  if (dKey === tKey) return 'Hoje';

  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (dKey === dayKey(yesterday)) return 'Ontem';

  const diffMs = today.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays >= 0 && diffDays < 7) return `Há ${diffDays} dia${diffDays === 1 ? '' : 's'}`;
  if (diffDays < 0) {
    // Future date (shouldn't normally happen for publicacao but defensive)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OportunidadesPage() {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [viewMode, setViewMode] = useState<'mensal' | 'semanal'>('mensal');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // NEW: primary display mode — Lista (default, easier UX) or Calendário
  const [displayMode, setDisplayMode] = useState<'lista' | 'calendario'>('lista');

  // NEW: list filters
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'todos' | 'hoje' | 'semana' | 'mes'>('todos');
  const [ufFilter, setUfFilter] = useState<string>('todos');
  const [visibleCount, setVisibleCount] = useState(20);

  const [licitacoes, setLicitacoes] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [ufConfig, setUfConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  // Load oportunidades results
  useEffect(() => {
    const cacheKey = 'oportunidades_cache';
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const { data, ts, kws, uf: cachedUf } = JSON.parse(raw);
        if (Date.now() - ts < 4 * 3600 * 1000) {
          const cleanKws: string[] = Array.isArray(kws) ? kws.filter(Boolean) : [];
          setLicitacoes(data); setKeywords(cleanKws); setUfConfig(cachedUf || '');
          setHasConfig(cleanKws.length > 0);
          setLoading(false); return;
        }
      }
    } catch {}

    fetch('/api/oportunidades/buscar')
      .then(r => r.ok ? r.json() : { keywords: [], data: [] })
      .then((json: any) => {
        const kws: string[] = Array.isArray(json.keywords) ? json.keywords.filter(Boolean) : [];
        const data = json.data || [];
        // Build readable region label
        let regionLabel = '';
        if (json.cidade) regionLabel = `${json.cidade} - ${json.uf}`;
        else if (json.uf) regionLabel = json.uf;
        setKeywords(kws); setUfConfig(regionLabel); setLicitacoes(data);
        setHasConfig(kws.length > 0);
        if (kws.length > 0) {
          try { localStorage.setItem('oportunidades_cache', JSON.stringify({ data, ts: Date.now(), kws, uf: regionLabel })); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by day
  const byDay: Record<string, any[]> = {};
  licitacoes.forEach(l => {
    const k = dayKey(licitacaoDate(l));
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(l);
  });

  // Stats
  const todayKey = dayKey(today);
  const todayCount = (byDay[todayKey] || []).length;

  const weekStart = startOfWeek(today); const weekEnd = endOfWeek(today);
  const weekCount = licitacoes.filter(l => { const d = licitacaoDate(l); return d >= weekStart && d <= weekEnd; }).length;

  const monthStart = startOfMonth(today); const monthEnd = endOfMonth(today);
  const monthCount = licitacoes.filter(l => { const d = licitacaoDate(l); return d >= monthStart && d <= monthEnd; }).length;

  const selectedLics = selectedDay ? (byDay[selectedDay] || []) : [];

  // ── List view: filter + sort + group by relative date ──────────────────────
  const availableUfs = useMemo(() => {
    const ufs = new Set<string>();
    licitacoes.forEach(l => { const uf = l.unidadeOrgao?.ufSigla; if (uf) ufs.add(uf); });
    return Array.from(ufs).sort();
  }, [licitacoes]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = licitacoes;

    if (q) {
      out = out.filter(l => {
        const obj = (l.objetoCompra || '').toLowerCase();
        const org = (l.orgaoEntidade?.razaoSocial || '').toLowerCase();
        const cid = (l.unidadeOrgao?.municipioNome || '').toLowerCase();
        return obj.includes(q) || org.includes(q) || cid.includes(q);
      });
    }

    if (ufFilter !== 'todos') {
      out = out.filter(l => l.unidadeOrgao?.ufSigla === ufFilter);
    }

    if (periodFilter !== 'todos') {
      out = out.filter(l => {
        const d = licitacaoDate(l);
        if (periodFilter === 'hoje')   return isSameDay(d, today);
        if (periodFilter === 'semana') return d >= weekStart && d <= weekEnd;
        if (periodFilter === 'mes')    return d >= monthStart && d <= monthEnd;
        return true;
      });
    }

    // Already sorted desc by API, but ensure
    return out.slice().sort((a, b) => licitacaoDate(b).getTime() - licitacaoDate(a).getTime());
  }, [licitacoes, search, ufFilter, periodFilter, today, weekStart, weekEnd, monthStart, monthEnd]);

  // Group filtered list by relative date label
  const groupedList = useMemo(() => {
    const groups: { label: string; items: any[] }[] = [];
    const visible = filteredList.slice(0, visibleCount);
    let currentLabel = '';
    let currentBucket: any[] = [];
    visible.forEach(l => {
      const lbl = relativeDateLabel(licitacaoDate(l), today);
      if (lbl !== currentLabel) {
        if (currentBucket.length) groups.push({ label: currentLabel, items: currentBucket });
        currentLabel = lbl;
        currentBucket = [l];
      } else {
        currentBucket.push(l);
      }
    });
    if (currentBucket.length) groups.push({ label: currentLabel, items: currentBucket });
    return groups;
  }, [filteredList, visibleCount, today]);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(20); }, [search, ufFilter, periodFilter]);


  function reload() {
    try { localStorage.removeItem('oportunidades_cache'); } catch {}
    setLoading(true);
    fetch('/api/oportunidades/buscar')
      .then(r => r.ok ? r.json() : { keywords: [], data: [] })
      .then((json: any) => {
        const kws: string[] = Array.isArray(json.keywords) ? json.keywords.filter(Boolean) : [];
        const data = json.data || [];
        let regionLabel = '';
        if (json.cidade) regionLabel = `${json.cidade} - ${json.uf}`;
        else if (json.uf) regionLabel = json.uf;
        setKeywords(kws); setUfConfig(regionLabel); setLicitacoes(data); setHasConfig(kws.length > 0);
        if (kws.length > 0) {
          try { localStorage.setItem('oportunidades_cache', JSON.stringify({ data, ts: Date.now(), kws, uf: regionLabel })); } catch {}
        }
      })
      .finally(() => setLoading(false));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a2e', marginBottom: '6px' }}>
          Encontre novas oportunidades para o seu negócio!
        </h1>
        <p style={{ fontSize: '14px', color: '#7B7B7B', lineHeight: '1.5' }}>
          A Licitah encontra as oportunidades adequadas para o seu segmento, aproveite e alavanque a sua empresa com novas licitações
        </p>
      </div>

      {/* Status bar */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#259F46', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#262E3A' }}>Oportunidades do dia:</span>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#FF6600' }} />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#FF6600' }}>
              {!hasConfig ? 'Configure suas palavras-chave!' : todayCount === 0 ? 'Nenhuma Licitação encontrada!' : `${todayCount} Licitação(ões) encontrada(s)!`}
            </span>
          )}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{ backgroundColor: '#FF6600', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e05a00')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF6600')}
        >
          Definir Oportunidades
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Oportunidades do Dia:', count: todayCount },
          { label: 'Oportunidades da Semana:', count: weekCount },
          { label: 'Oportunidades do Mês:', count: monthCount },
        ].map(({ label, count }) => (
          <div key={label} style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#259F46', display: 'inline-block' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#262E3A' }}>{label}</span>
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#FF6600' }} />
            ) : (
              <span style={{ fontSize: '15px', fontWeight: 800, color: count > 0 ? '#FF6600' : '#9B9B9B' }}>
                {count > 0 ? `${count} Licitações` : 'Nenhuma licitação encontrada'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Keywords chips display */}
      {keywords.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#7B7B7B', fontWeight: 600 }}>Buscando por:</span>
          {keywords.map(kw => (
            <span key={kw} style={{ backgroundColor: '#1a237e', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' }}>{kw}</span>
          ))}
          {ufConfig && (
            <span style={{ backgroundColor: '#FF6600', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin className="h-3 w-3" />{ufConfig}
            </span>
          )}
        </div>
      )}

      {/* Results section */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {/* Top bar: title + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F0F0F0', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#262E3A', margin: 0 }}>
              {displayMode === 'lista' ? 'Oportunidades encontradas' : 'Calendário de oportunidades'}
            </h2>
            <p style={{ fontSize: '12.5px', color: '#7B7B7B', margin: '2px 0 0 0' }}>
              {displayMode === 'lista'
                ? `${filteredList.length} resultado${filteredList.length !== 1 ? 's' : ''}${filteredList.length !== licitacoes.length ? ` de ${licitacoes.length}` : ''}`
                : 'Visualize por dia, semana ou mês'}
            </p>
          </div>
          <div style={{ display: 'flex', border: '1px solid #E0E0E0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#F8F8F8', padding: '3px' }}>
            {([
              { mode: 'lista', icon: List, label: 'Lista' },
              { mode: 'calendario', icon: CalendarIcon, label: 'Calendário' },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                style={{
                  padding: '7px 14px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
                  backgroundColor: displayMode === mode ? '#fff' : 'transparent',
                  color: displayMode === mode ? '#FF6600' : '#7B7B7B',
                  borderRadius: '7px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: displayMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── LISTA VIEW ── */}
        {displayMode === 'lista' && (
          <div>
            {/* Search + filters bar */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
                <Search className="h-4 w-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9B9B9B', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por objeto, órgão ou cidade..."
                  style={{ width: '100%', height: '40px', border: '1px solid #E0E0E0', borderRadius: '10px', padding: '0 38px 0 36px', fontSize: '13.5px', color: '#262E3A', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#FF6600')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E0E0E0')}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9B9B9B', padding: '2px', display: 'flex' }}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Period quick filters */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {([
                  { v: 'todos',  label: 'Todos' },
                  { v: 'hoje',   label: 'Hoje' },
                  { v: 'semana', label: 'Semana' },
                  { v: 'mes',    label: 'Mês' },
                ] as const).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setPeriodFilter(opt.v)}
                    style={{
                      padding: '7px 14px', fontSize: '12.5px', fontWeight: 700,
                      border: `1px solid ${periodFilter === opt.v ? '#FF6600' : '#E0E0E0'}`,
                      backgroundColor: periodFilter === opt.v ? '#FFF3E8' : '#fff',
                      color: periodFilter === opt.v ? '#FF6600' : '#7B7B7B',
                      borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* UF filter (only when there's variety) */}
              {availableUfs.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter className="h-3.5 w-3.5" style={{ color: '#9B9B9B' }} />
                  <select
                    value={ufFilter}
                    onChange={e => setUfFilter(e.target.value)}
                    style={{ height: '36px', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 10px', fontSize: '12.5px', color: '#262E3A', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <option value="todos">Todos os estados</option>
                    {availableUfs.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              )}

              {/* Reload */}
              <button
                onClick={reload}
                disabled={loading}
                title="Recarregar do PNCP"
                style={{ height: '36px', width: '36px', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#fff', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7B7B7B' }}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* List body */}
            <div style={{ padding: '20px', backgroundColor: '#FAFAFA', minHeight: '300px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px', color: '#7B7B7B' }}>
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#FF6600' }} />
                  <span style={{ fontSize: '14px' }}>Buscando oportunidades no PNCP...</span>
                </div>
              ) : !hasConfig ? (
                <EmptyState
                  emoji="🎯"
                  title="Configure suas palavras-chave"
                  desc="Para começar a receber oportunidades, defina os termos relacionados ao seu negócio."
                  cta={{ label: 'Definir Oportunidades', onClick: () => setModalOpen(true) }}
                />
              ) : filteredList.length === 0 ? (
                licitacoes.length === 0 ? (
                  <EmptyState
                    emoji="🔍"
                    title="Nenhuma oportunidade encontrada"
                    desc="Não encontramos licitações com seus termos atuais nos últimos 3 meses. Tente ajustar suas palavras-chave ou ampliar a região."
                    cta={{ label: 'Ajustar configuração', onClick: () => setModalOpen(true) }}
                  />
                ) : (
                  <EmptyState
                    emoji="🧐"
                    title="Nenhum resultado para os filtros aplicados"
                    desc="Tente limpar a busca ou alterar os filtros de período/estado."
                    cta={{ label: 'Limpar filtros', onClick: () => { setSearch(''); setPeriodFilter('todos'); setUfFilter('todos'); } }}
                  />
                )
              ) : (
                <>
                  {groupedList.map(group => (
                    <div key={group.label} style={{ marginBottom: '20px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px',
                        position: 'sticky', top: 0, backgroundColor: '#FAFAFA', padding: '4px 0', zIndex: 2,
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#262E3A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {group.label}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#FF6600', backgroundColor: '#FFF3E8', padding: '2px 8px', borderRadius: '10px' }}>
                          {group.items.length}
                        </span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#E8E8E8' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {group.items.map(l => <LicitacaoMiniCard key={l.numeroControlePNCP} l={l} />)}
                      </div>
                    </div>
                  ))}

                  {/* Load more */}
                  {visibleCount < filteredList.length && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                      <button
                        onClick={() => setVisibleCount(c => c + 20)}
                        style={{
                          backgroundColor: '#fff', border: '1px solid #E0E0E0', color: '#262E3A',
                          padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FF6600'; (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#FF6600'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fff'; (e.currentTarget as HTMLElement).style.color = '#262E3A'; (e.currentTarget as HTMLElement).style.borderColor = '#E0E0E0'; }}
                      >
                        Carregar mais ({filteredList.length - visibleCount} restantes)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── CALENDÁRIO VIEW ── */}
        {displayMode === 'calendario' && (
          <div>
            {/* Calendar controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#9B9B9B', fontWeight: 600, marginBottom: '6px' }}>Período</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #E0E0E0', backgroundColor: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft className="h-4 w-4" style={{ color: '#7B7B7B' }} />
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#262E3A', minWidth: '140px', textAlign: 'center' }}>
                    {calMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #E0E0E0', backgroundColor: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight className="h-4 w-4" style={{ color: '#7B7B7B' }} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', border: '1px solid #E0E0E0', borderRadius: '8px', overflow: 'hidden' }}>
                {(['semanal', 'mensal'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '8px 18px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
                      backgroundColor: viewMode === mode ? '#262E3A' : '#fff',
                      color: viewMode === mode ? '#fff' : '#262E3A',
                      transition: 'all 0.15s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <CalendarGrid
              month={calMonth}
              viewMode={viewMode}
              byDay={byDay}
              selectedDay={selectedDay}
              onSelectDay={day => setSelectedDay(selectedDay === day ? null : day)}
              loading={loading}
            />

            {/* Selected day licitações (inside calendar mode) */}
            {selectedDay && selectedLics.length > 0 && (
              <div style={{ padding: '20px', borderTop: '1px solid #F0F0F0', backgroundColor: '#FAFAFA' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#262E3A', margin: 0 }}>
                    Licitações em {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    <span style={{ marginLeft: '8px', fontSize: '13px', color: '#FF6600' }}>({selectedLics.length})</span>
                  </h3>
                  <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B9B9B' }}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedLics.map(l => <LicitacaoMiniCard key={l.numeroControlePNCP} l={l} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <DefinirModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

// ── Calendar Grid ─────────────────────────────────────────────────────────────

function CalendarGrid({ month, viewMode, byDay, selectedDay, onSelectDay, loading }: {
  month: Date; viewMode: 'mensal' | 'semanal';
  byDay: Record<string, any[]>; selectedDay: string | null;
  onSelectDay: (d: string) => void; loading: boolean;
}) {
  const today = new Date();
  const DIAS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

  if (viewMode === 'mensal') {
    // Build month grid
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);

    const monthName = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
      <div>
        {/* Month header */}
        <div style={{ backgroundColor: '#FF6600', padding: '14px', textAlign: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', textTransform: 'capitalize' }}>{monthName}</span>
        </div>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', backgroundColor: '#FF6600' }}>
          {DIAS.map(d => (
            <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#fff', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map((date, i) => {
            if (!date) return (
              <div key={i} style={{ minHeight: '100px', borderRight: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0', backgroundColor: '#FAFAFA' }} />
            );
            const k = dayKey(date);
            const count = byDay[k]?.length || 0;
            const isToday = isSameDay(date, today);
            const isSelected = selectedDay === k;
            const isOtherMonth = date.getMonth() !== month.getMonth();

            return (
              <div
                key={i}
                onClick={() => count > 0 && onSelectDay(k)}
                style={{
                  minHeight: '100px', borderRight: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0',
                  padding: '6px 8px', cursor: count > 0 ? 'pointer' : 'default',
                  backgroundColor: isSelected ? '#FFF0E6' : '#fff',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (count > 0 && !isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#FFF8F3'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#fff'; }}
              >
                <div style={{
                  fontSize: '13px', fontWeight: isToday ? 800 : 500,
                  color: isOtherMonth ? '#CFCFCF' : isToday ? '#FF6600' : '#262E3A',
                  marginBottom: '6px',
                }}>
                  {date.getDate()}
                </div>
                {count > 0 && !loading && (
                  <div style={{
                    backgroundColor: '#FF6600', color: '#fff', fontSize: '11px', fontWeight: 700,
                    padding: '4px 6px', borderRadius: '4px', textAlign: 'center',
                  }}>
                    Licitações: {count}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Semanal view
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay()); weekStart.setHours(0,0,0,0);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });

  return (
    <div>
      <div style={{ backgroundColor: '#FF6600', padding: '14px', textAlign: 'center' }}>
        <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
          {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', backgroundColor: '#FF6600' }}>
        {DIAS.map(d => (
          <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#fff', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {weekDays.map((date, i) => {
          const k = dayKey(date);
          const count = byDay[k]?.length || 0;
          const isToday = isSameDay(date, today);
          const isSelected = selectedDay === k;
          return (
            <div key={i} onClick={() => count > 0 && onSelectDay(k)}
              style={{ minHeight: '140px', borderRight: '1px solid #F0F0F0', padding: '8px', cursor: count > 0 ? 'pointer' : 'default', backgroundColor: isSelected ? '#FFF0E6' : '#fff' }}>
              <div style={{ fontSize: '14px', fontWeight: isToday ? 800 : 500, color: isToday ? '#FF6600' : '#262E3A', marginBottom: '8px' }}>
                {date.getDate()}
              </div>
              {count > 0 && !loading && (
                <div style={{ backgroundColor: '#FF6600', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '5px 6px', borderRadius: '4px', textAlign: 'center' }}>
                  Licitações: {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ emoji, title, desc, cta }: {
  emoji: string;
  title: string;
  desc: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{emoji}</div>
      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#262E3A', margin: '0 0 6px 0' }}>{title}</h3>
      <p style={{ fontSize: '13.5px', color: '#7B7B7B', margin: '0 0 20px 0', maxWidth: '400px', lineHeight: 1.55 }}>{desc}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          style={{
            backgroundColor: '#FF6600', color: '#fff', border: 'none',
            borderRadius: '10px', padding: '11px 22px', fontSize: '13px',
            fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e05a00')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF6600')}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

// ── Mini Card ─────────────────────────────────────────────────────────────────

function LicitacaoMiniCard({ l }: { l: any }) {
  function getSitStyle(nome: string): React.CSSProperties {
    const lower = (nome || '').toLowerCase();
    if (lower.includes('divulg') || lower.includes('aberta')) return { backgroundColor: '#259F46', color: '#fff' };
    if (lower.includes('encerr') || lower.includes('cancel')) return { backgroundColor: '#FF4500', color: '#fff' };
    if (lower.includes('suspens')) return { backgroundColor: '#FFA500', color: '#fff' };
    return { backgroundColor: '#7B7B7B', color: '#fff' };
  }

  function buildPncpUrl(id: string) {
    try {
      const p = id.split('-'); const cnpj = p[0];
      const [seqStr, ano] = p[p.length - 1].split('/');
      return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${parseInt(seqStr, 10)}`;
    } catch { return '#'; }
  }

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '13px', color: '#262E3A', marginBottom: '8px', lineHeight: '1.5' }}>
        <strong>Objeto:</strong> {l.objetoCompra}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '12px', color: '#7B7B7B', marginBottom: '10px' }}>
        <span><strong style={{ color: '#262E3A' }}>Órgão:</strong> {l.orgaoEntidade?.razaoSocial}</span>
        <span><strong style={{ color: '#262E3A' }}>Cidade:</strong> {l.unidadeOrgao?.municipioNome} - {l.unidadeOrgao?.ufSigla}</span>
        {l.dataAberturaProposta && (
          <span><strong style={{ color: '#262E3A' }}>Abertura:</strong> {formatDateTime(l.dataAberturaProposta)}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ ...getSitStyle(l.situacaoCompraNome), fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
          {l.situacaoCompraNome || 'N/A'}
        </span>
        {l.valorTotalEstimado > 0 && (
          <span style={{ backgroundColor: '#259F46', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
            {formatCurrency(l.valorTotalEstimado)}
          </span>
        )}
        <a href={buildPncpUrl(l.numeroControlePNCP)} target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: '#1a237e', textDecoration: 'none', border: '1px solid #1a237e', borderRadius: '5px', padding: '4px 10px' }}>
          Ver no PNCP →
        </a>
      </div>
    </div>
  );
}

// ── Definir Modal (single screen) ────────────────────────────────────────────

const UF_NAMES: Record<string, string> = {
  AC:'Acre', AL:'Alagoas', AM:'Amazonas', AP:'Amapá', BA:'Bahia', CE:'Ceará',
  DF:'Distrito Federal', ES:'Espírito Santo', GO:'Goiás', MA:'Maranhão',
  MG:'Minas Gerais', MS:'Mato Grosso do Sul', MT:'Mato Grosso', PA:'Pará',
  PB:'Paraíba', PE:'Pernambuco', PI:'Piauí', PR:'Paraná', RJ:'Rio de Janeiro',
  RN:'Rio Grande do Norte', RO:'Rondônia', RR:'Roraima', RS:'Rio Grande do Sul',
  SC:'Santa Catarina', SE:'Sergipe', SP:'São Paulo', TO:'Tocantins',
};

function DefinirModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputKw, setInputKw] = useState('');
  const [scope, setScope] = useState<'brasil' | 'estado' | 'cidade'>('brasil');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const [cidades, setCidades] = useState<{ nome: string; id: string }[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing config — API now returns normalized data (clean keywords + region)
  useEffect(() => {
    fetch('/api/oportunidades')
      .then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => {
        if (rows.length === 0) return;
        const row = rows[0];

        // keywords: always a clean JSON array from API
        let kws: string[] = [];
        try {
          const parsed = JSON.parse(row.licitacoes_oportunidade_tagmento);
          kws = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
        } catch {
          kws = (row.licitacoes_oportunidade_tagmento || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        setKeywords(kws);

        // region: already normalized to "" | "SP" | "SP:City"
        const reg = row.licitacoes_oportunidade_regioes || '';
        if (reg.includes(':')) {
          const idx = reg.indexOf(':');
          setUf(reg.slice(0, idx)); setCidade(reg.slice(idx + 1)); setScope('cidade');
        } else if (reg) {
          setUf(reg); setScope('estado');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, []);

  useEffect(() => {
    if (!uf) { setCidades([]); return; }
    setLoadingCidades(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((d: any[]) => setCidades(d.map(m => ({ nome: m.nome, id: String(m.id) }))))
      .finally(() => setLoadingCidades(false));
  }, [uf]);

  function addKeyword() {
    const kw = inputKw.trim();
    if (kw && !keywords.includes(kw)) setKeywords(prev => [...prev, kw]);
    setInputKw('');
    inputRef.current?.focus();
  }

  async function save() {
    if (keywords.length === 0) return;
    setSaving(true);
    let regioes = '';
    if (scope === 'estado') regioes = uf;
    if (scope === 'cidade') regioes = cidade ? `${uf}:${cidade}` : uf;

    try {
      await fetch('/api/oportunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palavras: JSON.stringify(keywords), regioes }),
      });
      onSaved();
    } finally { setSaving(false); }
  }

  const canSave = keywords.length > 0 && (scope === 'brasil' || !!uf);

  const scopeOptions = [
    { value: 'brasil', icon: '🇧🇷', label: 'Brasil inteiro', desc: 'Busca em todos os estados' },
    { value: 'estado', icon: '📍', label: 'Estado específico', desc: 'Filtra por um estado' },
    { value: 'cidade', icon: '🏙️', label: 'Estado + Cidade', desc: 'Filtra por cidade exata' },
  ] as const;

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FFF3E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎯</div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Configurar Oportunidades</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#7B7B7B', margin: 0, paddingLeft: '46px' }}>
              Defina os termos e a região para receber oportunidades relevantes ao seu negócio
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B9B9B', padding: '4px', flexShrink: 0, borderRadius: '6px' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F5F5')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>
          {loadingConfig ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', gap: '10px' }}>
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#FF6600' }} />
              <span style={{ color: '#7B7B7B', fontSize: '14px' }}>Carregando configurações...</span>
            </div>
          ) : (
            <>
              {/* ── Seção 1: Palavras-chave ── */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#FF6600', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#262E3A' }}>Palavras-chave do seu negócio</span>
                </div>
                <p style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '12px', marginLeft: '32px' }}>
                  Adicione termos que descrevem seus produtos ou serviços. Ex: <em>"impressora"</em>, <em>"consultoria ambiental"</em>
                </p>

                {/* Input row */}
                <div style={{ display: 'flex', gap: '8px', marginLeft: '32px', marginBottom: '12px' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputKw}
                    onChange={e => setInputKw(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                    placeholder="Digite e pressione Enter ou clique em +"
                    style={{ flex: 1, height: '44px', border: '2px solid #E8E8E8', borderRadius: '10px', padding: '0 14px', fontSize: '14px', outline: 'none', transition: 'border-color 0.15s', color: '#262E3A' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#FF6600')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#E8E8E8')}
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!inputKw.trim()}
                    style={{ width: '44px', height: '44px', backgroundColor: inputKw.trim() ? '#FF6600' : '#E8E8E8', color: inputKw.trim() ? '#fff' : '#9B9B9B', border: 'none', borderRadius: '10px', cursor: inputKw.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {/* Chips container */}
                <div style={{ marginLeft: '32px', minHeight: '48px', backgroundColor: '#FAFAFA', border: '1px dashed #E0E0E0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
                  {keywords.length === 0 ? (
                    <span style={{ fontSize: '13px', color: '#C0C0C0', fontStyle: 'italic', lineHeight: '28px' }}>Nenhuma palavra-chave adicionada ainda</span>
                  ) : keywords.map(kw => (
                    <span key={kw} style={{ backgroundColor: '#1a237e', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '5px 10px 5px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
                      {kw}
                      <button
                        onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}
                        style={{ background: 'rgba(255,255,255,0.25)', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.4)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {keywords.length > 0 && (
                  <div style={{ marginLeft: '32px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#9B9B9B' }}>{keywords.length} palavra{keywords.length !== 1 ? 's' : ''}-chave{keywords.length !== 1 ? 's' : ''} configurada{keywords.length !== 1 ? 's' : ''}</span>
                    <button onClick={() => setKeywords([])} style={{ fontSize: '12px', color: '#FF4500', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Limpar tudo
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #F0F0F0', marginBottom: '28px' }} />

              {/* ── Seção 2: Região ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#FF6600', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#262E3A' }}>Região de abrangência</span>
                </div>
                <p style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '14px', marginLeft: '32px' }}>
                  Escolha onde você quer buscar oportunidades
                </p>

                {/* Scope cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginLeft: '32px', marginBottom: '16px' }}>
                  {scopeOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setScope(opt.value); if (opt.value === 'brasil') { setUf(''); setCidade(''); } }}
                      style={{
                        padding: '14px 12px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
                        border: `2px solid ${scope === opt.value ? '#FF6600' : '#E8E8E8'}`,
                        backgroundColor: scope === opt.value ? '#FFF3E8' : '#fff',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '22px', marginBottom: '6px' }}>{opt.icon}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: scope === opt.value ? '#FF6600' : '#262E3A', marginBottom: '3px' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: '#9B9B9B' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* UF select */}
                {(scope === 'estado' || scope === 'cidade') && (
                  <div style={{ marginLeft: '32px', display: 'grid', gridTemplateColumns: scope === 'cidade' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#262E3A', marginBottom: '6px' }}>Estado</label>
                      <select
                        value={uf}
                        onChange={e => { setUf(e.target.value); setCidade(''); }}
                        style={{ width: '100%', height: '42px', border: '2px solid #E8E8E8', borderRadius: '10px', padding: '0 12px', fontSize: '14px', color: '#262E3A', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' }}
                      >
                        <option value="">Selecione o estado</option>
                        {UFS.map(u => <option key={u} value={u}>{UF_NAMES[u] || u} ({u})</option>)}
                      </select>
                    </div>

                    {scope === 'cidade' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#262E3A', marginBottom: '6px' }}>
                          Cidade
                          {loadingCidades && <Loader2 className="h-3 w-3 animate-spin inline ml-2" style={{ color: '#FF6600' }} />}
                        </label>
                        <select
                          value={cidade}
                          onChange={e => setCidade(e.target.value)}
                          disabled={!uf || loadingCidades}
                          style={{ width: '100%', height: '42px', border: '2px solid #E8E8E8', borderRadius: '10px', padding: '0 12px', fontSize: '14px', color: '#262E3A', outline: 'none', cursor: uf ? 'pointer' : 'not-allowed', backgroundColor: uf ? '#fff' : '#FAFAFA', opacity: uf ? 1 : 0.6 }}
                        >
                          <option value="">Todas as cidades</option>
                          {cidades.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary pill */}
                {(scope === 'brasil' || uf) && (
                  <div style={{ marginLeft: '32px', marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F0F4FF', border: '1px solid #C7D2FE', borderRadius: '20px', padding: '6px 14px' }}>
                    <MapPin className="h-3.5 w-3.5" style={{ color: '#1a237e' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a237e' }}>
                      {scope === 'brasil' ? 'Buscando em todo o Brasil' : scope === 'estado' ? `Apenas ${UF_NAMES[uf] || uf}` : cidade ? `${cidade} - ${uf}` : `Todo o estado de ${UF_NAMES[uf] || uf}`}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid #F0F0F0', display: 'flex', gap: '12px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, height: '48px', backgroundColor: '#F5F5F5', color: '#262E3A', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EBEBEB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F5F5F5')}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!canSave || saving}
            style={{ flex: 2, height: '48px', backgroundColor: canSave && !saving ? '#FF6600' : '#E0E0E0', color: canSave && !saving ? '#fff' : '#9B9B9B', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: canSave && !saving ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (canSave && !saving) (e.currentTarget as HTMLElement).style.backgroundColor = '#e05a00'; }}
            onMouseLeave={e => { if (canSave && !saving) (e.currentTarget as HTMLElement).style.backgroundColor = '#FF6600'; }}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              <>✓ Salvar oportunidades {keywords.length > 0 && <span style={{ opacity: 0.8, fontSize: '12px' }}>({keywords.length} termo{keywords.length !== 1 ? 's' : ''})</span>}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
