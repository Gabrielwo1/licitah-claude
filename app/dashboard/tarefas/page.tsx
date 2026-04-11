'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Loader2, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tarefa } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', prazo: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load(f = filter) {
    setLoading(true);
    const res = await fetch(`/api/tarefas${f !== 'all' ? `?status=${f}` : ''}`);
    if (res.ok) setTarefas(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

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
      setTarefas(prev => [nova, ...prev]);
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
      setTarefas(prev => prev.map(t =>
        t.licitacoes_tarefa_id === tarefa.licitacoes_tarefa_id
          ? { ...t, licitacoes_tarefa_status: newStatus }
          : t
      ));
    }
  }

  const filtered = tarefas.filter(t => {
    if (filter === 'pending') return t.licitacoes_tarefa_status === 0;
    if (filter === 'done') return t.licitacoes_tarefa_status === 1;
    return true;
  });

  const isPastDue = (prazo: string) => {
    if (!prazo) return false;
    return new Date(prazo) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-5 w-5 text-[#0a1175]" />
          <h1 className="text-xl font-bold text-gray-900">Tarefas</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                  onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm(p => ({ ...p, prazo: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" loading={submitting}>
                Criar tarefa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#0a1175] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Concluídas'}
          </button>
        ))}
        <span className="text-sm text-gray-400 self-center ml-2">{filtered.length} tarefa(s)</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a1175]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma tarefa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.licitacoes_tarefa_id} className={t.licitacoes_tarefa_status === 1 ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStatus(t)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      t.licitacoes_tarefa_status === 1
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {t.licitacoes_tarefa_status === 1 && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-gray-900 ${t.licitacoes_tarefa_status === 1 ? 'line-through text-gray-400' : ''}`}>
                      {t.licitacoes_tarefa_nome}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {t.licitacoes_tarefa_prazo && (
                        <span className={`flex items-center gap-1 text-xs ${
                          t.licitacoes_tarefa_status === 0 && isPastDue(t.licitacoes_tarefa_prazo)
                            ? 'text-red-500'
                            : 'text-gray-400'
                        }`}>
                          <Calendar className="h-3 w-3" />
                          {formatDate(t.licitacoes_tarefa_prazo)}
                          {t.licitacoes_tarefa_status === 0 && isPastDue(t.licitacoes_tarefa_prazo) && ' (atrasada)'}
                        </span>
                      )}
                      {t.licitacoes_tarefa_licitacao_governo && (
                        <Link
                          href={`/dashboard/licitacoes/${encodeURIComponent(t.licitacoes_tarefa_licitacao_governo)}`}
                          className="flex items-center gap-1 text-xs text-[#0a1175] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver licitação
                        </Link>
                      )}
                    </div>
                  </div>
                  <Badge variant={t.licitacoes_tarefa_status === 1 ? 'success' : 'warning'}>
                    {t.licitacoes_tarefa_status === 1 ? 'Concluída' : 'Pendente'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
