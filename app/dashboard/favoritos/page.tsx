'use client';

import { useState, useEffect } from 'react';
import { Star, Loader2, Search } from 'lucide-react';
import { LicitacaoCard } from '@/components/licitacoes/LicitacaoCard';
import { Licitacao } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Favorito {
  favorito_id: number;
  favorito_identificador: string;
  favorito_modulo: string;
}

export default function FavoritosPage() {
  const [loading, setLoading] = useState(true);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/favoritos');
      if (res.ok) {
        const data = await res.json();
        setFavoritos(data.filter((f: Favorito) => f.favorito_modulo === 'licitacao'));
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleFavoriteToggle(id: string) {
    setRemovedIds(prev => new Set([...prev, id]));
  }

  const visible = favoritos.filter(f => !removedIds.has(f.favorito_identificador));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Star className="h-5 w-5" style={{ color: '#FF6600' }} />
        <h1 className="text-xl font-bold" style={{ color: '#262E3A' }}>Favoritos</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0a1175' }} />
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="text-center py-16" style={{ color: '#7B7B7B' }}>
          <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold">Nenhuma licitação favoritada</p>
          <p className="text-sm mt-1">Favorita licitações para acessá-las rapidamente aqui.</p>
          <Link href="/dashboard/licitacoes" className="mt-4 inline-block">
            <Button variant="padrao">
              <Search className="h-4 w-4" />
              Buscar Licitações
            </Button>
          </Link>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: '#7B7B7B' }}>
            {visible.length} licitação(ões) favoritada(s)
          </p>
          {visible.map((f) => (
            <FavoritoItem
              key={f.favorito_id}
              id={f.favorito_identificador}
              onRemove={() => handleFavoriteToggle(f.favorito_identificador)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoritoItem({ id, onRemove }: { id: string; onRemove: () => void }) {
  const [licitacao, setLicitacao] = useState<Licitacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLic() {
      try {
        const res = await fetch(`/api/licitacoes/${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          setLicitacao(data.licitacao || null);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchLic();
  }, [id]);

  if (loading) {
    return (
      <div
        className="h-32 rounded-[10px] animate-pulse"
        style={{ backgroundColor: '#F0F0F0' }}
      />
    );
  }

  if (!licitacao) {
    return (
      <div
        className="p-4 rounded-[10px] text-sm"
        style={{
          border: '1px solid #F0F0F0',
          backgroundColor: '#fff',
          color: '#7B7B7B',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <p className="font-semibold" style={{ color: '#262E3A' }}>Licitação não encontrada</p>
        <p className="text-xs mt-0.5">{id}</p>
        <p className="text-xs mt-1">Não foi possível carregar os detalhes desta licitação.</p>
      </div>
    );
  }

  return <LicitacaoCard licitacao={licitacao} isFavorite={true} onFavoriteToggle={onRemove} />;
}
