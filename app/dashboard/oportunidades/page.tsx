'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Loader2, MapPin } from 'lucide-react';
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OportunidadesPage() {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [viewMode, setViewMode] = useState<'mensal' | 'semanal'>('mensal');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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
        const { data, ts, kws } = JSON.parse(raw);
        if (Date.now() - ts < 4 * 3600 * 1000) {
          setLicitacoes(data); setKeywords(kws || []); setHasConfig(kws?.length > 0);
          setLoading(false); return;
        }
      }
    } catch {}

    fetch('/api/oportunidades/buscar')
      .then(r => r.ok ? r.json() : { keywords: [], data: [] })
      .then((json: any) => {
        const kws = json.keywords || [];
        const data = json.data || [];
        setKeywords(kws); setUfConfig(json.uf || ''); setLicitacoes(data);
        setHasConfig(kws.length > 0);
        if (kws.length > 0) {
          try { localStorage.setItem('oportunidades_cache', JSON.stringify({ data, ts: Date.now(), kws })); } catch {}
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

  function reload() {
    try { localStorage.removeItem('oportunidades_cache'); } catch {}
    setLoading(true);
    fetch('/api/oportunidades/buscar')
      .then(r => r.ok ? r.json() : { keywords: [], data: [] })
      .then((json: any) => {
        const kws = json.keywords || [];
        const data = json.data || [];
        setKeywords(kws); setUfConfig(json.uf || ''); setLicitacoes(data); setHasConfig(kws.length > 0);
        if (kws.length > 0) {
          try { localStorage.setItem('oportunidades_cache', JSON.stringify({ data, ts: Date.now(), kws })); } catch {}
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

      {/* Calendar section */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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

        {/* Calendar grid */}
        <CalendarGrid
          month={calMonth}
          viewMode={viewMode}
          byDay={byDay}
          selectedDay={selectedDay}
          onSelectDay={day => setSelectedDay(selectedDay === day ? null : day)}
          loading={loading}
        />
      </div>

      {/* Selected day licitações */}
      {selectedDay && selectedLics.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#262E3A' }}>
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

// ── Definir Modal (2 steps) ───────────────────────────────────────────────────

function DefinirModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState(1);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputKw, setInputKw] = useState('');
  const [scope, setScope] = useState<'brasil' | 'estado' | 'cidade'>('brasil');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const [cidades, setCidades] = useState<{ nome: string; id: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing config
  useEffect(() => {
    fetch('/api/oportunidades')
      .then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => {
        if (rows.length === 0) return;
        const row = rows[0];
        try { setKeywords(JSON.parse(row.licitacoes_oportunidade_tagmento)); }
        catch { setKeywords(row.licitacoes_oportunidade_tagmento?.split(',').map((s: string) => s.trim()).filter(Boolean) || []); }
        const reg = row.licitacoes_oportunidade_regioes || '';
        if (reg.includes(':')) { const [u, c] = reg.split(':'); setUf(u); setCidade(c); setScope('cidade'); }
        else if (reg) { setUf(reg); setScope('estado'); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!uf) { setCidades([]); return; }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json()).then((d: any[]) => setCidades(d.map(m => ({ nome: m.nome, id: String(m.id) }))));
  }, [uf]);

  function addKeyword() {
    const kw = inputKw.trim();
    if (kw && !keywords.includes(kw)) setKeywords(prev => [...prev, kw]);
    setInputKw('');
    inputRef.current?.focus();
  }

  async function save() {
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

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '640px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {step === 1 ? 'Palavras-chaves de interesse do seu negócio' : 'Região de interesse'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B', padding: '4px' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div style={{ padding: '0 28px 28px' }}>
          {step === 1 ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#262E3A', marginBottom: '6px' }}>Palavras-chaves</label>
                <div style={{ fontSize: '13px', color: '#FF6600', marginBottom: '10px' }}>
                  Ex: "impressora", "aluguel de veículos", "consultoria ambiental"
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputKw}
                    onChange={e => setInputKw(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                    placeholder="Digite uma palavra-chave..."
                    style={{ flex: 1, height: '44px', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 14px', fontSize: '14px', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#1a237e')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#E0E0E0')}
                  />
                  <button
                    onClick={addKeyword}
                    style={{ width: '44px', height: '44px', backgroundColor: '#262E3A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Keyword chips */}
              {keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                  {keywords.map(kw => (
                    <span key={kw} style={{ backgroundColor: '#1a237e', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {kw}
                      <button onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', alignItems: 'center' }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => keywords.length > 0 && setStep(2)}
                disabled={keywords.length === 0}
                style={{ width: '100%', height: '50px', backgroundColor: keywords.length === 0 ? '#9B9B9B' : '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: keywords.length === 0 ? 'not-allowed' : 'pointer' }}
              >
                Próximo
              </button>
            </>
          ) : (
            <>
              {/* Step 2: Region */}
              <div style={{ marginBottom: '20px' }}>
                {[
                  { value: 'brasil', label: '🇧🇷 Brasil inteiro' },
                  { value: 'estado', label: '📍 Estado específico' },
                  { value: 'cidade', label: '🏙️ Estado + Cidade' },
                ].map(opt => (
                  <label key={opt.value}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '8px', border: `2px solid ${scope === opt.value ? '#FF6600' : '#E0E0E0'}`, cursor: 'pointer', marginBottom: '8px', backgroundColor: scope === opt.value ? '#FFF8F3' : '#fff', transition: 'all 0.15s' }}>
                    <input type="radio" name="scope" value={opt.value} checked={scope === (opt.value as any)} onChange={() => setScope(opt.value as any)}
                      style={{ accentColor: '#FF6600', width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#262E3A' }}>{opt.label}</span>
                  </label>
                ))}
              </div>

              {(scope === 'estado' || scope === 'cidade') && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#262E3A', marginBottom: '6px' }}>Estado</label>
                  <select value={uf} onChange={e => { setUf(e.target.value); setCidade(''); }}
                    style={{ width: '100%', height: '40px', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', appearance: 'none' }}>
                    <option value="">Selecione o estado</option>
                    {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              )}

              {scope === 'cidade' && cidades.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#262E3A', marginBottom: '6px' }}>Cidade</label>
                  <select value={cidade} onChange={e => setCidade(e.target.value)}
                    style={{ width: '100%', height: '40px', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', appearance: 'none' }}>
                    <option value="">Todas as cidades</option>
                    {cidades.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setStep(1)}
                  style={{ flex: 1, height: '50px', backgroundColor: '#F5F5F5', color: '#262E3A', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                  ← Voltar
                </button>
                <button
                  onClick={save}
                  disabled={saving || (scope !== 'brasil' && !uf)}
                  style={{ flex: 2, height: '50px', backgroundColor: saving ? '#9B9B9B' : '#FF6600', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar oportunidades'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
