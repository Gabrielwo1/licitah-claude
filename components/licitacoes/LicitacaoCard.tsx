'use client';

import Link from 'next/link';
import { MapPin, Calendar, Building2, Star, ExternalLink, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Licitacao } from '@/lib/types';
import { useState } from 'react';

type StatusVariant = 'aberto' | 'fechado' | 'publicado' | 'suspensa' | 'cancelada' | 'default';

function getStatusVariant(situacaoId: number, nome: string): StatusVariant {
  const lower = nome?.toLowerCase() || '';
  if (lower.includes('divulg') || lower.includes('aberta') || lower.includes('aberto')) return 'aberto';
  if (lower.includes('encerr') || lower.includes('fechad')) return 'fechado';
  if (lower.includes('publicad') || lower.includes('publicad')) return 'publicado';
  if (lower.includes('suspens')) return 'suspensa';
  if (lower.includes('cancel')) return 'cancelada';
  // Fallback by ID
  if (situacaoId === 1) return 'aberto';
  if (situacaoId === 2) return 'fechado';
  if (situacaoId === 3) return 'suspensa';
  return 'default';
}

interface LicitacaoCardProps {
  licitacao: Licitacao;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

export function LicitacaoCard({
  licitacao,
  isFavorite = false,
  onFavoriteToggle,
}: LicitacaoCardProps) {
  const [fav, setFav] = useState(isFavorite);
  const [loading, setLoading] = useState(false);

  async function toggleFavorite() {
    setLoading(true);
    try {
      const res = await fetch('/api/favoritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identificador: licitacao.numeroControlePNCP,
          modulo: 'licitacao',
        }),
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
  const statusVariant = getStatusVariant(licitacao.situacaoCompraId, licitacao.situacaoCompraNome);

  return (
    <div
      className="bg-white p-5 hover:shadow-md transition-shadow"
      style={{
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusVariant as any}>
            {licitacao.situacaoCompraNome}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {licitacao.modalidadeNome}
          </Badge>
        </div>
        {/* Favorite star */}
        <button
          onClick={toggleFavorite}
          disabled={loading}
          className="shrink-0 p-1 rounded transition-colors"
          title={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          style={{ color: fav ? '#FF6600' : '#CFCFCF' }}
          onMouseEnter={(e) => {
            if (!fav) (e.currentTarget as HTMLElement).style.color = '#FF6600';
          }}
          onMouseLeave={(e) => {
            if (!fav) (e.currentTarget as HTMLElement).style.color = '#CFCFCF';
          }}
        >
          <Star
            className="h-5 w-5"
            fill={fav ? '#FF6600' : 'none'}
            stroke={fav ? '#FF6600' : 'currentColor'}
          />
        </button>
      </div>

      {/* Title */}
      <h3
        className="font-semibold text-sm leading-snug mb-3 line-clamp-2"
        style={{ color: '#262E3A' }}
        title={licitacao.objetoCompra}
      >
        {licitacao.objetoCompra}
      </h3>

      {/* Info grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs mb-3"
        style={{ color: '#7B7B7B' }}
      >
        {/* Orgao */}
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: '#0a1175' }} />
          <span className="truncate" title={licitacao.orgaoEntidade.razaoSocial}>
            {licitacao.orgaoEntidade.razaoSocial}
          </span>
        </div>

        {/* Local */}
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: '#0a1175' }} />
          <span>
            {licitacao.unidadeOrgao.municipioNome}, {licitacao.unidadeOrgao.ufSigla}
          </span>
        </div>

        {/* Abertura */}
        {licitacao.dataAberturaProposta && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: '#0a1175' }} />
            <span>Abertura: {formatDate(licitacao.dataAberturaProposta)}</span>
          </div>
        )}

        {/* Encerramento */}
        {licitacao.dataEncerramentoProposta && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: '#FF6600' }} />
            <span>Encerramento: {formatDate(licitacao.dataEncerramentoProposta)}</span>
          </div>
        )}
      </div>

      {/* Value */}
      {licitacao.valorTotalEstimado && licitacao.valorTotalEstimado > 0 && (
        <div
          className="text-base font-bold mb-3"
          style={{ color: '#0a1175' }}
        >
          {formatCurrency(licitacao.valorTotalEstimado)}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={detailHref}>
          <Button size="sm" variant="padrao">
            Ver detalhes
          </Button>
        </Link>

        <Link href={`${detailHref}?criar_tarefa=1`}>
          <Button size="sm" variant="orange-outline">
            <Plus className="h-3.5 w-3.5" />
            Criar tarefa
          </Button>
        </Link>

        {licitacao.linkSistemaOrigem && (
          <a
            href={licitacao.linkSistemaOrigem}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline">
              <ExternalLink className="h-3.5 w-3.5" />
              Portal
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
