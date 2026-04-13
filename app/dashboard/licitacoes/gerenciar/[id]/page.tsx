'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckSquare, FileText, Paperclip, ShieldCheck,
  Calendar, Plus, Trash2, Check, ChevronLeft, ChevronRight,
  ExternalLink, Clock, X, Search, List,
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LicitacaoSummary {
  lg_id: number;
  lg_identificador: string;
  lg_objeto: string | null;
  lg_orgao: string | null;
  lg_cidade: string | null;
  lg_uf: string | null;
  lg_valor: number | null;
  lg_situacao: string | null;
  lg_data_abertura: string | null;
  lg_data_encerramento: string | null;
}

interface Tarefa {
  licitacoes_tarefa_id: number;
  licitacoes_tarefa_nome: string;
  licitacoes_tarefa_prazo: string | null;
  licitacoes_tarefa_status: number;
  licitacoes_tarefa_prioridade?: string;
  licitacoes_tarefa_anotacao?: string;
  licitacoes_tarefa_subtarefas?: string;
  licitacoes_tarefa_nome_responsavel?: string;
}

interface Anotacao {
  licitacoes_anotacao_id: number;
  licitacoes_anotacao_texto: string;
  licitacoes_anotacao_data?: string;
  autor_nome?: string;
}

interface Habilitacao {
  licitacoes_habilitacao_id: number;
  licitacoes_habilitacao_nome: string;
  licitacoes_habilitacao_documento: string;
  licitacoes_habilitacao_data_validade: string | null;
}

interface Anexo {
  licitacoes_anexo_id: number;
  licitacoes_anexo_nome: string;
  licitacoes_anexo_documento: string;
  licitacoes_anexo_data: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSituacaoStyle(nome: string): React.CSSProperties {
  const lower = nome?.toLowerCase() || '';
  if (lower.includes('encerr') || lower.includes('fechad') || lower.includes('cancel'))
    return { backgroundColor: '#FF4500', color: '#fff' };
  if (lower.includes('divulg') || lower.includes('aberta') || lower.includes('aberto'))
    return { backgroundColor: '#259F46', color: '#fff' };
  if (lower.includes('suspens'))
    return { backgroundColor: '#FFA500', color: '#fff' };
  if (lower.includes('publicad'))
    return { backgroundColor: '#FFD700', color: '#262E3A' };
  return { backgroundColor: '#7B7B7B', color: '#fff' };
}

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

// ─── Calendar ─────────────────────────────────────────────────────────────────

function CalendarView({ tarefas }: { tarefas: Tarefa[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map prazo dates to task names
  const tasksByDate: Record<string, Tarefa[]> = {};
  tarefas.forEach(t => {
    if (!t.licitacoes_tarefa_prazo) return;
    const d = t.licitacoes_tarefa_prazo.split('T')[0]; // yyyy-mm-dd
    if (!tasksByDate[d]) tasksByDate[d] = [];
    tasksByDate[d].push(t);
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '16px' }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B', padding: '4px' }}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#262E3A' }}>
          {monthNames[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B', padding: '4px' }}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#9B9B9B', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={i}
              style={{
                minHeight: '52px',
                border: isToday ? '2px solid #FF6600' : '1px solid #F0F0F0',
                borderRadius: '4px',
                padding: '4px',
                backgroundColor: isToday ? '#FFF8F5' : '#fff',
              }}
            >
              <div style={{
                fontSize: '12px',
                fontWeight: isToday ? 700 : 400,
                color: isToday ? '#FF6600' : '#262E3A',
                marginBottom: '2px',
              }}>
                {day}
              </div>
              {dayTasks.map(t => (
                <div
                  key={t.licitacoes_tarefa_id}
                  style={{
                    fontSize: '10px',
                    backgroundColor: t.licitacoes_tarefa_status === 1 ? '#E8F5E9' : '#FFF3E0',
                    color: t.licitacoes_tarefa_status === 1 ? '#259F46' : '#FF6600',
                    borderRadius: '3px',
                    padding: '1px 4px',
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={t.licitacoes_tarefa_nome}
                >
                  {t.licitacoes_tarefa_nome}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Tarefas ─────────────────────────────────────────────────────────────

const PRIORIDADES_LIC = ['Baixa', 'Média', 'Alta', 'Urgente'];

function prioColor(p: string | undefined) {
  switch (p?.toLowerCase()) {
    case 'urgente': return { backgroundColor: '#FF4500', color: '#fff' };
    case 'alta':    return { backgroundColor: '#FF6600', color: '#fff' };
    case 'baixa':   return { backgroundColor: '#259F46', color: '#fff' };
    default:        return { backgroundColor: '#FFD700', color: '#262E3A' };
  }
}

function CalendarDia({ tarefas }: { tarefas: Tarefa[] }) {
  const today = new Date();
  const [date, setDate] = useState(today);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const tasksByHour: Record<number, Tarefa[]> = {};
  tarefas.forEach(t => {
    if (!t.licitacoes_tarefa_prazo) return;
    const d = new Date(t.licitacoes_tarefa_prazo);
    if (d.toISOString().split('T')[0] === dateStr) {
      const h = d.getHours();
      if (!tasksByHour[h]) tasksByHour[h] = [];
      tasksByHour[h].push(t);
    }
  });
  function prev() { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d); }
  function next() { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d); }
  const label = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '16px' }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B' }}><ChevronLeft className="h-4 w-4" /></button>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#262E3A', textTransform: 'capitalize' }}>{label}</span>
        <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B' }}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
        {hours.map(h => (
          <div key={h} className="flex gap-2" style={{ minHeight: '36px', borderTop: '1px solid #F0F0F0', padding: '4px 0' }}>
            <span style={{ fontSize: '11px', color: '#9B9B9B', width: '32px', flexShrink: 0, paddingTop: '2px' }}>{String(h).padStart(2,'0')}:00</span>
            <div className="flex flex-wrap gap-1 flex-1">
              {(tasksByHour[h] || []).map(t => (
                <span key={t.licitacoes_tarefa_id} style={{ fontSize: '10px', backgroundColor: t.licitacoes_tarefa_status===1?'#E8F5E9':'#FFF3E0', color: t.licitacoes_tarefa_status===1?'#259F46':'#FF6600', borderRadius: '3px', padding: '1px 6px' }}>
                  {t.licitacoes_tarefa_nome}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarSemana({ tarefas }: { tarefas: Tarefa[] }) {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0,0,0,0);
    return d;
  });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const daysStr = days.map(d => d.toISOString().split('T')[0]);
  const tasksByDay: Record<string, Tarefa[]> = {};
  tarefas.forEach(t => {
    if (!t.licitacoes_tarefa_prazo) return;
    const ds = t.licitacoes_tarefa_prazo.split('T')[0];
    if (!tasksByDay[ds]) tasksByDay[ds] = [];
    tasksByDay[ds].push(t);
  });
  function prev() { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); }
  function next() { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); }
  const todayStr = today.toISOString().split('T')[0];
  const endStr = days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const startStr = days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '16px' }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B' }}><ChevronLeft className="h-4 w-4" /></button>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#262E3A' }}>{startStr} — {endStr}</span>
        <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B' }}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((d, i) => {
          const ds = daysStr[i];
          const isToday = ds === todayStr;
          return (
            <div key={ds} style={{ minHeight: '90px', border: isToday ? '2px solid #FF6600' : '1px solid #F0F0F0', borderRadius: '6px', padding: '6px 4px', backgroundColor: isToday ? '#FFF8F5' : '#fff' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: isToday ? '#FF6600' : '#9B9B9B', textAlign: 'center', marginBottom: '4px' }}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]} {d.getDate()}
              </div>
              {(tasksByDay[ds] || []).map(t => (
                <div key={t.licitacoes_tarefa_id} style={{ fontSize: '9px', backgroundColor: t.licitacoes_tarefa_status===1?'#E8F5E9':'#FFF3E0', color: t.licitacoes_tarefa_status===1?'#259F46':'#FF6600', borderRadius: '2px', padding: '1px 3px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.licitacoes_tarefa_nome}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SubItem { nome: string; prazo: string; }

function TarefasTab({ licitacaoId }: { licitacaoId: string }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [calView, setCalView] = useState<'mes' | 'dia' | 'semana'>('mes');
  const [toast, setToast] = useState<string | null>(null);

  // Form fields
  const [nome, setNome] = useState('');
  const [prazo, setPrazo] = useState('');
  const [prioridade, setPrioridade] = useState('Média');
  const [anotacao, setAnotacao] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [subtarefas, setSubtarefas] = useState<SubItem[]>([]);
  const [subNome, setSubNome] = useState('');
  const [subPrazo, setSubPrazo] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchTarefas = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tarefas/por-licitacao?licitacaoId=${encodeURIComponent(licitacaoId)}`);
    if (res.ok) setTarefas(await res.json());
    setLoading(false);
  }, [licitacaoId]);

  useEffect(() => { fetchTarefas(); }, [fetchTarefas]);

  function addSub() {
    if (!subNome.trim()) return;
    setSubtarefas(prev => [...prev, { nome: subNome.trim(), prazo: subPrazo }]);
    setSubNome(''); setSubPrazo('');
  }

  function resetForm() {
    setNome(''); setPrazo(''); setPrioridade('Média');
    setAnotacao(''); setNomeResponsavel(''); setSubtarefas([]);
    setSubNome(''); setSubPrazo('');
    setShowForm(false);
  }

  async function addTarefa(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/tarefas/por-licitacao?licitacaoId=${encodeURIComponent(licitacaoId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome.trim(), prazo: prazo || null,
        prioridade, anotacao, nomeResponsavel, subtarefas,
      }),
    });
    if (res.ok) {
      const t = await res.json();
      setTarefas(prev => [...prev, t]);
      resetForm();
      setToast('Tarefa criada com sucesso!');
      setTimeout(() => setToast(null), 3500);
    }
    setAdding(false);
  }

  async function toggleStatus(t: Tarefa) {
    const newStatus = t.licitacoes_tarefa_status === 0 ? 1 : 0;
    await fetch(`/api/tarefas/${t.licitacoes_tarefa_id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setTarefas(prev => prev.map(x =>
      x.licitacoes_tarefa_id === t.licitacoes_tarefa_id
        ? { ...x, licitacoes_tarefa_status: newStatus } : x
    ));
  }

  async function deleteTarefa(id: number) {
    await fetch(`/api/tarefas/${id}`, { method: 'DELETE' });
    setTarefas(prev => prev.filter(x => x.licitacoes_tarefa_id !== id));
  }

  const inp: React.CSSProperties = {
    border: '1px solid #E0E0E0', borderRadius: '8px',
    padding: '9px 12px', fontSize: '13px', outline: 'none',
    color: '#262E3A', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box',
  };

  if (loading) return <p style={{ color: '#7B7B7B', fontSize: '14px' }}>Carregando...</p>;

  const now = new Date();
  const todayStr2 = now.toISOString().split('T')[0];
  const emProgresso = tarefas.filter(t => t.licitacoes_tarefa_status === 0).length;
  const concluidas = tarefas.filter(t => t.licitacoes_tarefa_status === 1).length;
  const tarefasHoje = tarefas.filter(t => t.licitacoes_tarefa_prazo?.split('T')[0] === todayStr2).length;
  const emAtraso = tarefas.filter(t =>
    t.licitacoes_tarefa_status === 0 &&
    t.licitacoes_tarefa_prazo != null &&
    new Date(t.licitacoes_tarefa_prazo) < now
  ).length;

  const summaryCards = [
    { label: 'Em progresso', value: emProgresso, color: '#FF6600', bg: '#FFF3E0' },
    { label: 'Concluídas',   value: concluidas,  color: '#259F46', bg: '#E8F5E9' },
    { label: 'Tarefas do dia', value: tarefasHoje, color: '#1976D2', bg: '#E3F2FD' },
    { label: 'Em atraso',   value: emAtraso,    color: '#FF4500', bg: '#FFF0EB' },
  ];

  const calTabs: { key: 'mes' | 'dia' | 'semana'; label: string }[] = [
    { key: 'mes',    label: 'Mês' },
    { key: 'dia',    label: 'Dia' },
    { key: 'semana', label: 'Semana' },
  ];

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', right: '28px', zIndex: 2000,
          backgroundColor: '#259F46', color: '#fff', borderRadius: '10px',
          padding: '14px 22px', fontSize: '14px', fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'fadeIn .2s ease',
        }}>
          <Check className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ backgroundColor: c.bg, borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '11px', color: '#7B7B7B', marginTop: '2px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar section */}
      <div style={{ marginBottom: '20px' }}>
        <div className="flex gap-2 mb-3">
          {calTabs.map(tab => (
            <button key={tab.key} onClick={() => setCalView(tab.key)}
              style={{
                padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                border: calView === tab.key ? 'none' : '1px solid #E0E0E0',
                backgroundColor: calView === tab.key ? '#262E3A' : '#fff',
                color: calView === tab.key ? '#fff' : '#7B7B7B',
                cursor: 'pointer',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        {calView === 'mes'    && <CalendarView tarefas={tarefas} />}
        {calView === 'dia'    && <CalendarDia tarefas={tarefas} />}
        {calView === 'semana' && <CalendarSemana tarefas={tarefas} />}
      </div>

      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: '14px', color: '#7B7B7B' }}>
          {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5"
          style={{
            backgroundColor: '#FF6600', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '7px 14px', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova tarefa
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div
          onClick={resetForm}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <form
            onSubmit={addTarefa}
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#fff', borderRadius: '14px', padding: '28px',
              width: '100%', maxWidth: '520px', maxHeight: '90vh',
              overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#262E3A' }}>Nova tarefa</span>
              <button type="button" onClick={resetForm}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B9B9B', padding: '2px' }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nome */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '5px' }}>Nome da tarefa</label>
              <input type="text" placeholder="Nome da tarefa" value={nome} onChange={e => setNome(e.target.value)} required style={inp} />
            </div>

            {/* Subtarefas */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '5px' }}>Subtarefas</label>
              <div className="flex gap-2 mb-2">
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 10px', backgroundColor: '#fff' }}>
                  <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: '#9B9B9B', marginRight: '6px' }} />
                  <input type="text" placeholder="Subtarefa" value={subNome} onChange={e => setSubNome(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '13px', flex: 1, padding: '8px 0', backgroundColor: 'transparent' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 10px', backgroundColor: '#fff' }}>
                  <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: '#9B9B9B', marginRight: '6px' }} />
                  <input type="datetime-local" value={subPrazo} onChange={e => setSubPrazo(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '12px', padding: '8px 0', backgroundColor: 'transparent' }} />
                </div>
                <button type="button" onClick={addSub}
                  style={{ backgroundColor: '#FF6600', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                  <Check className="h-3 w-3" />
                </button>
              </div>
              {subtarefas.map((s, i) => (
                <div key={i} className="flex items-center gap-2" style={{ fontSize: '12px', color: '#262E3A', backgroundColor: '#F9F9F9', borderRadius: '6px', padding: '5px 10px', marginBottom: '4px', border: '1px solid #E8E8E8' }}>
                  <Check className="h-3 w-3 shrink-0" style={{ color: '#259F46' }} />
                  <span style={{ flex: 1 }}>{s.nome}</span>
                  {s.prazo && <span style={{ color: '#9B9B9B', fontSize: '11px' }}>{s.prazo.replace('T', ' ')}</span>}
                  <button type="button" onClick={() => setSubtarefas(p => p.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF', padding: 0 }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Prazo + Prioridade */}
            <div className="flex gap-3" style={{ marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '5px' }}>Prazo</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 10px', backgroundColor: '#fff' }}>
                  <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: '#9B9B9B', marginRight: '6px' }} />
                  <input type="datetime-local" value={prazo} onChange={e => setPrazo(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '13px', flex: 1, padding: '8px 0', backgroundColor: 'transparent' }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '5px' }}>Prioridade</label>
                <select value={prioridade} onChange={e => setPrioridade(e.target.value)} style={{ ...inp, appearance: 'auto' }}>
                  {PRIORIDADES_LIC.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Responsável */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '5px' }}>Responsável</label>
              <input type="text" value={nomeResponsavel} onChange={e => setNomeResponsavel(e.target.value)} placeholder="Nome do responsável" style={inp} />
            </div>

            {/* Anotações */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '5px' }}>Anotações</label>
              <textarea value={anotacao} onChange={e => setAnotacao(e.target.value)} rows={3} placeholder="Observações..."
                style={{ ...inp, resize: 'vertical' }} />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button type="submit" disabled={adding || !nome.trim()}
                style={{ flex: 1, backgroundColor: '#FF6600', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                {adding ? 'Salvando...' : 'Salvar tarefa'}
              </button>
              <button type="button" onClick={resetForm}
                style={{ backgroundColor: 'transparent', color: '#7B7B7B', border: '1px solid #CFCFCF', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {tarefas.length === 0 ? (
        <p style={{ color: '#9B9B9B', fontSize: '13px' }}>Nenhuma tarefa ainda.</p>
      ) : (
        <div className="space-y-2">
          {tarefas.map(t => {
            const isDone = t.licitacoes_tarefa_status === 1;
            const prio = prioColor(t.licitacoes_tarefa_prioridade);
            return (
              <div key={t.licitacoes_tarefa_id} className="flex items-center gap-3"
                style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '6px', padding: '10px 14px', opacity: isDone ? 0.7 : 1 }}>
                <button onClick={() => toggleStatus(t)}
                  style={{
                    width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                    border: `2px solid ${isDone ? '#259F46' : '#CFCFCF'}`,
                    backgroundColor: isDone ? '#259F46' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                  {isDone && <Check className="h-3 w-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span style={{ fontSize: '13px', color: '#262E3A', textDecoration: isDone ? 'line-through' : 'none' }}>
                    {t.licitacoes_tarefa_nome}
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {t.licitacoes_tarefa_prazo && (
                      <span style={{ fontSize: '11px', color: '#9B9B9B' }}>{formatDate(t.licitacoes_tarefa_prazo)}</span>
                    )}
                    {t.licitacoes_tarefa_prioridade && (
                      <span style={{ ...prio, fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px' }}>
                        {t.licitacoes_tarefa_prioridade}
                      </span>
                    )}
                    {t.licitacoes_tarefa_nome_responsavel && (
                      <span style={{ fontSize: '11px', color: '#7B7B7B' }}>👤 {t.licitacoes_tarefa_nome_responsavel}</span>
                    )}
                  </div>
                  {t.licitacoes_tarefa_anotacao && (
                    <p style={{ fontSize: '11px', color: '#9B9B9B', marginTop: '4px', fontStyle: 'italic' }}>{t.licitacoes_tarefa_anotacao}</p>
                  )}
                </div>
                <button onClick={() => deleteTarefa(t.licitacoes_tarefa_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF', padding: '2px' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FF4500')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#CFCFCF')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Anotações ───────────────────────────────────────────────────────────

function AnotacoesTab({ licitacaoId }: { licitacaoId: string }) {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAnotacoes = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/anotacoes/${encodeURIComponent(licitacaoId)}`);
    if (res.ok) setAnotacoes(await res.json());
    setLoading(false);
  }, [licitacaoId]);

  useEffect(() => { fetchAnotacoes(); }, [fetchAnotacoes]);

  async function addAnotacao() {
    if (!texto.trim()) return;
    setSaving(true);
    const res = await fetch('/api/anotacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: texto.trim(), licitacaoGoverno: licitacaoId }),
    });
    if (res.ok) {
      setTexto('');
      fetchAnotacoes();
    }
    setSaving(false);
  }

  if (loading) return <p style={{ color: '#7B7B7B', fontSize: '14px' }}>Carregando...</p>;

  return (
    <div>
      {/* Add form */}
      <div style={{ marginBottom: '16px' }}>
        <textarea
          placeholder="Escreva sua anotação..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={3}
          style={{
            width: '100%', border: '1px solid #CFCFCF', borderRadius: '6px',
            padding: '10px 12px', fontSize: '13px', resize: 'vertical',
            outline: 'none', marginBottom: '8px', boxSizing: 'border-box',
          }}
        />
        <button
          onClick={addAnotacao}
          disabled={saving || !texto.trim()}
          className="flex items-center gap-1.5"
          style={{
            backgroundColor: '#FF6600', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '7px 16px', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {saving ? 'Salvando...' : 'Adicionar anotação'}
        </button>
      </div>

      {anotacoes.length === 0 ? (
        <p style={{ color: '#9B9B9B', fontSize: '13px' }}>Nenhuma anotação ainda.</p>
      ) : (
        <div className="space-y-3">
          {anotacoes.map(a => (
            <div
              key={a.licitacoes_anotacao_id}
              style={{
                backgroundColor: '#fff', border: '1px solid #E8E8E8',
                borderRadius: '6px', padding: '12px 14px',
              }}
            >
              <p style={{ fontSize: '13px', color: '#262E3A', marginBottom: '6px', whiteSpace: 'pre-wrap' }}>
                {a.licitacoes_anotacao_texto}
              </p>
              <span style={{ fontSize: '11px', color: '#9B9B9B' }}>
                {a.autor_nome || 'Você'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Anexos ──────────────────────────────────────────────────────────────

function AnexosTab({ licitacaoId }: { licitacaoId: string }) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchAnexos = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/anexos?licitacaoGoverno=${encodeURIComponent(licitacaoId)}`);
    if (res.ok) setAnexos(await res.json());
    setLoading(false);
  }, [licitacaoId]);

  useEffect(() => { fetchAnexos(); }, [fetchAnexos]);

  async function addAnexo() {
    if (!nome.trim()) return;
    setSaving(true);
    const res = await fetch('/api/anexos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim(), documento: url.trim(), licitacaoGoverno: licitacaoId }),
    });
    if (res.ok) {
      setNome('');
      setUrl('');
      setShowForm(false);
      fetchAnexos();
    }
    setSaving(false);
  }

  async function deleteAnexo(id: number) {
    await fetch(`/api/anexos/${id}`, { method: 'DELETE' });
    setAnexos(prev => prev.filter(x => x.licitacoes_anexo_id !== id));
  }

  if (loading) return <p style={{ color: '#7B7B7B', fontSize: '14px' }}>Carregando...</p>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5"
          style={{
            backgroundColor: '#FF6600', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '7px 14px', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Novo anexo
        </button>
      </div>

      {showForm && (
        <div
          style={{
            backgroundColor: '#F9F9F9', border: '1px solid #E8E8E8',
            borderRadius: '8px', padding: '16px', marginBottom: '16px',
          }}
        >
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nome do documento"
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                border: '1px solid #CFCFCF', borderRadius: '6px',
                padding: '8px 12px', fontSize: '13px', outline: 'none', width: '100%',
              }}
            />
            <input
              type="text"
              placeholder="URL ou link do arquivo (opcional)"
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{
                border: '1px solid #CFCFCF', borderRadius: '6px',
                padding: '8px 12px', fontSize: '13px', outline: 'none', width: '100%',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={addAnexo}
                disabled={saving || !nome.trim()}
                style={{
                  backgroundColor: '#262E3A', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  backgroundColor: 'transparent', color: '#7B7B7B',
                  border: '1px solid #CFCFCF', borderRadius: '6px',
                  padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {anexos.length === 0 ? (
        <p style={{ color: '#9B9B9B', fontSize: '13px' }}>Nenhum anexo ainda.</p>
      ) : (
        <div className="space-y-2">
          {anexos.map(a => (
            <div
              key={a.licitacoes_anexo_id}
              className="flex items-center gap-3"
              style={{
                backgroundColor: '#fff', border: '1px solid #E8E8E8',
                borderRadius: '6px', padding: '10px 14px',
              }}
            >
              <Paperclip className="h-4 w-4 shrink-0" style={{ color: '#7B7B7B' }} />
              <div className="flex-1 min-w-0">
                <span style={{ fontSize: '13px', color: '#262E3A' }}>{a.licitacoes_anexo_nome}</span>
                {a.licitacoes_anexo_documento && (
                  <a
                    href={a.licitacoes_anexo_documento}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '11px', color: '#FF6600', marginLeft: '8px' }}
                  >
                    <ExternalLink className="h-3 w-3 inline" /> Abrir
                  </a>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#9B9B9B' }}>{formatDate(a.licitacoes_anexo_data)}</span>
              <button
                onClick={() => deleteAnexo(a.licitacoes_anexo_id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF', padding: '2px' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FF4500')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#CFCFCF')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Itens ───────────────────────────────────────────────────────────────

interface ItemLicitacao {
  numeroItem: number;
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  valorUnitarioEstimado: number | null;
  valorTotal: number | null;
  situacaoCompraItem?: { descricao?: string };
  criterioJulgamentoNome?: string;
  tipoBeneficioNome?: string;
  materialOuServico?: string;
}

function ItensTab({ licitacaoId }: { licitacaoId: string }) {
  const [itens, setItens] = useState<ItemLicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErro(false);
      try {
        const res = await fetch(`/api/licitacoes/itens?identificador=${encodeURIComponent(licitacaoId)}`);
        if (res.ok) {
          const data = await res.json();
          setItens(Array.isArray(data) ? data : []);
        } else {
          setErro(true);
        }
      } catch {
        setErro(true);
      }
      setLoading(false);
    }
    load();
  }, [licitacaoId]);

  const itensFiltrados = itens.filter(i =>
    i.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
    String(i.numeroItem).includes(busca)
  );

  const totalEstimado = itens.reduce((acc, i) => acc + (i.valorTotal || 0), 0);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px', color: '#7B7B7B', fontSize: '14px' }}>
      Buscando itens no PNCP...
    </div>
  );

  if (erro) return (
    <div style={{ textAlign: 'center', padding: '48px', color: '#FF4500', fontSize: '14px' }}>
      Não foi possível carregar os itens desta licitação.
    </div>
  );

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total de itens', value: itens.length, color: '#1976D2', bg: '#E3F2FD' },
          { label: 'Valor total estimado', value: totalEstimado > 0 ? formatCurrency(totalEstimado) : '—', color: '#259F46', bg: '#E8F5E9', big: false },
          { label: 'Materiais / Serviços', value: `${itens.filter(i => i.materialOuServico === 'M').length}M / ${itens.filter(i => i.materialOuServico === 'S').length}S`, color: '#FF6600', bg: '#FFF3E0' },
        ].map(c => (
          <div key={c.label} style={{ backgroundColor: c.bg, borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ fontSize: c.big === false && String(c.value).length > 10 ? '14px' : '20px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '11px', color: '#7B7B7B', marginTop: '2px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      {itens.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 12px', backgroundColor: '#fff', marginBottom: '16px' }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: '#9B9B9B', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Buscar item por descrição ou número..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', flex: 1, padding: '10px 0', backgroundColor: 'transparent' }}
          />
          {busca && (
            <button onClick={() => setBusca('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF', padding: 0 }}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {itens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9B9B9B', fontSize: '13px' }}>
          <ShieldCheck className="h-10 w-10 mx-auto mb-3" style={{ color: '#E0E0E0' }} />
          Nenhum item encontrado para esta licitação.
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9F9F9', borderBottom: '1px solid #E8E8E8' }}>
                {['Nº', 'Descrição', 'Qtd', 'Unidade', 'Vl. Unitário', 'Vl. Total', 'Tipo', 'Situação'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: '11px', fontWeight: 700, color: '#262E3A', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.map((item, idx) => {
                const situacao = item.situacaoCompraItem?.descricao || '—';
                const isAtivo = situacao.toLowerCase().includes('ativo') || situacao.toLowerCase().includes('publicad') || situacao === '—';
                return (
                  <tr key={item.numeroItem} style={{ borderBottom: '1px solid #F5F5F5', backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '11px 14px', color: '#9B9B9B', fontWeight: 700, fontSize: '12px' }}>
                      {item.numeroItem}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#262E3A', maxWidth: '320px' }}>
                      <span title={item.descricao} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.descricao || '—'}
                      </span>
                      {item.criterioJulgamentoNome && (
                        <span style={{ fontSize: '10px', color: '#9B9B9B', display: 'block', marginTop: '2px' }}>
                          {item.criterioJulgamentoNome}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#262E3A', whiteSpace: 'nowrap' }}>
                      {item.quantidade != null ? Number(item.quantidade).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#7B7B7B', whiteSpace: 'nowrap' }}>
                      {item.unidadeMedida || '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#262E3A', whiteSpace: 'nowrap' }}>
                      {item.valorUnitarioEstimado != null ? formatCurrency(item.valorUnitarioEstimado) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: '#262E3A', whiteSpace: 'nowrap' }}>
                      {item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {item.materialOuServico && (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: item.materialOuServico === 'M' ? '#E3F2FD' : '#F3E5F5', color: item.materialOuServico === 'M' ? '#1976D2' : '#7B1FA2' }}>
                          {item.materialOuServico === 'M' ? 'Material' : 'Serviço'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: isAtivo ? '#E8F5E9' : '#FFF0EB', color: isAtivo ? '#259F46' : '#FF4500' }}>
                        {situacao}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {itensFiltrados.length === 0 && busca && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#9B9B9B', fontSize: '13px' }}>
              Nenhum item encontrado para "{busca}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Habilitação ─────────────────────────────────────────────────────────

function HabilitacaoTab({ licitacaoId }: { licitacaoId: string }) {
  const [habilitacoes, setHabilitacoes] = useState<Habilitacao[]>([]);
  const [todosDocsUsuario, setTodosDocsUsuario] = useState<Habilitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'novo' | 'existente'>('novo');
  const [nome, setNome] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vinculando, setVinculando] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchExist, setSearchExist] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHabilitacoes = useCallback(async () => {
    setLoading(true);
    const [res, resAll] = await Promise.all([
      fetch(`/api/habilitacoes?licitacaoGoverno=${encodeURIComponent(licitacaoId)}`),
      fetch('/api/habilitacoes?all=true'),
    ]);
    if (res.ok) setHabilitacoes(await res.json());
    if (resAll.ok) setTodosDocsUsuario(await resAll.json());
    setLoading(false);
  }, [licitacaoId]);

  useEffect(() => { fetchHabilitacoes(); }, [fetchHabilitacoes]);

  function resetModal() {
    setNome(''); setDataValidade(''); setFile(null);
    setShowModal(false); setModalTab('novo'); setSearchExist('');
  }

  async function vincularExistente(docId: number) {
    setVinculando(docId);
    const res = await fetch('/api/habilitacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vincular: true, docId, licitacaoGoverno: licitacaoId }),
    });
    if (res.ok) {
      fetchHabilitacoes();
      setToast('Documento vinculado com sucesso!');
      setTimeout(() => setToast(null), 3500);
    }
    setVinculando(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  async function addHabilitacao() {
    if (!nome.trim()) return;
    setSaving(true);

    // Upload file first if provided
    let documentoUrl = '';
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
      if (upRes.ok) {
        const upData = await upRes.json();
        documentoUrl = upData.url;
      }
    }

    const res = await fetch('/api/habilitacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome.trim(),
        documento: documentoUrl || file?.name || '',
        dataValidade: dataValidade || null,
        licitacaoGoverno: licitacaoId,
      }),
    });
    if (res.ok) {
      resetModal();
      fetchHabilitacoes();
      setToast('Documento salvo com sucesso!');
      setTimeout(() => setToast(null), 3500);
    }
    setSaving(false);
  }

  async function deleteHabilitacao(id: number) {
    await fetch(`/api/habilitacoes/${id}`, { method: 'DELETE' });
    setHabilitacoes(prev => prev.filter(x => x.licitacoes_habilitacao_id !== id));
  }

  const inp: React.CSSProperties = {
    border: '1px solid #E0E0E0', borderRadius: '8px', padding: '10px 14px',
    fontSize: '14px', outline: 'none', color: '#262E3A', backgroundColor: '#fff',
    width: '100%', boxSizing: 'border-box',
  };

  if (loading) return <p style={{ color: '#7B7B7B', fontSize: '14px' }}>Carregando...</p>;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 2000, backgroundColor: '#259F46', color: '#fff', borderRadius: '10px', padding: '14px 22px', fontSize: '14px', fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Check className="h-4 w-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5"
          style={{ backgroundColor: '#FF6600', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar documento
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={resetModal} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#262E3A', letterSpacing: '-0.3px' }}>ADICIONE UM DOCUMENTO</span>
              <button onClick={resetModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B9B9B' }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0" style={{ marginBottom: '20px', border: '1px solid #E8E8E8', borderRadius: '8px', overflow: 'hidden' }}>
              {[{ key: 'novo', label: '+ Novo documento' }, { key: 'existente', label: '📁 Usar documento existente' }].map(t => (
                <button key={t.key} onClick={() => setModalTab(t.key as 'novo' | 'existente')}
                  style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: modalTab === t.key ? '#262E3A' : '#F9F9F9', color: modalTab === t.key ? '#fff' : '#7B7B7B', transition: 'all .15s' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {modalTab === 'novo' ? (
              <>
                {/* Nome + Validade */}
                <div className="flex gap-3" style={{ marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '6px' }}>Nome do Anexo</label>
                    <input type="text" placeholder="Nome Do Anexo" value={nome} onChange={e => setNome(e.target.value)} style={inp} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '6px' }}>Data de Validade</label>
                    <input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} style={inp} />
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  style={{ border: `2px dashed ${dragging ? '#FF6600' : '#CFCFCF'}`, borderRadius: '10px', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', backgroundColor: dragging ? '#FFF8F5' : '#FAFAFA', marginBottom: '20px', transition: 'all .2s' }}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
                  {file ? (
                    <div>
                      <Paperclip className="h-6 w-6 mx-auto" style={{ color: '#FF6600', marginBottom: '6px' }} />
                      <p style={{ fontSize: '13px', color: '#262E3A', fontWeight: 600 }}>{file.name}</p>
                      <p style={{ fontSize: '11px', color: '#9B9B9B' }}>{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: '14px', color: '#9B9B9B' }}>Arraste ou solte seu arquivo aqui</p>
                  )}
                </div>

                {/* Documentos desta licitação */}
                {habilitacoes.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#262E3A', marginBottom: '10px' }}>Documentos desta licitação</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                      {habilitacoes.map(h => {
                        const vencido = h.licitacoes_habilitacao_data_validade ? new Date(h.licitacoes_habilitacao_data_validade) < new Date() : false;
                        return (
                          <div key={h.licitacoes_habilitacao_id} className="flex items-center gap-2" style={{ backgroundColor: '#F9F9F9', borderRadius: '6px', padding: '8px 12px', border: '1px solid #E8E8E8' }}>
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: vencido ? '#FF4500' : '#259F46' }} />
                            <span style={{ flex: 1, fontSize: '12px', color: '#262E3A' }}>{h.licitacoes_habilitacao_nome}</span>
                            {h.licitacoes_habilitacao_data_validade && <span style={{ fontSize: '11px', color: vencido ? '#FF4500' : '#9B9B9B' }}>{formatDate(h.licitacoes_habilitacao_data_validade)}</span>}
                            <button onClick={() => deleteHabilitacao(h.licitacoes_habilitacao_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF', padding: 0 }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button onClick={addHabilitacao} disabled={saving || !nome.trim()}
                  style={{ width: '100%', backgroundColor: '#262E3A', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', opacity: saving || !nome.trim() ? 0.6 : 1 }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            ) : (
              /* Tab: Usar existente */
              <div>
                <p style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '12px' }}>
                  Selecione um documento já cadastrado para vincular a esta licitação.
                </p>

                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 12px', backgroundColor: '#fff', marginBottom: '14px' }}>
                  <Search className="h-4 w-4 shrink-0" style={{ color: '#9B9B9B', marginRight: '8px' }} />
                  <input type="text" placeholder="Buscar documento..." value={searchExist} onChange={e => setSearchExist(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '13px', flex: 1, padding: '10px 0', backgroundColor: 'transparent' }} />
                </div>

                {todosDocsUsuario.length === 0 ? (
                  <p style={{ color: '#9B9B9B', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>Nenhum documento cadastrado ainda.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                    {todosDocsUsuario
                      .filter(d => d.licitacoes_habilitacao_nome.toLowerCase().includes(searchExist.toLowerCase()))
                      .map(d => {
                        const vencido = d.licitacoes_habilitacao_data_validade ? new Date(d.licitacoes_habilitacao_data_validade) < new Date() : false;
                        const jaVinculado = habilitacoes.some(h => h.licitacoes_habilitacao_nome === d.licitacoes_habilitacao_nome);
                        return (
                          <div key={d.licitacoes_habilitacao_id} className="flex items-center gap-3" style={{ backgroundColor: jaVinculado ? '#F0FAF4' : '#F9F9F9', borderRadius: '8px', padding: '10px 14px', border: `1px solid ${jaVinculado ? '#B8E0C4' : '#E8E8E8'}` }}>
                            <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: vencido ? '#FF4500' : '#259F46' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#262E3A' }}>{d.licitacoes_habilitacao_nome}</div>
                              {d.licitacoes_habilitacao_data_validade && (
                                <div style={{ fontSize: '11px', color: vencido ? '#FF4500' : '#9B9B9B' }}>
                                  Validade: {formatDate(d.licitacoes_habilitacao_data_validade)} {vencido ? '— VENCIDO' : ''}
                                </div>
                              )}
                            </div>
                            {jaVinculado ? (
                              <span style={{ fontSize: '11px', color: '#259F46', fontWeight: 700, whiteSpace: 'nowrap' }}>✓ Vinculado</span>
                            ) : (
                              <button
                                onClick={() => vincularExistente(d.licitacoes_habilitacao_id)}
                                disabled={vinculando === d.licitacoes_habilitacao_id}
                                style={{ backgroundColor: '#FF6600', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {vinculando === d.licitacoes_habilitacao_id ? '...' : '+ Vincular'}
                              </button>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table view outside modal */}
      {habilitacoes.length === 0 ? (
        <p style={{ color: '#9B9B9B', fontSize: '13px' }}>Nenhum documento de habilitação ainda.</p>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9F9F9', borderBottom: '1px solid #E8E8E8' }}>
                {['Nome do arquivo', 'Arquivo', 'Validade', 'Status', 'Opções'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#262E3A' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habilitacoes.map(h => {
                const vencido = h.licitacoes_habilitacao_data_validade
                  ? new Date(h.licitacoes_habilitacao_data_validade) < new Date() : false;
                return (
                  <tr key={h.licitacoes_habilitacao_id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#262E3A' }}>{h.licitacoes_habilitacao_nome}</td>
                    <td style={{ padding: '12px 16px', color: '#7B7B7B', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.licitacoes_habilitacao_documento || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#9B9B9B', whiteSpace: 'nowrap' }}>
                      {h.licitacoes_habilitacao_data_validade ? formatDate(h.licitacoes_habilitacao_data_validade) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: vencido ? '#FFF0EB' : '#E8F5E9', color: vencido ? '#FF4500' : '#259F46' }}>
                        {vencido ? 'Vencido' : 'Válido'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex gap-1">
                        <button
                          title="Visualizar"
                          onClick={() => {
                            const doc = h.licitacoes_habilitacao_documento;
                            if (!doc) return;
                            if (doc.startsWith('data:')) {
                              const w = window.open('', '_blank');
                              if (w) { w.document.write(`<iframe src="${doc}" width="100%" height="100%" style="border:none"></iframe>`); }
                            } else {
                              window.open(doc, '_blank');
                            }
                          }}
                          disabled={!h.licitacoes_habilitacao_documento}
                          style={{ backgroundColor: h.licitacoes_habilitacao_documento ? '#262E3A' : '#CFCFCF', color: '#fff', border: 'none', borderRadius: '6px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: h.licitacoes_habilitacao_documento ? 'pointer' : 'default' }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteHabilitacao(h.licitacoes_habilitacao_id)} title="Excluir" style={{ backgroundColor: '#FF4500', color: '#fff', border: 'none', borderRadius: '6px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'tarefas' | 'anotacoes' | 'anexos' | 'habilitacao' | 'calendario' | 'itens';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'tarefas', label: 'Suas Tarefas', icon: CheckSquare },
  { key: 'itens', label: 'Itens', icon: List },
  { key: 'anotacoes', label: 'Anotações', icon: FileText },
  { key: 'anexos', label: 'Anexos', icon: Paperclip },
  { key: 'habilitacao', label: 'Habilitação', icon: ShieldCheck },
  { key: 'calendario', label: 'Calendário', icon: Calendar },
];

export default function GerenciarLicitacaoPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const licitacaoId = decodeURIComponent(rawId);

  const [licitacao, setLicitacao] = useState<LicitacaoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('tarefas');
  const [tarefasForCalendar, setTarefasForCalendar] = useState<Tarefa[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Busca dados salvos no banco (evita chamada PNCP e problema com / na URL)
      const res = await fetch(`/api/gerenciadas?identificador=${encodeURIComponent(licitacaoId)}`);
      if (res.ok) {
        const data = await res.json();
        setLicitacao(data.data || null);
      }
      setLoading(false);
    }
    load();
  }, [licitacaoId]);

  // Load tarefas for calendar
  useEffect(() => {
    if (activeTab !== 'calendario') return;
    fetch(`/api/tarefas/por-licitacao/${encodeURIComponent(licitacaoId)}`)
      .then(r => r.ok ? r.json() : [])
      .then(setTarefasForCalendar);
  }, [activeTab, licitacaoId]);

  const pncpUrl = buildPncpUrl(licitacaoId);

  return (
    <div style={{ padding: '24px', maxWidth: '960px' }}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-5"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B', fontSize: '13px', padding: 0 }}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* Summary card */}
      {loading ? (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '24px', marginBottom: '20px', color: '#7B7B7B', fontSize: '14px' }}>
          Carregando licitação...
        </div>
      ) : licitacao ? (
        <div
          style={{
            backgroundColor: '#fff', border: '1px solid #E8E8E8',
            borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            marginBottom: '20px', overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: '#262E3A', padding: '12px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', opacity: 0.8 }}>
              Gerenciando licitação
            </span>
            <a href={pncpUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#FF6600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ExternalLink className="h-3 w-3" />
              Ver no PNCP
            </a>
          </div>

          <div className="px-5 py-4">
            {licitacao.lg_objeto && (
              <div style={{ fontSize: '14px', color: '#262E3A', marginBottom: '10px', lineHeight: '1.5' }}>
                <strong>Objeto:</strong> {licitacao.lg_objeto}
              </div>
            )}

            {(licitacao.lg_data_abertura || licitacao.lg_data_encerramento) && (
              <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '6px' }}>
                <strong style={{ color: '#262E3A' }}>Datas:</strong>
                {licitacao.lg_data_abertura && (
                  <span style={{ marginLeft: '6px' }}>Abertura: {formatDateTime(licitacao.lg_data_abertura)}</span>
                )}
                {licitacao.lg_data_encerramento && (
                  <span style={{ marginLeft: '10px' }}>Encerramento: {formatDateTime(licitacao.lg_data_encerramento)}</span>
                )}
              </div>
            )}

            {licitacao.lg_orgao && (
              <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '4px' }}>
                <strong style={{ color: '#262E3A' }}>Órgão:</strong>
                <span style={{ marginLeft: '6px' }}>{licitacao.lg_orgao}</span>
              </div>
            )}

            {(licitacao.lg_cidade || licitacao.lg_uf) && (
              <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '12px' }}>
                <strong style={{ color: '#262E3A' }}>Cidade:</strong>
                <span style={{ marginLeft: '6px' }}>
                  {licitacao.lg_cidade}{licitacao.lg_uf ? ` - ${licitacao.lg_uf}` : ''}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {licitacao.lg_situacao && (
                <span
                  style={{
                    ...getSituacaoStyle(licitacao.lg_situacao),
                    fontSize: '12px', fontWeight: 700,
                    padding: '3px 10px', borderRadius: '4px',
                  }}
                >
                  {licitacao.lg_situacao}
                </span>
              )}
              {licitacao.lg_valor && licitacao.lg_valor > 0 && (
                <span
                  style={{
                    backgroundColor: '#259F46', color: '#fff',
                    fontSize: '12px', fontWeight: 700,
                    padding: '3px 10px', borderRadius: '4px',
                  }}
                >
                  Valor estimado: {formatCurrency(licitacao.lg_valor)}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '24px', marginBottom: '20px', color: '#FF4500', fontSize: '14px' }}>
          Licitação não encontrada.
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 flex-wrap"
        style={{
          borderBottom: '2px solid #E8E8E8',
          marginBottom: '20px',
        }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5"
              style={{
                border: 'none',
                borderBottom: isActive ? '2px solid #FF6600' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? '#FF6600' : '#7B7B7B',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                padding: '10px 14px',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'color 0.15s',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'tarefas' && <TarefasTab licitacaoId={licitacaoId} />}
        {activeTab === 'itens' && <ItensTab licitacaoId={licitacaoId} />}
        {activeTab === 'anotacoes' && <AnotacoesTab licitacaoId={licitacaoId} />}
        {activeTab === 'anexos' && <AnexosTab licitacaoId={licitacaoId} />}
        {activeTab === 'habilitacao' && <HabilitacaoTab licitacaoId={licitacaoId} />}
        {activeTab === 'calendario' && <CalendarView tarefas={tarefasForCalendar} />}
      </div>
    </div>
  );
}
