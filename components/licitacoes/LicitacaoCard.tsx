'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Settings, ExternalLink, List } from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import { Licitacao } from '@/lib/types';
import { useState } from 'react';

interface LicitacaoCardProps {
  licitacao: Licitacao;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

function getSituacaoStyle(nome: string): React.CSSProperties {
  const lower = nome?.toLowerCase() || '';
  if (lower.includes('encerr') || lower.includes('fechad') || lower.includes('cancel')) {
    return { backgroundColor: '#FF4500', color: '#fff' };
  }
  if (lower.includes('divulg') || lower.includes('aberta') || lower.includes('aberto')) {
    return { backgroundColor: '#259F46', color: '#fff' };
  }
  if (lower.includes('suspens')) {
    return { backgroundColor: '#FFA500', color: '#fff' };
  }
  if (lower.includes('publicad')) {
    return { backgroundColor: '#FFD700', color: '#262E3A' };
  }
  return { backgroundColor: '#7B7B7B', color: '#fff' };
}

export function LicitacaoCard({
  licitacao,
  isFavorite = false,
  onFavoriteToggle,
}: LicitacaoCardProps) {
  const router = useRouter();
  const [fav, setFav] = useState(isFavorite);
  const [favLoading, setFavLoading] = useState(false);
  const [gerenciandoLoading, setGerenciandoLoading] = useState(false);

  async function handleGerenciar(e: React.MouseEvent) {
    e.preventDefault();
    setGerenciandoLoading(true);
    try {
      await fetch('/api/gerenciadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identificador: licitacao.numeroControlePNCP,
          objeto: licitacao.objetoCompra,
          orgao: licitacao.orgaoEntidade?.razaoSocial,
          cidade: licitacao.unidadeOrgao?.municipioNome,
          uf: licitacao.unidadeOrgao?.ufSigla,
          valor: licitacao.valorTotalEstimado,
          situacao: licitacao.situacaoCompraNome,
          dataAbertura: licitacao.dataAberturaProposta,
          dataEncerramento: licitacao.dataEncerramentoProposta,
        }),
      });
    } finally {
      setGerenciandoLoading(false);
    }
    router.push(`/dashboard/licitacoes/gerenciar/${encodeURIComponent(licitacao.numeroControlePNCP)}`);
  }

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFavLoading(true);
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
        if (!data.favorited) onFavoriteToggle?.(licitacao.numeroControlePNCP);
      }
    } finally {
      setFavLoading(false);
    }
  }

  const detailHref = `/dashboard/licitacoes/${encodeURIComponent(licitacao.numeroControlePNCP)}`;
  const situacaoStyle = getSituacaoStyle(licitacao.situacaoCompraNome);

  // Use dataAtualizacaoPncp if available, fallback to dataPublicacaoPncp
  const updatedAt = (licitacao as any).dataAtualizacaoPncp || licitacao.dataPublicacaoPncp;

  // Monta URL do PNCP: pncp.gov.br/app/editais/{cnpj}/{ano}/{sequencial}
  // numeroControlePNCP ex: "03755472000142-1-000020/2026"
  function buildPncpUrl(id: string): string {
    try {
      const parts = id.split('-');
      const cnpj = parts[0];
      const last = parts[parts.length - 1]; // "000020/2026"
      const [seqStr, ano] = last.split('/');
      const sequencial = parseInt(seqStr, 10); // remove zeros à esquerda
      return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${sequencial}`;
    } catch {
      return licitacao.linkSistemaOrigem || '#';
    }
  }

  const pncpUrl = buildPncpUrl(licitacao.numeroControlePNCP);

  const hasDatas = licitacao.dataAberturaProposta || licitacao.dataEncerramentoProposta;

  return (
    <div
      className="bg-white"
      style={{
        borderRadius: '8px',
        border: '1px solid #E8E8E8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        marginBottom: '10px',
        overflow: 'hidden',
      }}
    >
      {/* Top row: heart + updated */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2"
      >
        <button
          onClick={toggleFavorite}
          disabled={favLoading}
          className="flex items-center justify-center w-7 h-7 rounded transition-all"
          title={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          style={{
            border: `1.5px solid ${fav ? '#FF6600' : '#CFCFCF'}`,
            backgroundColor: fav ? '#FFF5EE' : '#fff',
            color: fav ? '#FF6600' : '#CFCFCF',
          }}
        >
          <Heart
            className="h-3.5 w-3.5"
            fill={fav ? '#FF6600' : 'none'}
            stroke={fav ? '#FF6600' : '#CFCFCF'}
            strokeWidth={2}
          />
        </button>
        <span style={{ fontSize: '11px', color: '#9B9B9B' }}>
          Atualizada em: {formatDateTime(updatedAt)}
        </span>
      </div>

      {/* Card body */}
      <div className="px-4 pb-4">
        {/* Objeto */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#262E3A', lineHeight: '1.5' }}>
            <strong style={{ marginRight: '4px' }}>Objeto:</strong>
            {licitacao.objetoCompra}
          </span>
        </div>

        {/* Datas */}
        {hasDatas && (
          <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '6px' }}>
            <strong style={{ color: '#262E3A' }}>Datas:</strong>
            {licitacao.dataAberturaProposta && (
              <span style={{ marginLeft: '6px' }}>
                Abertura: {formatDateTime(licitacao.dataAberturaProposta)}
              </span>
            )}
            {licitacao.dataEncerramentoProposta && (
              <span style={{ marginLeft: '10px' }}>
                Encerramento: {formatDateTime(licitacao.dataEncerramentoProposta)}
              </span>
            )}
          </div>
        )}

        {/* Número da Licitação */}
        <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '4px' }}>
          <strong style={{ color: '#262E3A' }}>Número da Licitação:</strong>
          <span style={{ marginLeft: '6px' }}>{licitacao.sequencialCompra}</span>
        </div>

        {/* Órgão */}
        <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '4px' }}>
          <strong style={{ color: '#262E3A' }}>Órgão:</strong>
          <span style={{ marginLeft: '6px' }}>{licitacao.orgaoEntidade?.razaoSocial}</span>
        </div>

        {/* Cidade */}
        <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '10px' }}>
          <strong style={{ color: '#262E3A' }}>Cidade:</strong>
          <span style={{ marginLeft: '6px' }}>
            {licitacao.unidadeOrgao?.municipioNome} - {licitacao.unidadeOrgao?.ufSigla}
          </span>
        </div>

        {/* Situação + Valor */}
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '12px' }}>
          <span
            style={{
              ...situacaoStyle,
              fontSize: '12px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '4px',
              display: 'inline-block',
            }}
          >
            {licitacao.situacaoCompraNome || 'Não informada'}
          </span>

          {licitacao.valorTotalEstimado && licitacao.valorTotalEstimado > 0 && (
            <span
              style={{
                backgroundColor: '#259F46',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                display: 'inline-block',
              }}
            >
              Valor estimado: {formatCurrency(licitacao.valorTotalEstimado)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Gerenciar licitação */}
          <button
            onClick={handleGerenciar}
            disabled={gerenciandoLoading}
            className="flex items-center gap-1.5 font-semibold transition-colors"
            style={{
              backgroundColor: '#262E3A',
              color: '#fff',
              fontSize: '13px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: gerenciandoLoading ? 'wait' : 'pointer',
              opacity: gerenciandoLoading ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!gerenciandoLoading) (e.currentTarget.style.backgroundColor = '#1a2029'); }}
            onMouseLeave={e => { if (!gerenciandoLoading) (e.currentTarget.style.backgroundColor = '#262E3A'); }}
          >
            <Settings className="h-3.5 w-3.5" />
            {gerenciandoLoading ? 'Abrindo...' : 'Gerenciar licitação'}
          </button>

          {/* Consultar edital */}
          {pncpUrl && (
            <a href={pncpUrl} target="_blank" rel="noopener noreferrer">
              <button
                className="flex items-center gap-1.5 font-semibold transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  color: '#FF6600',
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1.5px solid #FF6600',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#FF6600';
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#FF6600';
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Consultar edital
              </button>
            </a>
          )}

          {/* Itens */}
          <Link href={`${detailHref}#itens`}>
            <button
              className="flex items-center gap-1.5 font-semibold transition-colors"
              style={{
                backgroundColor: '#FF6600',
                color: '#fff',
                fontSize: '13px',
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e05a00')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF6600')}
            >
              <List className="h-3.5 w-3.5" />
              Itens
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
