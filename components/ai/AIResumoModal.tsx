'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Sparkles, RefreshCw, Loader2, AlertCircle, Copy, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  licitacaoId: string;
  licitacao: any;
  items: any[];
}

export default function AIResumoModal({ open, onClose, licitacaoId, licitacao, items }: Props) {
  const [conteudo, setConteudo]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [cached, setCached]       = useState(false);
  const [criadoEm, setCriadoEm]   = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);

  async function generate(force = false) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ai/resumo?id=${encodeURIComponent(licitacaoId)}${force ? '&force=1' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licitacao, items }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Erro (${res.status}). Tente novamente.`);
        return;
      }

      const data = await res.json();
      setConteudo(data.conteudo || '');
      setCached(!!data.cached);
      setCriadoEm(data.criadoEm || null);
    } catch (e: any) {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // On open: check cache first, only generate if user clicks
  useEffect(() => {
    if (!open) return;
    setError('');
    setCopied(false);
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ai/resumo?id=${encodeURIComponent(licitacaoId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.cached && data.conteudo) {
            setConteudo(data.conteudo);
            setCached(true);
            setCriadoEm(data.criadoEm || null);
            setLoading(false);
            return;
          }
        }
      } catch {}
      // No cache — generate
      generate(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, licitacaoId]);

  function copyToClipboard() {
    if (!conteudo) return;
    navigator.clipboard.writeText(conteudo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        backgroundColor: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff', borderRadius: '16px',
          width: '100%', maxWidth: '720px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #A855F7 100%)',
          color: '#fff',
          borderRadius: '16px 16px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
              flexShrink: 0,
            }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.2px' }}>
                Resumo Inteligente
                <span style={{
                  marginLeft: '8px', fontSize: '9px', fontWeight: 800,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px',
                  verticalAlign: 'middle',
                }}>BETA</span>
              </div>
              <div style={{ fontSize: '11.5px', opacity: 0.85, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Análise gerada por IA · {licitacaoId}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
              color: '#fff', padding: '8px', borderRadius: '8px', display: 'flex',
              flexShrink: 0,
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {loading && !conteudo ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '14px' }}>
              <div style={{ position: 'relative', width: '54px', height: '54px' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #A855F7)', opacity: 0.15, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <Loader2 className="h-10 w-10 animate-spin" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#7C3AED' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#262E3A' }}>Analisando o edital…</div>
                <div style={{ fontSize: '12px', color: '#7B7B7B', marginTop: '4px' }}>Isso leva uns 5-10 segundos.</div>
              </div>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', textAlign: 'center', gap: '12px' }}>
              <AlertCircle className="h-10 w-10" style={{ color: '#DC2626' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#262E3A' }}>Não foi possível gerar o resumo</div>
              <div style={{ fontSize: '12.5px', color: '#7B7B7B', maxWidth: '420px' }}>{error}</div>
              <button
                onClick={() => generate(true)}
                style={{ backgroundColor: '#7C3AED', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
              </button>
            </div>
          ) : (
            <div className="ai-resumo-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{conteudo}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && conteudo && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #F0F0F0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '11px', color: '#9B9B9B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle className="h-3 w-3" />
              Gerado por IA — confira informações importantes no edital oficial.
              {cached && criadoEm && (
                <span style={{ marginLeft: '8px', backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  Cache · {new Date(criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={copyToClipboard}
                style={{ height: '34px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#fff', color: '#262E3A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                {copied ? <Check className="h-3.5 w-3.5" style={{ color: '#16A34A' }} /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={() => generate(true)}
                disabled={loading}
                style={{ height: '34px', padding: '0 12px', borderRadius: '8px', border: 'none', backgroundColor: '#7C3AED', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Regenerar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Markdown styling */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50%      { transform: scale(1.15); opacity: 0.3; }
        }
        .ai-resumo-content { color: #262E3A; font-size: 14px; line-height: 1.7; }
        .ai-resumo-content h1, .ai-resumo-content h2, .ai-resumo-content h3 {
          font-weight: 800; color: #0F172A; margin-top: 22px; margin-bottom: 10px;
          letter-spacing: -0.3px;
        }
        .ai-resumo-content h1 { font-size: 18px; }
        .ai-resumo-content h2 { font-size: 16px; }
        .ai-resumo-content h3 { font-size: 15px; }
        .ai-resumo-content h3:first-child { margin-top: 0; }
        .ai-resumo-content p { margin: 8px 0; }
        .ai-resumo-content strong { color: #0F172A; font-weight: 700; }
        .ai-resumo-content ul, .ai-resumo-content ol { margin: 8px 0; padding-left: 22px; }
        .ai-resumo-content li { margin: 4px 0; }
        .ai-resumo-content code {
          background: #F1F5F9; padding: 1px 6px; border-radius: 4px;
          font-family: ui-monospace, monospace; font-size: 0.9em;
        }
        .ai-resumo-content blockquote {
          border-left: 3px solid #7C3AED; padding: 4px 14px; margin: 12px 0;
          background: #F8F7FF; border-radius: 0 6px 6px 0; color: #475569;
        }
      `}</style>
    </div>
  );
}
