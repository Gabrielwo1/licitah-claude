'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Settings, ExternalLink, List, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Licitacao } from '@/lib/types';
import { useState } from 'react';

// ── Itens localStorage cache helpers (shared key with ItensTab) ───────────────
const ITENS_TTL = 24 * 60 * 60 * 1000;
function itensLSKey(id: string) { return `pncp_itens:${id}`; }
function getCachedItens(id: string): any[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(itensLSKey(id));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > ITENS_TTL) { localStorage.removeItem(itensLSKey(id)); return null; }
    return data;
  } catch { return null; }
}
function saveCachedItens(id: string, data: any[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(itensLSKey(id), JSON.stringify({ data, ts: Date.now() })); } catch {}
}

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
  const [itensOpen, setItensOpen] = useState(false);
  const [itens, setItens] = useState<any[] | null>(null);
  const [itensLoading, setItensLoading] = useState(false);

  async function toggleItens(e: React.MouseEvent) {
    e.preventDefault();
    if (itensOpen) { setItensOpen(false); return; }
    setItensOpen(true);
    if (itens !== null) return; // já carregados

    // 1. Verifica cache
    const cached = getCachedItens(licitacao.numeroControlePNCP);
    if (cached) { setItens(cached); return; }

    // 2. Busca da API
    setItensLoading(true);
    try {
      const res = await fetch(`/api/licitacoes/itens?identificador=${encodeURIComponent(licitacao.numeroControlePNCP)}`);
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setItens(arr);
        if (arr.length > 0) saveCachedItens(licitacao.numeroControlePNCP, arr);
      } else { setItens([]); }
    } catch { setItens([]); }
    setItensLoading(false);
  }

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

          {/* Itens toggle */}
          <button
            onClick={toggleItens}
            className="flex items-center gap-1.5 font-semibold transition-colors"
            style={{
              backgroundColor: itensOpen ? '#e05a00' : '#FF6600',
              color: '#fff',
              fontSize: '13px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e05a00')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = itensOpen ? '#e05a00' : '#FF6600')}
          >
            <List className="h-3.5 w-3.5" />
            Itens
            {itensOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* ── Itens dropdown ── */}
        {itensOpen && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #F0F0F0', paddingTop: '12px' }}>
            {itensLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7B7B7B', fontSize: '13px', padding: '8px 0' }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando itens no PNCP...
              </div>
            ) : itens && itens.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9B9B9B', padding: '8px 0' }}>Nenhum item encontrado para esta licitação.</p>
            ) : itens && itens.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #E8E8E8' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: '#F5F5F5' }}>
                      <tr>
                        {['Número', 'Descrição', 'Quantidade', 'Valor unitário estimado', 'Valor total estimado'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#1a237e', whiteSpace: 'nowrap', borderBottom: '2px solid #E0E0E0' }}>
                            {h} <span style={{ fontSize: '9px', color: '#9e9e9e' }}>↕</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itens.slice(0, 5).map((item: any, idx: number) => (
                        <tr key={item.numeroItem ?? idx}
                          style={{ borderBottom: '1px solid #F0F0F0' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#F9F9FF'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#fff'}>
                          <td style={{ padding: '8px 12px', color: '#262E3A', whiteSpace: 'nowrap' }}>{item.numeroItem ?? idx + 1}</td>
                          <td style={{ padding: '8px 12px', color: '#262E3A', maxWidth: '340px' }}>
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.descricao || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: '#262E3A', whiteSpace: 'nowrap' }}>
                            {item.quantidade != null ? `${Number(item.quantidade).toLocaleString('pt-BR')} ${item.unidadeMedida || ''}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#262E3A', whiteSpace: 'nowrap' }}>
                            {item.valorUnitarioEstimado != null ? formatCurrency(item.valorUnitarioEstimado) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#262E3A', whiteSpace: 'nowrap' }}>
                            {item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {itens.length > 5 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#7B7B7B' }}>
                      Exibindo 5 de {itens.length} itens
                    </span>
                    <button
                      onClick={handleGerenciar}
                      style={{ fontSize: '12px', color: '#1a237e', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Ver todos os itens →
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
