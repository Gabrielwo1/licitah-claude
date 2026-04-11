'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plano } from '@/lib/types';

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [assinando, setAssinando] = useState<number | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/planos')
      .then(r => r.json())
      .then(d => setPlanos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function assinar(planoId: number) {
    setAssinando(planoId);
    // Simulate subscription
    await new Promise(r => setTimeout(r, 1000));
    setSuccess(`Plano ativado com sucesso!`);
    setAssinando(null);
  }

  const features = (descLonga: string) => {
    if (!descLonga) return [];
    return descLonga.split('\n').filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-[#0a1175]" />
        <h1 className="text-xl font-bold text-gray-900">Planos e Assinaturas</h1>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 text-sm flex items-center gap-2">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a1175]" />
        </div>
      ) : planos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>Nenhum plano disponível no momento.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {planos.map((p, index) => {
            const isDestaque = index === 1;
            return (
              <Card
                key={p.plano_id}
                className={`relative ${isDestaque ? 'border-[#0a1175] shadow-lg ring-2 ring-[#0a1175]/20' : ''}`}
              >
                {isDestaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#ff6600] text-white px-3">Mais popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{p.plano_nome}</CardTitle>
                  <CardDescription>{p.plano_curta}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {features(p.plano_longa).map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-gray-700">{f}</span>
                      </div>
                    ))}
                    {features(p.plano_longa).length === 0 && (
                      <p className="text-sm text-gray-500">Acesso à plataforma de licitações</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isDestaque ? 'orange' : 'default'}
                    loading={assinando === p.plano_id}
                    onClick={() => assinar(p.plano_id)}
                  >
                    Assinar plano
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center text-sm text-gray-400 pt-4">
        <p>Todos os planos incluem acesso às licitações do governo federal em tempo real.</p>
        <p>Entre em contato para planos enterprise e personalizados.</p>
      </div>
    </div>
  );
}
