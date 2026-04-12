'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Loader2, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tarefa } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

type PriorityKey = 'baixa' | 'media' | 'alta' | 'urgente' | 'concluida';

function getPriorityVariant(tarefa: Tarefa): PriorityKey {
  if (tarefa.licitacoes_tarefa_status === 1) return 'concluida';
  // Default to 'media' since priority field may not exist
  return 'media';
}

function getPriorityLabel(variant: PriorityKey): string {
  const labels: Record<PriorityKey, string> = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    urgente: 'Urgente',
    concluida: 'Concluída',
  };
  return labels[variant];
}

const FILTER_TABS = [
  { key: 'all' as const, label: 'Todas' },
  { key: 'pending' as const, label: 'Pendentes' },
  { key: 'done' as const, label: 'Concluídas' },
];

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', prazo: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/tarefas');
    if (res.ok) setTarefas(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const nova = await res.json();
      setTarefas((prev) => [nova, ...prev]);
      setForm({ nome: '', prazo: '' });
      setDialogOpen(false);
    }
    setSubmitting(false);
  }

  async function toggleStatus(tarefa: Tarefa) {
    const newStatus = tarefa.licitacoes_tarefa_status === 0 ? 1 : 0;
    const res = await fetch(`/api/tarefas/${tarefa.licitacoes_tarefa_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setTarefas((prev) =>
        prev.map((t) =>
          t.licitacoes_tarefa_id === tarefa.licitacoes_tarefa_id
            ? { ...t, licitacoes_tarefa_status: newStatus }
            : t
        )
      );
    }
  }

  const filtered = tarefas.filter((t) => {
    if (filter === 'pending') return t.licitacoes_tarefa_status === 0;
    if (filter === 'done') return t.licitacoes_tarefa_status === 1;
    return true;
  });

  const isPastDue = (prazo: string) => {
    if (!prazo) return false;
    return new Date(prazo) < new Date();
  };

  const pendingCount = tarefas.filter((t) => t.licitacoes_tarefa_status === 0).length;
  const doneCount = tarefas.filter((t) => t.licitacoes_tarefa_status === 1).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-5 w-5" style={{ color: '#0a1175' }} />
          <h1 className="text-xl font-bold" style={{ color: '#262E3A' }}>
            Tarefas
          </h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="padrao">
              <Plus className="h-4 w-4" />
              Nova tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar nova tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input
                  placeholder="O que precisa ser feito?"
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" loading={submitting} variant="padrao">
                Criar tarefa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter tabs */}
      <div
        className="bg-white rounded-[10px] p-1 inline-flex gap-1"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key;
          const count =
            tab.key === 'all'
              ? tarefas.length
              : tab.key === 'pending'
              ? pendingCount
              : doneCount;

          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5"
              style={
                isActive
                  ? { backgroundColor: '#0a1175', color: '#fff' }
                  : { color: '#7B7B7B', backgroundColor: 'transparent' }
              }
            >
              {tab.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={
                  isActive
                    ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { backgroundColor: '#F0F0F0', color: '#7B7B7B' }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0a1175' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#7B7B7B' }}>
          <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold">Nenhuma tarefa encontrada.</p>
          <p className="text-sm mt-1">Crie uma nova tarefa para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const isDone = t.licitacoes_tarefa_status === 1;
            const pastDue = !isDone && isPastDue(t.licitacoes_tarefa_prazo);
            const priorityVariant = getPriorityVariant(t);

            return (
              <div
                key={t.licitacoes_tarefa_id}
                className="bg-white rounded-[10px] p-5 flex items-start gap-4"
                style={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                  opacity: isDone ? 0.7 : 1,
                }}
              >
                {/* Complete toggle button */}
                <button
                  onClick={() => toggleStatus(t)}
                  className="mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={
                    isDone
                      ? { backgroundColor: '#32CD32', borderColor: '#32CD32', color: '#fff' }
                      : { borderColor: '#D3D3D3', backgroundColor: '#fff' }
                  }
                  title={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
                  onMouseEnter={(e) => {
                    if (!isDone) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#32CD32';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDone) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#D3D3D3';
                    }
                  }}
                >
                  {isDone && (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Task name */}
                  <p
                    className="font-semibold text-sm"
                    style={{
                      color: isDone ? '#7B7B7B' : '#262E3A',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}
                  >
                    {t.licitacoes_tarefa_nome}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {/* Priority badge */}
                    <Badge variant={priorityVariant}>
                      {getPriorityLabel(priorityVariant)}
                    </Badge>

                    {/* Deadline */}
                    {t.licitacoes_tarefa_prazo && (
                      <span
                        className="flex items-center gap-1 text-xs font-semibold"
                        style={{ color: pastDue ? '#FF4500' : '#7B7B7B' }}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(t.licitacoes_tarefa_prazo)}
                        {pastDue && ' (atrasada)'}
                      </span>
                    )}

                    {/* Link to licitacao */}
                    {t.licitacoes_tarefa_licitacao_governo && (
                      <Link
                        href={`/dashboard/licitacoes/${encodeURIComponent(t.licitacoes_tarefa_licitacao_governo)}`}
                        className="flex items-center gap-1 text-xs font-semibold hover:underline"
                        style={{ color: '#0a1175' }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver licitação
                      </Link>
                    )}
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => toggleStatus(t)}
                  className="shrink-0 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
                  style={
                    isDone
                      ? { backgroundColor: '#F0F0F0', color: '#7B7B7B' }
                      : { backgroundColor: '#E8F5EC', color: '#259F46' }
                  }
                >
                  {isDone ? 'Reabrir' : 'Concluir'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
