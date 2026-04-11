'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Loader2, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Oportunidade {
  licitacoes_oportunidade_id: number;
  licitacoes_oportunidade_empresa: number;
  licitacoes_oportunidade_regioes: string;
  licitacoes_oportunidade_palavras: string;
}

export default function OportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ palavras: '', regioes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/oportunidades')
      .then(r => r.json())
      .then(d => setOportunidades(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/oportunidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const nova = await res.json();
      setOportunidades(prev => [nova, ...prev]);
      setForm({ palavras: '', regioes: '' });
      setDialogOpen(false);
    }
    setSubmitting(false);
  }

  async function excluir(id: number) {
    const res = await fetch(`/api/oportunidades/${id}`, { method: 'DELETE' });
    if (res.ok) setOportunidades(prev => prev.filter(o => o.licitacoes_oportunidade_id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-[#0a1175]" />
          <h1 className="text-xl font-bold text-gray-900">Oportunidades</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nova oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar alerta de oportunidade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Palavras-chave *</Label>
                <Input
                  placeholder="ex: computador, notebook, servidor"
                  value={form.palavras}
                  onChange={(e) => setForm(p => ({ ...p, palavras: e.target.value }))}
                  required
                />
                <p className="text-xs text-gray-400">Separe palavras por vírgula</p>
              </div>
              <div className="space-y-2">
                <Label>Regiões (UF)</Label>
                <Input
                  placeholder="ex: SP, RJ, MG"
                  value={form.regioes}
                  onChange={(e) => setForm(p => ({ ...p, regioes: e.target.value }))}
                />
                <p className="text-xs text-gray-400">Deixe em branco para todo o Brasil</p>
              </div>
              <Button type="submit" className="w-full" loading={submitting}>
                Criar oportunidade
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-gray-500">
        Configure alertas para palavras-chave e regiões de interesse.
        Use o botão "Buscar agora" para ver licitações que combinam com seus critérios.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a1175]" />
        </div>
      ) : oportunidades.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma oportunidade configurada</p>
          <p className="text-sm mt-1">Crie alertas para palavras-chave do seu interesse.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {oportunidades.map((o) => {
            const palavras = o.licitacoes_oportunidade_palavras?.split(',').map(p => p.trim()).filter(Boolean) || [];
            const regioes = o.licitacoes_oportunidade_regioes?.split(',').map(r => r.trim()).filter(Boolean) || [];
            const searchUrl = `/dashboard/licitacoes?busca=${encodeURIComponent(palavras[0] || '')}${regioes[0] ? `&uf=${regioes[0]}` : ''}`;

            return (
              <Card key={o.licitacoes_oportunidade_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-700">Oportunidade #{o.licitacoes_oportunidade_id}</CardTitle>
                    <button
                      onClick={() => excluir(o.licitacoes_oportunidade_id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Palavras-chave</p>
                    <div className="flex flex-wrap gap-1">
                      {palavras.map((p, i) => (
                        <Badge key={i} variant="secondary">{p}</Badge>
                      ))}
                    </div>
                  </div>
                  {regioes.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Regiões</p>
                      <div className="flex flex-wrap gap-1">
                        {regioes.map((r, i) => (
                          <Badge key={i} variant="outline">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link href={searchUrl}>
                    <Button size="sm" variant="outline" className="w-full">
                      <Search className="h-4 w-4" />
                      Buscar agora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
