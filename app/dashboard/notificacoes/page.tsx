'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Notificacao } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/notificacoes');
    if (res.ok) setNotificacoes(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function marcarLida(id: number) {
    const res = await fetch(`/api/notificacoes/${id}`, { method: 'PUT' });
    if (res.ok) {
      setNotificacoes(prev => prev.map(n => n.notificacao_id === id ? { ...n, notificacao_lido: 1 } : n));
    }
  }

  async function marcarTodasLidas() {
    const res = await fetch('/api/notificacoes/all', { method: 'PUT' });
    if (res.ok) {
      setNotificacoes(prev => prev.map(n => ({ ...n, notificacao_lido: 1 })));
    }
  }

  const naoLidas = notificacoes.filter(n => n.notificacao_lido === 0);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-[#0a1175]" />
          <h1 className="text-xl font-bold text-gray-900">Notificações</h1>
          {naoLidas.length > 0 && (
            <span className="bg-[#ff6600] text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {naoLidas.length}
            </span>
          )}
        </div>
        {naoLidas.length > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasLidas}>
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a1175]" />
        </div>
      ) : notificacoes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma notificação.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notificacoes.map((n) => (
            <Card
              key={n.notificacao_id}
              className={`transition-colors ${n.notificacao_lido === 0 ? 'border-[#0a1175]/20 bg-blue-50/30' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {n.notificacao_lido === 0 && (
                      <div className="w-2 h-2 bg-[#0a1175] rounded-full mt-2 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{n.notificacao_cabecalho}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{n.notificacao_body}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.notificacao_data)}</p>
                    </div>
                  </div>
                  {n.notificacao_lido === 0 && (
                    <button
                      onClick={() => marcarLida(n.notificacao_id)}
                      className="text-xs text-[#0a1175] hover:underline shrink-0"
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
