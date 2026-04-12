'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckSquare, FileText, Paperclip, ShieldCheck,
  Calendar, Plus, Trash2, Check, ChevronLeft, ChevronRight,
  ExternalLink,
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

function TarefasTab({ licitacaoId }: { licitacaoId: string }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [prazo, setPrazo] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchTarefas = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tarefas/por-licitacao/${encodeURIComponent(licitacaoId)}`);
    if (res.ok) setTarefas(await res.json());
    setLoading(false);
  }, [licitacaoId]);

  useEffect(() => { fetchTarefas(); }, [fetchTarefas]);

  async function addTarefa() {
    if (!nome.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/tarefas/por-licitacao/${encodeURIComponent(licitacaoId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim(), prazo: prazo || null }),
    });
    if (res.ok) {
      const t = await res.json();
      setTarefas(prev => [...prev, t]);
      setNome('');
      setPrazo('');
      setShowForm(false);
    }
    setAdding(false);
  }

  async function toggleStatus(t: Tarefa) {
    const newStatus = t.licitacoes_tarefa_status === 0 ? 1 : 0;
    await fetch(`/api/tarefas/${t.licitacoes_tarefa_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setTarefas(prev => prev.map(x =>
      x.licitacoes_tarefa_id === t.licitacoes_tarefa_id
        ? { ...x, licitacoes_tarefa_status: newStatus }
        : x
    ));
  }

  async function deleteTarefa(id: number) {
    await fetch(`/api/tarefas/${id}`, { method: 'DELETE' });
    setTarefas(prev => prev.filter(x => x.licitacoes_tarefa_id !== id));
  }

  if (loading) return <p style={{ color: '#7B7B7B', fontSize: '14px' }}>Carregando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: '14px', color: '#7B7B7B' }}>
          {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''}
        </span>
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
          Nova tarefa
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
              placeholder="Nome da tarefa"
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                border: '1px solid #CFCFCF', borderRadius: '6px',
                padding: '8px 12px', fontSize: '13px', outline: 'none', width: '100%',
              }}
            />
            <input
              type="date"
              value={prazo}
              onChange={e => setPrazo(e.target.value)}
              style={{
                border: '1px solid #CFCFCF', borderRadius: '6px',
                padding: '8px 12px', fontSize: '13px', outline: 'none', width: '200px',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={addTarefa}
                disabled={adding || !nome.trim()}
                style={{
                  backgroundColor: '#262E3A', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                {adding ? 'Salvando...' : 'Salvar'}
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

      {tarefas.length === 0 ? (
        <p style={{ color: '#9B9B9B', fontSize: '13px' }}>Nenhuma tarefa ainda.</p>
      ) : (
        <div className="space-y-2">
          {tarefas.map(t => (
            <div
              key={t.licitacoes_tarefa_id}
              className="flex items-center gap-3"
              style={{
                backgroundColor: '#fff', border: '1px solid #E8E8E8',
                borderRadius: '6px', padding: '10px 14px',
              }}
            >
              <button
                onClick={() => toggleStatus(t)}
                style={{
                  width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                  border: `2px solid ${t.licitacoes_tarefa_status === 1 ? '#259F46' : '#CFCFCF'}`,
                  backgroundColor: t.licitacoes_tarefa_status === 1 ? '#259F46' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                {t.licitacoes_tarefa_status === 1 && <Check className="h-3 w-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <span
                  style={{
                    fontSize: '13px', color: '#262E3A',
                    textDecoration: t.licitacoes_tarefa_status === 1 ? 'line-through' : 'none',
                  }}
                >
                  {t.licitacoes_tarefa_nome}
                </span>
                {t.licitacoes_tarefa_prazo && (
                  <span style={{ fontSize: '11px', color: '#9B9B9B', marginLeft: '8px' }}>
                    {formatDate(t.licitacoes_tarefa_prazo)}
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteTarefa(t.licitacoes_tarefa_id)}
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

// ─── Tab: Habilitação ─────────────────────────────────────────────────────────

function HabilitacaoTab({ licitacaoId }: { licitacaoId: string }) {
  const [habilitacoes, setHabilitacoes] = useState<Habilitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchHabilitacoes = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/habilitacoes?licitacaoGoverno=${encodeURIComponent(licitacaoId)}`);
    if (res.ok) setHabilitacoes(await res.json());
    setLoading(false);
  }, [licitacaoId]);

  useEffect(() => { fetchHabilitacoes(); }, [fetchHabilitacoes]);

  async function addHabilitacao() {
    if (!nome.trim()) return;
    setSaving(true);
    const res = await fetch('/api/habilitacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim(), documento, dataValidade: dataValidade || null, licitacaoGoverno: licitacaoId }),
    });
    if (res.ok) {
      setNome('');
      setDocumento('');
      setDataValidade('');
      setShowForm(false);
      fetchHabilitacoes();
    }
    setSaving(false);
  }

  async function deleteHabilitacao(id: number) {
    await fetch(`/api/habilitacoes/${id}`, { method: 'DELETE' });
    setHabilitacoes(prev => prev.filter(x => x.licitacoes_habilitacao_id !== id));
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
          Novo documento
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
              placeholder="Nome do documento de habilitação"
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                border: '1px solid #CFCFCF', borderRadius: '6px',
                padding: '8px 12px', fontSize: '13px', outline: 'none', width: '100%',
              }}
            />
            <input
              type="text"
              placeholder="Descrição ou número do documento"
              value={documento}
              onChange={e => setDocumento(e.target.value)}
              style={{
                border: '1px solid #CFCFCF', borderRadius: '6px',
                padding: '8px 12px', fontSize: '13px', outline: 'none', width: '100%',
              }}
            />
            <div>
              <label style={{ fontSize: '12px', color: '#7B7B7B', display: 'block', marginBottom: '4px' }}>
                Validade
              </label>
              <input
                type="date"
                value={dataValidade}
                onChange={e => setDataValidade(e.target.value)}
                style={{
                  border: '1px solid #CFCFCF', borderRadius: '6px',
                  padding: '8px 12px', fontSize: '13px', outline: 'none', width: '200px',
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addHabilitacao}
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

      {habilitacoes.length === 0 ? (
        <p style={{ color: '#9B9B9B', fontSize: '13px' }}>Nenhum documento de habilitação ainda.</p>
      ) : (
        <div className="space-y-2">
          {habilitacoes.map(h => {
            const vencido = h.licitacoes_habilitacao_data_validade
              ? new Date(h.licitacoes_habilitacao_data_validade) < new Date()
              : false;

            return (
              <div
                key={h.licitacoes_habilitacao_id}
                className="flex items-center gap-3"
                style={{
                  backgroundColor: '#fff', border: '1px solid #E8E8E8',
                  borderRadius: '6px', padding: '10px 14px',
                }}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: vencido ? '#FF4500' : '#259F46' }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: '13px', color: '#262E3A', fontWeight: 600 }}>
                    {h.licitacoes_habilitacao_nome}
                  </div>
                  {h.licitacoes_habilitacao_documento && (
                    <div style={{ fontSize: '12px', color: '#7B7B7B' }}>{h.licitacoes_habilitacao_documento}</div>
                  )}
                  {h.licitacoes_habilitacao_data_validade && (
                    <div style={{ fontSize: '11px', color: vencido ? '#FF4500' : '#9B9B9B' }}>
                      Validade: {formatDate(h.licitacoes_habilitacao_data_validade)}
                      {vencido && ' — VENCIDO'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteHabilitacao(h.licitacoes_habilitacao_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFCFCF', padding: '2px' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FF4500')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#CFCFCF')}
                >
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

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'tarefas' | 'anotacoes' | 'anexos' | 'habilitacao' | 'calendario';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'tarefas', label: 'Suas Tarefas', icon: CheckSquare },
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
        {activeTab === 'anotacoes' && <AnotacoesTab licitacaoId={licitacaoId} />}
        {activeTab === 'anexos' && <AnexosTab licitacaoId={licitacaoId} />}
        {activeTab === 'habilitacao' && <HabilitacaoTab licitacaoId={licitacaoId} />}
        {activeTab === 'calendario' && <CalendarView tarefas={tarefasForCalendar} />}
      </div>
    </div>
  );
}
