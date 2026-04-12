'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Check, Trash2,
  Calendar, AlertCircle, Clock, CheckCircle2, X,
} from 'lucide-react';
import { Tarefa } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prioridadeColor(p: string | undefined) {
  switch (p?.toLowerCase()) {
    case 'urgente': return { bg: '#FF4500', color: '#fff' };
    case 'alta':    return { bg: '#FF6600', color: '#fff' };
    case 'média':
    case 'media':   return { bg: '#FFD700', color: '#262E3A' };
    case 'baixa':   return { bg: '#259F46', color: '#fff' };
    default:        return { bg: '#CFCFCF', color: '#262E3A' };
  }
}

function isToday(prazo: string) {
  if (!prazo) return false;
  const d = new Date(prazo);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isOverdue(prazo: string, status: number) {
  if (!prazo || status === 1) return false;
  return new Date(prazo) < new Date();
}

// ─── Rich Task Form ───────────────────────────────────────────────────────────

interface SubtarefaItem {
  nome: string;
  prazo: string;
}

interface FormState {
  nome: string;
  prazo: string;
  prioridade: string;
  anotacao: string;
  nomeResponsavel: string;
  subtarefas: SubtarefaItem[];
}

function TaskForm({
  onSaved,
  onClose,
  userName,
}: {
  onSaved: (t: Tarefa) => void;
  onClose: () => void;
  userName: string;
}) {
  const [form, setForm] = useState<FormState>({
    nome: '',
    prazo: '',
    prioridade: 'Média',
    anotacao: '',
    nomeResponsavel: userName,
    subtarefas: [],
  });
  const [subNome, setSubNome] = useState('');
  const [subPrazo, setSubPrazo] = useState('');
  const [saving, setSaving] = useState(false);

  function addSub() {
    if (!subNome.trim()) return;
    setForm(f => ({ ...f, subtarefas: [...f.subtarefas, { nome: subNome.trim(), prazo: subPrazo }] }));
    setSubNome('');
    setSubPrazo('');
  }

  function removeSub(i: number) {
    setForm(f => ({ ...f, subtarefas: f.subtarefas.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    const res = await fetch('/api/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome.trim(),
        prazo: form.prazo || null,
        prioridade: form.prioridade,
        anotacao: form.anotacao,
        nomeResponsavel: form.nomeResponsavel,
        subtarefas: form.subtarefas,
      }),
    });
    if (res.ok) {
      const t = await res.json();
      onSaved(t);
      onClose();
    }
    setSaving(false);
  }

  const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#262E3A', marginBottom: '6px', display: 'block' };
  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E0E0E0', borderRadius: '8px',
    padding: '10px 14px', fontSize: '13px', outline: 'none', color: '#262E3A',
    backgroundColor: '#fff', boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px',
          maxHeight: '90vh', overflowY: 'auto', padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#262E3A' }}>Adicionar tarefa</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nome */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Nome da tarefa</label>
            <input
              type="text"
              placeholder="Nome Da Tarefa"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              required
              style={inputStyle}
            />
          </div>

          {/* Subtarefas */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Subtarefas</label>
            <div className="flex gap-2 mb-2">
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 10px', backgroundColor: '#fff' }}>
                <Calendar className="h-4 w-4 shrink-0" style={{ color: '#9B9B9B', marginRight: '8px' }} />
                <input
                  type="text"
                  placeholder="Subtarefa"
                  value={subNome}
                  onChange={e => setSubNome(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#262E3A', flex: 1, padding: '10px 0' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 10px', backgroundColor: '#fff' }}>
                <Clock className="h-4 w-4 shrink-0" style={{ color: '#9B9B9B', marginRight: '8px' }} />
                <input
                  type="datetime-local"
                  value={subPrazo}
                  onChange={e => setSubPrazo(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#262E3A', flex: 1, padding: '10px 0' }}
                />
              </div>
              <button
                type="button"
                onClick={addSub}
                style={{
                  backgroundColor: '#FF6600', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '0 16px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                }}
              >
                <Check className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
            {form.subtarefas.length > 0 && (
              <div className="space-y-1 mt-2">
                {form.subtarefas.map((s, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ fontSize: '12px', color: '#262E3A', backgroundColor: '#F9F9F9', borderRadius: '6px', padding: '6px 10px' }}>
                    <Check className="h-3 w-3 shrink-0" style={{ color: '#259F46' }} />
                    <span style={{ flex: 1 }}>{s.nome}</span>
                    {s.prazo && <span style={{ color: '#9B9B9B' }}>{s.prazo.replace('T', ' ')}</span>}
                    <button type="button" onClick={() => removeSub(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF', padding: 0 }}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prazo + Prioridade */}
          <div className="flex gap-4 mb-4">
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Prazo</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0 12px', backgroundColor: '#fff' }}>
                <Clock className="h-4 w-4 shrink-0" style={{ color: '#9B9B9B', marginRight: '8px' }} />
                <input
                  type="datetime-local"
                  value={form.prazo}
                  onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                  style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#262E3A', flex: 1, padding: '10px 0' }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Prioridade</label>
              <select
                value={form.prioridade}
                onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                <option value="">Selecione uma opção</option>
                {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Responsável */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Nome do Usuário</label>
            <input
              type="text"
              value={form.nomeResponsavel}
              onChange={e => setForm(f => ({ ...f, nomeResponsavel: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Anotações */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Anotações</label>
            <textarea
              placeholder="Observações sobre esta tarefa..."
              value={form.anotacao}
              onChange={e => setForm(f => ({ ...f, anotacao: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !form.nome.trim()}
            style={{
              width: '100%', backgroundColor: '#262E3A', color: '#fff',
              border: 'none', borderRadius: '8px', padding: '12px',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar tarefa'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Calendar Views ───────────────────────────────────────────────────────────

type CalView = 'dia' | 'semana' | 'mes';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function CalendarMes({ tarefas, selectedDate, onSelectDate }: {
  tarefas: Tarefa[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [month, setMonth] = useState(selectedDate.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const tasksByDate: Record<string, Tarefa[]> = {};
  tarefas.forEach(t => {
    if (!t.licitacoes_tarefa_prazo) return;
    const d = t.licitacoes_tarefa_prazo.split('T')[0];
    if (!tasksByDate[d]) tasksByDate[d] = [];
    tasksByDate[d].push(t);
  });

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const todayStr = new Date().toISOString().split('T')[0];
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B', padding: '4px' }}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#262E3A' }}>{MONTH_NAMES[month]} / {year}</span>
        <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B', padding: '4px' }}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {DAY_SHORT.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: i === 0 || i === 6 ? '#FF6600' : '#9B9B9B', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isSelected = dateStr === selectedDate.toISOString().split('T')[0];
          const isTodayCell = dateStr === todayStr;

          return (
            <div
              key={i}
              onClick={() => onSelectDate(new Date(year, month, day))}
              style={{
                minHeight: '44px', borderRadius: '4px', padding: '4px',
                cursor: 'pointer',
                border: isSelected ? '2px solid #FF6600' : isTodayCell ? '2px solid #262E3A' : '1px solid #F0F0F0',
                backgroundColor: isSelected ? '#FFF3E0' : isTodayCell ? '#F5F7FF' : '#fff',
              }}
            >
              <div style={{
                fontSize: '12px', fontWeight: isTodayCell ? 700 : 400,
                color: isSelected ? '#FF6600' : isTodayCell ? '#262E3A' : '#262E3A',
                textAlign: 'center', marginBottom: '2px',
              }}>{day}</div>
              {dayTasks.slice(0, 2).map(t => (
                <div key={t.licitacoes_tarefa_id} style={{
                  fontSize: '9px', backgroundColor: '#FF6600', color: '#fff',
                  borderRadius: '2px', padding: '1px 3px', marginBottom: '1px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={t.licitacoes_tarefa_nome}>{t.licitacoes_tarefa_nome}</div>
              ))}
              {dayTasks.length > 2 && <div style={{ fontSize: '9px', color: '#FF6600' }}>+{dayTasks.length - 2}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarDia({ tarefas, date }: { tarefas: Tarefa[]; date: Date }) {
  const dateStr = date.toISOString().split('T')[0];
  const dayTasks = tarefas.filter(t => t.licitacoes_tarefa_prazo?.startsWith(dateStr));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayNames = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const dateLabel = `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;

  function getHourTasks(h: number) {
    return dayTasks.filter(t => {
      if (!t.licitacoes_tarefa_prazo) return false;
      const d = new Date(t.licitacoes_tarefa_prazo);
      return d.getHours() === h;
    });
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#FF6600', color: '#fff', padding: '10px 16px', fontWeight: 700, fontSize: '15px', borderRadius: '6px 6px 0 0', textAlign: 'center' }}>
        {dateLabel}
      </div>
      <div style={{ backgroundColor: '#FF6600', color: '#fff', padding: '4px 16px', fontSize: '12px', textAlign: 'center', marginBottom: '4px' }}>
        {dayNames[date.getDay()]}
      </div>
      {/* All-day row */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E8E8E8' }}>
        <div style={{ width: '50px', fontSize: '11px', color: '#9B9B9B', padding: '6px 8px', flexShrink: 0 }}>Dia Todo</div>
        <div style={{ flex: 1, minHeight: '28px', backgroundColor: '#FFFEF5' }} />
      </div>
      {/* Hour rows */}
      {hours.map(h => {
        const hTasks = getHourTasks(h);
        return (
          <div key={h} style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', minHeight: '40px' }}>
            <div style={{ width: '50px', fontSize: '11px', color: '#9B9B9B', padding: '6px 8px', flexShrink: 0, paddingTop: '4px' }}>
              {String(h).padStart(2, '0')}
            </div>
            <div style={{ flex: 1, backgroundColor: h % 2 === 0 ? '#FFFEF5' : '#fff', padding: '2px 6px' }}>
              {hTasks.map(t => (
                <div key={t.licitacoes_tarefa_id} style={{
                  backgroundColor: t.licitacoes_tarefa_status === 1 ? '#259F46' : '#FF6600',
                  color: '#fff', borderRadius: '4px', padding: '3px 8px',
                  fontSize: '11px', fontWeight: 600, marginBottom: '2px',
                }}>
                  {t.licitacoes_tarefa_nome}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarSemana({ tarefas, date }: { tarefas: Tarefa[]; date: Date }) {
  // Find Monday of the week
  const dow = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  function getDayHourTasks(d: Date, h: number) {
    const ds = d.toISOString().split('T')[0];
    return tarefas.filter(t => {
      if (!t.licitacoes_tarefa_prazo?.startsWith(ds)) return false;
      return new Date(t.licitacoes_tarefa_prazo).getHours() === h;
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
      <div style={{ minWidth: '600px' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: '2px solid #E8E8E8' }}>
          <div />
          {days.map((d, i) => {
            const ds = d.toISOString().split('T')[0];
            const isToday = ds === todayStr;
            return (
              <div key={i} style={{
                textAlign: 'center', padding: '8px 4px',
                backgroundColor: isToday ? '#FF6600' : 'transparent',
                color: isToday ? '#fff' : '#262E3A',
                borderRadius: isToday ? '6px 6px 0 0' : 0,
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{DAY_SHORT[d.getDay()]}</div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        {/* Hour rows */}
        {hours.map(h => (
          <div key={h} style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: '1px solid #F0F0F0', minHeight: '36px' }}>
            <div style={{ fontSize: '11px', color: '#9B9B9B', padding: '4px 8px', paddingTop: '4px' }}>
              {String(h).padStart(2, '0')}
            </div>
            {days.map((d, di) => {
              const ts = getDayHourTasks(d, h);
              return (
                <div key={di} style={{ borderLeft: '1px solid #F0F0F0', padding: '2px 3px', backgroundColor: h % 2 === 0 ? '#FFFEF5' : '#fff' }}>
                  {ts.map(t => (
                    <div key={t.licitacoes_tarefa_id} style={{
                      backgroundColor: '#FF6600', color: '#fff',
                      borderRadius: '3px', padding: '2px 5px',
                      fontSize: '9px', fontWeight: 600, marginBottom: '1px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }} title={t.licitacoes_tarefa_nome}>{t.licitacoes_tarefa_nome}</div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [calView, setCalView] = useState<CalView>('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userName, setUserName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tarefas');
    if (res.ok) setTarefas(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Get username from session
  useEffect(() => {
    fetch('/api/perfil').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.usuario_display) setUserName(d.usuario_display);
    }).catch(() => {});
  }, []);

  async function toggleStatus(t: Tarefa) {
    const newStatus = t.licitacoes_tarefa_status === 0 ? 1 : 0;
    const res = await fetch(`/api/tarefas/${t.licitacoes_tarefa_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setTarefas(prev => prev.map(x =>
        x.licitacoes_tarefa_id === t.licitacoes_tarefa_id
          ? { ...x, licitacoes_tarefa_status: newStatus }
          : x
      ));
    }
  }

  async function deleteTarefa(id: number) {
    await fetch(`/api/tarefas/${id}`, { method: 'DELETE' });
    setTarefas(prev => prev.filter(x => x.licitacoes_tarefa_id !== id));
  }

  // Summary counts
  const emProgresso = tarefas.filter(t => t.licitacoes_tarefa_status === 0 && !isOverdue(t.licitacoes_tarefa_prazo, t.licitacoes_tarefa_status));
  const concluidas = tarefas.filter(t => t.licitacoes_tarefa_status === 1);
  const tarefasHoje = tarefas.filter(t => isToday(t.licitacoes_tarefa_prazo));
  const emAtraso = tarefas.filter(t => isOverdue(t.licitacoes_tarefa_prazo, t.licitacoes_tarefa_status));

  const cardStyle = (borderColor: string, bgColor: string): React.CSSProperties => ({
    backgroundColor: '#fff',
    border: `2px solid ${borderColor}`,
    borderRadius: '8px',
    padding: '16px 20px',
    flex: 1,
    minWidth: '140px',
    backgroundColor: bgColor,
  });

  return (
    <div style={{ padding: '0', maxWidth: '1100px' }}>

      {/* ── Summary Cards ── */}
      <div className="flex gap-3 flex-wrap mb-5">
        <div style={cardStyle('#FF6600', '#FFF8F5')}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4" style={{ color: '#FF6600' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF6600' }}>Em progresso</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#262E3A' }}>{emProgresso.length}</div>
        </div>
        <div style={cardStyle('#259F46', '#fff')}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4" style={{ color: '#259F46' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#259F46' }}>Concluídas</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#262E3A' }}>{concluidas.length}</div>
        </div>
        <div style={cardStyle('#FFD700', '#fff')}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4" style={{ color: '#B8960C' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#B8960C' }}>Tarefas do dia</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#262E3A' }}>{tarefasHoje.length}</div>
        </div>
        <div style={cardStyle('#FF4500', '#fff')}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4" style={{ color: '#FF4500' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF4500' }}>Em atraso</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#262E3A' }}>{emAtraso.length}</div>
        </div>
      </div>

      {/* ── Add Task Button ── */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
          style={{
            backgroundColor: '#262E3A', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '10px 18px', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus className="h-4 w-4" />
          Adicionar tarefa
        </button>
      </div>

      {/* ── Em Progresso Table ── */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E8E8' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#262E3A' }}>Em progresso</h2>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9B9B9B', fontSize: '13px' }}>Carregando...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9F9F9' }}>
                  {['#', 'Tarefa', 'Licitação', 'Prazo', 'Prioridade', 'Ações'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: '#7B7B7B', borderBottom: '1px solid #E8E8E8' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emProgresso.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', fontSize: '13px', color: '#9B9B9B' }}>
                      Nenhuma tarefa foi encontrada!
                    </td>
                  </tr>
                ) : (
                  emProgresso.map((t, idx) => {
                    const prio = prioridadeColor(t.licitacoes_tarefa_prioridade);
                    const over = isOverdue(t.licitacoes_tarefa_prazo, t.licitacoes_tarefa_status);
                    return (
                      <tr key={t.licitacoes_tarefa_id} style={{ borderBottom: '1px solid #F5F5F5' }}>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: '#9B9B9B' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: '#262E3A', fontWeight: 500, maxWidth: '280px' }}>
                          <div>{t.licitacoes_tarefa_nome}</div>
                          {t.licitacoes_tarefa_nome_responsavel && (
                            <div style={{ fontSize: '11px', color: '#9B9B9B' }}>{t.licitacoes_tarefa_nome_responsavel}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '12px', color: '#7B7B7B' }}>
                          {t.licitacoes_tarefa_licitacao_governo ? (
                            <Link href={`/dashboard/licitacoes/gerenciar/${encodeURIComponent(t.licitacoes_tarefa_licitacao_governo)}`} style={{ color: '#0a1175', textDecoration: 'underline', fontSize: '12px' }}>
                              Ver licitação
                            </Link>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '12px', color: over ? '#FF4500' : '#7B7B7B', fontWeight: over ? 700 : 400 }}>
                          {t.licitacoes_tarefa_prazo ? formatDate(t.licitacoes_tarefa_prazo) : '—'}
                          {over && ' ⚠'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            ...prio, fontSize: '11px', fontWeight: 700,
                            padding: '3px 8px', borderRadius: '4px', display: 'inline-block',
                          }}>
                            {t.licitacoes_tarefa_prioridade || 'Média'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleStatus(t)}
                              title="Concluir"
                              style={{
                                background: 'none', border: '1px solid #259F46', borderRadius: '4px',
                                cursor: 'pointer', color: '#259F46', padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                              }}
                            >
                              ✓ Concluir
                            </button>
                            <button
                              onClick={() => deleteTarefa(t.licitacoes_tarefa_id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF', padding: '2px' }}
                              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FF4500')}
                              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#CFCFCF')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Todas as Tarefas + Calendar ── */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E8E8' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#262E3A' }}>Todas as tarefas</h2>
        </div>

        <div className="flex gap-0" style={{ minHeight: '520px' }}>

          {/* Left: mini calendar + filters */}
          <div style={{ width: '300px', minWidth: '300px', borderRight: '1px solid #E8E8E8', padding: '16px' }}>
            {/* View toggle */}
            <div className="flex gap-1 mb-4" style={{ backgroundColor: '#F5F5F5', borderRadius: '6px', padding: '3px' }}>
              {(['dia', 'semana', 'mes'] as CalView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setCalView(v)}
                  style={{
                    flex: 1, border: 'none', borderRadius: '4px', padding: '6px',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    backgroundColor: calView === v ? '#262E3A' : 'transparent',
                    color: calView === v ? '#fff' : '#7B7B7B',
                    textTransform: 'capitalize',
                  }}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '12px', fontWeight: 600, color: '#7B7B7B', marginBottom: '8px' }}>Período</p>
            <CalendarMes tarefas={tarefas} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>

          {/* Right: calendar view */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {calView === 'dia' && <CalendarDia tarefas={tarefas} date={selectedDate} />}
            {calView === 'semana' && <CalendarSemana tarefas={tarefas} date={selectedDate} />}
            {calView === 'mes' && (
              <div style={{ padding: '16px' }}>
                {/* Concluídas section */}
                {concluidas.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#7B7B7B', marginBottom: '8px' }}>
                      Concluídas ({concluidas.length})
                    </h3>
                    {concluidas.map(t => (
                      <div key={t.licitacoes_tarefa_id} className="flex items-center gap-3" style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#F9F9F9', marginBottom: '6px' }}>
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#259F46' }} />
                        <span style={{ fontSize: '13px', color: '#7B7B7B', textDecoration: 'line-through', flex: 1 }}>{t.licitacoes_tarefa_nome}</span>
                        <button onClick={() => toggleStatus(t)} style={{ fontSize: '11px', color: '#7B7B7B', background: 'none', border: '1px solid #CFCFCF', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
                          Reabrir
                        </button>
                        <button onClick={() => deleteTarefa(t.licitacoes_tarefa_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FF4500')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#CFCFCF')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Em atraso */}
                {emAtraso.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#FF4500', marginBottom: '8px' }}>
                      Em atraso ({emAtraso.length})
                    </h3>
                    {emAtraso.map(t => (
                      <div key={t.licitacoes_tarefa_id} className="flex items-center gap-3" style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#FFF5F5', border: '1px solid #FFE0E0', marginBottom: '6px' }}>
                        <AlertCircle className="h-4 w-4 shrink-0" style={{ color: '#FF4500' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: '#262E3A', fontWeight: 500 }}>{t.licitacoes_tarefa_nome}</div>
                          {t.licitacoes_tarefa_prazo && <div style={{ fontSize: '11px', color: '#FF4500' }}>Prazo: {formatDate(t.licitacoes_tarefa_prazo)}</div>}
                        </div>
                        <button onClick={() => toggleStatus(t)} style={{ fontSize: '11px', color: '#259F46', background: 'none', border: '1px solid #259F46', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>✓ Concluir</button>
                        <button onClick={() => deleteTarefa(t.licitacoes_tarefa_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FF4500')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#CFCFCF')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Todas pendentes */}
                {emProgresso.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#262E3A', marginBottom: '8px' }}>
                      Pendentes ({emProgresso.length})
                    </h3>
                    {emProgresso.map(t => {
                      const prio = prioridadeColor(t.licitacoes_tarefa_prioridade);
                      return (
                        <div key={t.licitacoes_tarefa_id} className="flex items-center gap-3" style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#F9F9F9', marginBottom: '6px' }}>
                          <button
                            onClick={() => toggleStatus(t)}
                            style={{
                              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                              border: '2px solid #CFCFCF', backgroundColor: 'transparent', cursor: 'pointer',
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', color: '#262E3A', fontWeight: 500 }}>{t.licitacoes_tarefa_nome}</div>
                            {t.licitacoes_tarefa_prazo && (
                              <div style={{ fontSize: '11px', color: '#9B9B9B' }}>{formatDate(t.licitacoes_tarefa_prazo)}</div>
                            )}
                          </div>
                          <span style={{ ...prio, fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px' }}>
                            {t.licitacoes_tarefa_prioridade || 'Média'}
                          </span>
                          <button onClick={() => deleteTarefa(t.licitacoes_tarefa_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FF4500')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#CFCFCF')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tarefas.length === 0 && !loading && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9B9B9B' }}>
                    <Calendar className="h-10 w-10 mx-auto mb-3" style={{ color: '#CFCFCF' }} />
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Nenhuma tarefa cadastrada</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Clique em "Adicionar tarefa" para começar.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <TaskForm
          onSaved={t => setTarefas(prev => [t, ...prev])}
          onClose={() => setShowForm(false)}
          userName={userName}
        />
      )}
    </div>
  );
}
