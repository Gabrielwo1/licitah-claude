'use client';

import Link from 'next/link';
import { MapPin, Calendar, Building2, Star, CheckSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, truncate } from '@/lib/utils';
import { Licitacao } from '@/lib/types';
import { useState } from 'react';

function getStatusBadge(situacaoId: number, nome: string) {
  if (situacaoId === 1) return <Badge variant="success">{nome}</Badge>;
  if (situacaoId === 2) return <Badge variant="destructive">{nome}</Badge>;
  if (situacaoId === 3) return <Badge variant="warning">{nome}</Badge>;
  return <Badge variant="secondary">{nome}</Badge>;
}

interface LicitacaoCardProps {
  licitacao: Licitacao;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

export function LicitacaoCard({ licitacao, isFavorite = false, onFavoriteToggle }: LicitacaoCardProps) {
  const [fav, setFav] = useState(isFavorite);
  const [loading, setLoading] = useState(false);

  async function toggleFavorite() {
    setLoading(true);
    try {
      const res = await fetch('/api/favoritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: licitacao.numeroControlePNCP, modulo: 'licitacao' }),
      });
      if (res.ok) {
        const data = await res.json();
        setFav(data.favorited);
        onFavoriteToggle?.(licitacao.numeroControlePNCP);
      }
    } finally {
      setLoading(false);
    }
  }

  const detailHref = `/dashboard/licitacoes/${encodeURIComponent(licitacao.numeroControlePNCP)}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {getStatusBadge(licitacao.situacaoCompraId, licitacao.situacaoCompraNome)}
              <Badge variant="outline" className="text-xs">{licitacao.modalidadeNome}</Badge>
            </div>
            <h3 className="font-medium text-gray-900 text-sm leading-snug mt-1">
              {truncate(licitacao.objetoCompra, 120)}
            </h3>
          </div>
          <button
            onClick={toggleFavorite}
            disabled={loading}
            className={`shrink-0 p-1.5 rounded-md transition-colors ${fav ? 'text-[#ff6600]' : 'text-gray-400 hover:text-[#ff6600]'}`}
          >
            <Star className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{truncate(licitacao.orgaoEntidade.razaoSocial, 50)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{licitacao.unidadeOrgao.municipioNome}, {licitacao.unidadeOrgao.ufSigla}</span>
          </div>
          {licitacao.dataAberturaProposta && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Abertura: {formatDate(licitacao.dataAberturaProposta)}</span>
            </div>
          )}
          {licitacao.dataEncerramentoProposta && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Encerramento: {formatDate(licitacao.dataEncerramentoProposta)}</span>
            </div>
          )}
        </div>

        {licitacao.valorTotalEstimado && licitacao.valorTotalEstimado > 0 && (
          <div className="text-sm font-semibold text-[#0a1175] mb-3">
            {formatCurrency(licitacao.valorTotalEstimado)}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={detailHref}>
            <Button size="sm" variant="default">Ver detalhes</Button>
          </Link>
          {licitacao.linkSistemaOrigem && (
            <a href={licitacao.linkSistemaOrigem} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <ExternalLink className="h-3.5 w-3.5" />
                Portal
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
