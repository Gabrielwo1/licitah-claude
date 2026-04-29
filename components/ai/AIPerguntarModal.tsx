'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Send, Sparkles, Loader2, Trash2, AlertCircle, MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  licitacaoId: string;
  licitacao: any;
  items: any[];
}

const SUGGESTIONS = [
  'O edital exige garantia de proposta?',
  'Qual o prazo para envio dos lances?',
  'Quais são os principais critérios de habilitação?',
  'A licitação é exclusiva para ME/EPP?',
  'Vale a pena participar com base nos dados?',
];

function extractText(m: UIMessage): string {
  if (!m) return '';
  if (Array.isArray((m as any).parts)) {
    return (m as any).parts
      .filter((p: any) => p?.type === 'text')
      .map((p: any) => p.text)
      .join('\n');
  }
  if (typeof (m as any).content === 'string') return (m as any).content;
  return '';
}

export default function AIPerguntarModal({ open, onClose, licitacaoId, licitacao, items }: Props) {
  const [input, setInput]     = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages, sendMessage, status, error, stop, setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/perguntar',
      body: { id: licitacaoId, licitacao, items },
    }),
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  // Load chat history on open
  useEffect(() => {
    if (!open || historyLoaded) return;
    (async () => {
      try {
        const res = await fetch(`/api/ai/perguntar?id=${encodeURIComponent(licitacaoId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            // Convert DB rows -> UIMessage format
            const restored: UIMessage[] = data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              parts: [{ type: 'text', text: m.content }],
            }));
            setMessages(restored);
          }
        }
      } catch {}
      setHistoryLoaded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    })();
  }, [open, licitacaoId, historyLoaded, setMessages]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage({ text });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function clearHistory() {
    if (!confirm('Limpar todo o histórico desta conversa?')) return;
    try {
      await fetch(`/api/ai/perguntar?id=${encodeURIComponent(licitacaoId)}`, { method: 'DELETE' });
    } catch {}
    setMessages([]);
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
          width: '100%', maxWidth: '760px', height: '85vh', maxHeight: '720px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #0EA5E9 0%, #0891B2 50%, #0E7490 100%)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MessageCircle className="h-5 w-5" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.2px' }}>
                Pergunte ao Edital
                <span style={{
                  marginLeft: '8px', fontSize: '9px', fontWeight: 800,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px',
                  verticalAlign: 'middle',
                }}>BETA</span>
              </div>
              <div style={{ fontSize: '11.5px', opacity: 0.85, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Tire dúvidas sobre {licitacaoId}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                title="Limpar conversa"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', padding: '8px', borderRadius: '8px', display: 'flex' }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', padding: '8px', borderRadius: '8px', display: 'flex' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', backgroundColor: '#FAFBFC' }}>
          {/* Welcome card (shown when empty) */}
          {messages.length === 0 && (
            <div>
              <div style={{
                backgroundColor: '#F1F5F9', borderRadius: '14px', padding: '18px 20px',
                display: 'flex', gap: '12px', marginBottom: '20px',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #0EA5E9, #0891B2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles className="h-4 w-4" style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: '13.5px', color: '#262E3A', margin: 0, lineHeight: 1.55 }}>
                    Olá! Sou o assistente de IA do <strong>Licitah</strong>, treinado para responder
                    perguntas específicas sobre <strong>esta licitação</strong>.
                  </p>
                  <p style={{ fontSize: '12.5px', color: '#475569', margin: '8px 0 0 0', lineHeight: 1.55 }}>
                    Faça perguntas claras e objetivas — quanto mais contexto você der, melhor a resposta.
                  </p>
                </div>
              </div>

              <div style={{ fontSize: '11.5px', color: '#7B7B7B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Sugestões para começar
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    style={{
                      textAlign: 'left', padding: '10px 14px', borderRadius: '10px',
                      backgroundColor: '#fff', border: '1px solid #E5E7EB',
                      fontSize: '13px', color: '#262E3A', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0EA5E9'; (e.currentTarget as HTMLElement).style.backgroundColor = '#F0F9FF'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLElement).style.backgroundColor = '#fff'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map(m => {
            const isUser = m.role === 'user';
            const text = extractText(m);
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex', gap: '10px', marginBottom: '14px',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}
              >
                {!isUser && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #0EA5E9, #0891B2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles className="h-3.5 w-3.5" style={{ color: '#fff' }} />
                  </div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  backgroundColor: isUser ? '#0EA5E9' : '#fff',
                  color: isUser ? '#fff' : '#262E3A',
                  border: isUser ? 'none' : '1px solid #E5E7EB',
                  fontSize: '13.5px', lineHeight: 1.6,
                  boxShadow: isUser ? '0 1px 4px rgba(14,165,233,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
                  ) : (
                    <div className="ai-chat-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || '...'}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Streaming indicator */}
          {status === 'submitted' && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
                background: 'linear-gradient(135deg, #0EA5E9, #0891B2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#fff' }} />
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                backgroundColor: '#fff', border: '1px solid #E5E7EB',
                fontSize: '13px', color: '#7B7B7B',
              }}>
                Pensando...
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              padding: '10px 14px', borderRadius: '10px',
              color: '#DC2626', fontSize: '12.5px',
              display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px',
            }}>
              <AlertCircle className="h-4 w-4" />
              <span>{error.message || 'Erro ao gerar resposta. Tente novamente.'}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #E5E7EB', padding: '14px 20px', backgroundColor: '#fff', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '8px',
            border: '2px solid #E5E7EB', borderRadius: '14px',
            padding: '8px 8px 8px 14px',
            transition: 'border-color 0.15s',
            backgroundColor: '#fff',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre prazos, exigências, valores, modalidade..."
              rows={1}
              disabled={isStreaming}
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none',
                fontSize: '13.5px', lineHeight: 1.5, padding: '6px 0',
                fontFamily: 'inherit', color: '#262E3A',
                backgroundColor: 'transparent',
                maxHeight: '120px',
              }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
            {isStreaming ? (
              <button
                onClick={stop}
                title="Parar"
                style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  border: 'none', cursor: 'pointer',
                  backgroundColor: '#F1F5F9', color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ width: '10px', height: '10px', backgroundColor: '#475569', borderRadius: '2px' }} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                  background: input.trim() ? 'linear-gradient(135deg, #0EA5E9, #0891B2)' : '#E5E7EB',
                  color: input.trim() ? '#fff' : '#9B9B9B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <div style={{ fontSize: '10.5px', color: '#9B9B9B', marginTop: '6px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <AlertCircle className="h-3 w-3" />
            Esse chat pode cometer erros. Verifique informações importantes no edital oficial.
          </div>
        </div>
      </div>

      <style>{`
        .ai-chat-md p { margin: 0 0 8px 0; }
        .ai-chat-md p:last-child { margin-bottom: 0; }
        .ai-chat-md strong { color: #0F172A; font-weight: 700; }
        .ai-chat-md ul, .ai-chat-md ol { margin: 6px 0; padding-left: 20px; }
        .ai-chat-md li { margin: 2px 0; }
        .ai-chat-md code {
          background: #F1F5F9; padding: 1px 5px; border-radius: 4px;
          font-family: ui-monospace, monospace; font-size: 0.9em;
        }
        .ai-chat-md h1, .ai-chat-md h2, .ai-chat-md h3 {
          font-weight: 800; color: #0F172A; margin: 10px 0 6px 0;
        }
        .ai-chat-md h3 { font-size: 14px; }
      `}</style>
    </div>
  );
}
