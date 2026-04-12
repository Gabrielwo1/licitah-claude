'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Trash2, Briefcase } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface GerenciadaRow {
  lg_id: number;
  lg_identificador: string;
  lg_objeto: string | null;
  lg_orgao: string | null;
  lg_cidade: string | null;
  lg_uf: string | null;
  lg_valor: number | null;
  lg_situacao: string | null;
  lg_data_abertura: string | null;
  lg_data_encerramento: string | null;
  lg_criado_em: string;
}

function getSituacaoStyle(nome: string | null): React.CSSProperties {
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

export default function MinhasLicitacoesPage() {
  const [licitacoes, setLicitacoes] = useState<GerenciadaRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchGerenciadas() {
    setLoading(true);
    try {
      const res = await fetch('/api/gerenciadas');
      if (res.ok) {
        const json = await res.json();
        setLicitacoes(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGerenciadas();
  }, []);

  async function handleDelete(lgId: number) {
    if (!confirm('Remover esta licitação do gerenciamento?')) return;
    await fetch(`/api/gerenciadas/${lgId}`, { method: 'DELETE' });
    setLicitacoes(prev => prev.filter(l => l.lg_id !== lgId));
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Briefcase className="h-6 w-6" style={{ color: '#FF6600' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#262E3A' }}>
          Minhas Licitações
        </h1>
      </div>

      {loading ? (
        <div style={{ color: '#7B7B7B', fontSize: '14px' }}>Carregando...</div>
      ) : licitacoes.length === 0 ? (
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #E8E8E8',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            color: '#7B7B7B',
            fontSize: '14px',
          }}
        >
          <Briefcase className="h-10 w-10 mx-auto mb-3" style={{ color: '#CFCFCF' }} />
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>Nenhuma licitação gerenciada</p>
          <p>Clique em &quot;Gerenciar licitação&quot; em qualquer card para adicionar.</p>
          <Link href="/dashboard/licitacoes">
            <button
              style={{
                marginTop: '16px',
                backgroundColor: '#FF6600',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Procurar Licitações
            </button>
          </Link>
        </div>
      ) : (
        <div>
          {licitacoes.map((l) => {
            const situacaoStyle = getSituacaoStyle(l.lg_situacao);
            const gerenciarHref = `/dashboard/licitacoes/gerenciar/${encodeURIComponent(l.lg_identificador)}`;

            return (
              <div
                key={l.lg_id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #E8E8E8',
                  borderRadius: '8px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  marginBottom: '10px',
                  overflow: 'hidden',
                }}
              >
                {/* Top row */}
                <div
                  className="flex items-center justify-between px-4 pt-3 pb-2"
                  style={{ borderBottom: '1px solid #F5F5F5' }}
                >
                  <span style={{ fontSize: '11px', color: '#9B9B9B' }}>
                    Adicionado em: {formatDateTime(l.lg_criado_em)}
                  </span>
                  <button
                    onClick={() => handleDelete(l.lg_id)}
                    title="Remover do gerenciamento"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#CFCFCF',
                      padding: '2px',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FF4500')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#CFCFCF')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-4 pb-4 pt-3">
                  {l.lg_objeto && (
                    <div style={{ fontSize: '13px', color: '#262E3A', marginBottom: '8px' }}>
                      <strong style={{ marginRight: '4px' }}>Objeto:</strong>
                      {l.lg_objeto}
                    </div>
                  )}

                  {(l.lg_data_abertura || l.lg_data_encerramento) && (
                    <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '6px' }}>
                      <strong style={{ color: '#262E3A' }}>Datas:</strong>
                      {l.lg_data_abertura && (
                        <span style={{ marginLeft: '6px' }}>
                          Abertura: {formatDateTime(l.lg_data_abertura)}
                        </span>
                      )}
                      {l.lg_data_encerramento && (
                        <span style={{ marginLeft: '10px' }}>
                          Encerramento: {formatDateTime(l.lg_data_encerramento)}
                        </span>
                      )}
                    </div>
                  )}

                  {l.lg_orgao && (
                    <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '4px' }}>
                      <strong style={{ color: '#262E3A' }}>Órgão:</strong>
                      <span style={{ marginLeft: '6px' }}>{l.lg_orgao}</span>
                    </div>
                  )}

                  {(l.lg_cidade || l.lg_uf) && (
                    <div style={{ fontSize: '13px', color: '#7B7B7B', marginBottom: '10px' }}>
                      <strong style={{ color: '#262E3A' }}>Cidade:</strong>
                      <span style={{ marginLeft: '6px' }}>
                        {l.lg_cidade}{l.lg_uf ? ` - ${l.lg_uf}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Situação + Valor */}
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '12px' }}>
                    {l.lg_situacao && (
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
                        {l.lg_situacao}
                      </span>
                    )}
                    {l.lg_valor && l.lg_valor > 0 && (
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
                        Valor estimado: {formatCurrency(l.lg_valor)}
                      </span>
                    )}
                  </div>

                  {/* Button */}
                  <Link href={gerenciarHref}>
                    <button
                      className="flex items-center gap-1.5 font-semibold"
                      style={{
                        backgroundColor: '#262E3A',
                        color: '#fff',
                        fontSize: '13px',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = '#1a2029')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = '#262E3A')}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Gerenciar licitação
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
