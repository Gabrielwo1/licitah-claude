'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Lock, Check, CreditCard, Loader2, Copy, CheckCircle, QrCode, Star,
  ShieldCheck, ChevronRight,
} from 'lucide-react';

declare global { interface Window { MercadoPago: any; } }

const MP_SDK        = 'https://sdk.mercadopago.com/js/v2';
// Public key is safe to embed in client code — it is designed to be public
const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? 'APP_USR-bae4830f-8c04-4be6-bcef-7b2620120843';

const FEATURES = [
  'Licitações gerenciadas ilimitadas',
  'Documentos ilimitados',
  'CNPJs ilimitados',
  'Relatório diário de oportunidades (IA)',
  'Criação de declarações automáticas',
  'Resumo de editais por IA',
  'Robô de lances no Compras.gov',
];

type PayMethod = 'card' | 'pix';

interface PixData {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string;
}

export default function CheckoutPage() {
  const router = useRouter();

  const [method, setMethod]         = useState<PayMethod>('card');
  const [cardReady, setCardReady]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [cpf, setCpf]               = useState('');
  const [pixData, setPixData]       = useState<PixData | null>(null);
  const [pixStatus, setPixStatus]   = useState<'pending' | 'approved' | 'expired'>('pending');
  const [copied, setCopied]         = useState(false);
  const [success, setSuccess]       = useState(false);
  const cardFormRef = useRef<any>(null);

  // Check if user already has Expert plan
  useEffect(() => {
    fetch('/api/checkout/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.plano === 'expert') router.replace('/dashboard/planos'); })
      .catch(() => {});
  }, [router]);

  // Initialize MP card form ONCE — never unmount to avoid "already instantiated" errors
  useEffect(() => {
    function mountForm() {
      if (!window.MercadoPago || cardFormRef.current) return;
      try {
        const mp   = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        const form = mp.cardForm({
          amount:    '99.99',
          autoMount: true,
          form: {
            id:                   'mp-form',
            cardNumber:           { id: 'mp-card-number', placeholder: '0000 0000 0000 0000' },
            expirationDate:       { id: 'mp-expiry',      placeholder: 'MM/AA' },
            securityCode:         { id: 'mp-cvv',         placeholder: 'CVV' },
            cardholderName:       { id: 'mp-holder',      placeholder: 'Nome como no cartão' },
            issuer:               { id: 'mp-issuer' },
            installments:         { id: 'mp-installments' },
            identificationType:   { id: 'mp-id-type' },
            identificationNumber: { id: 'mp-id-number',  placeholder: 'Digite seu CPF' },
          },
          callbacks: {
            onFormMounted: (err: any) => { if (err) console.warn('[MP] onFormMounted warning:', err); setCardReady(true); },
            onSubmit:      handleCardSubmit,
            onFetching:    () => {},
          },
        });
        cardFormRef.current = form;
      } catch (e) {
        console.error('[MP] cardForm error:', e);
      }
    }

    if (window.MercadoPago) {
      mountForm();
    } else if (!document.getElementById('mp-sdk')) {
      const s  = document.createElement('script');
      s.id     = 'mp-sdk';
      s.src    = MP_SDK;
      s.onload = mountForm;
      document.head.appendChild(s);
    }
    // No cleanup — intentionally never unmount the MP form
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PIX status polling
  useEffect(() => {
    if (!pixData || pixStatus !== 'pending') return;
    const timer = setInterval(async () => {
      try {
        const res  = await fetch(`/api/checkout/pix/status?id=${pixData.paymentId}`);
        const data = await res.json();
        if (data.status === 'approved') {
          setPixStatus('approved');
          setSuccess(true);
          clearInterval(timer);
          setTimeout(() => router.push('/dashboard/planos?success=1'), 2500);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [pixData, pixStatus, router]);

  async function handleCardSubmit(e: Event) {
    e.preventDefault();
    if (!cardFormRef.current || submitting) return;
    setSubmitting(true);
    setError(null);

    const data  = cardFormRef.current.getCardFormData();
    const token = data?.token;
    if (!token) {
      setError('Dados do cartão inválidos. Verifique e tente novamente.');
      setSubmitting(false);
      return;
    }
    try {
      const res  = await fetch('/api/checkout/criar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Erro ao processar pagamento'); setSubmitting(false); return; }
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/planos?success=1'), 2500);
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setSubmitting(false);
    }
  }

  async function handlePixGenerate() {
    setSubmitting(true);
    setError(null);
    try {
      const res  = await fetch('/api/checkout/pix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ cpf: cpf.replace(/\D/g, '') }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Erro ao gerar PIX'); return; }
      setPixData(json);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <CheckCircle style={{ width: '72px', height: '72px', color: '#22C55E', margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#111', marginBottom: '8px' }}>Pagamento confirmado!</h2>
          <p style={{ color: '#6B7280', fontSize: '15px' }}>Plano Expert ativado. Redirecionando…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header style={{
        backgroundColor: '#fff', borderBottom: '1px solid #E5E7EB',
        padding: '0 24px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Image
          src="/logo.png"
          alt="Licitah"
          width={130}
          height={40}
          style={{ objectFit: 'contain', height: '36px', width: 'auto' }}
          priority
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px' }}>
          <Lock style={{ width: '14px', height: '14px', color: '#22C55E' }} />
          Checkout seguro
        </div>
      </header>

      {/* Steps */}
      <div style={{
        backgroundColor: '#fff', borderBottom: '1px solid #E5E7EB',
        display: 'flex', justifyContent: 'center', gap: '0', padding: '0',
      }}>
        {(['Plano', 'Pagamento', 'Confirmação'] as const).map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '14px 20px',
              color:       i === 1 ? '#E07028' : i === 0 ? '#22C55E' : '#9CA3AF',
              fontWeight:  i === 1 ? 700 : 500,
              fontSize:    '13px',
              borderBottom: i === 1 ? '2px solid #E07028' : '2px solid transparent',
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                backgroundColor: i === 0 ? '#22C55E' : i === 1 ? '#E07028' : '#E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {i === 0 ? <Check style={{ width: '12px', height: '12px' }} /> : i + 1}
              </div>
              {label}
            </div>
            {i < 2 && <ChevronRight style={{ width: '16px', height: '16px', color: '#D1D5DB' }} />}
          </div>
        ))}
      </div>

      {/* Main */}
      <main style={{
        maxWidth: '1100px', margin: '0 auto', padding: '40px 24px',
        display: 'grid', gridTemplateColumns: '1fr 420px', gap: '32px',
        alignItems: 'start',
      }}>

        {/* ── Left: Payment ── */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '16px',
          border: '1px solid #E5E7EB', padding: '32px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111', marginBottom: '24px' }}>
            Forma de pagamento
          </h2>

          {/* Method tabs */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
            {(['card', 'pix'] as PayMethod[]).map(m => (
              <button
                key={m}
                onClick={() => { setMethod(m); setError(null); setPixData(null); }}
                style={{
                  flex: 1, height: '52px', borderRadius: '10px',
                  border: `2px solid ${method === m ? '#E07028' : '#E5E7EB'}`,
                  backgroundColor: method === m ? '#FFF7ED' : '#fff',
                  color:           method === m ? '#E07028' : '#6B7280',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'card'
                  ? <><CreditCard style={{ width: '18px', height: '18px' }} /> Cartão de Crédito</>
                  : <><QrCode     style={{ width: '18px', height: '18px' }} /> PIX</>
                }
              </button>
            ))}
          </div>

          {/* ── Card form — always in DOM, hidden when PIX is active ── */}
          <form id="mp-form" style={{ display: method === 'card' ? 'flex' : 'none', flexDirection: 'column', gap: '18px' }}>

              <Field label="Nome no cartão">
                <input id="mp-holder" style={{ ...inputStyle, width: '100%' }} placeholder="Nome como no cartão" />
              </Field>

              <Field label="Número do cartão">
                <div id="mp-card-number" style={mpField} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Validade">
                  <div id="mp-expiry" style={mpField} />
                </Field>
                <Field label="CVV">
                  <div id="mp-cvv" style={mpField} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '16px' }}>
                <Field label="Tipo">
                  <div id="mp-id-type" style={mpField} />
                </Field>
                <Field label="CPF / Documento">
                  <div id="mp-id-number" style={mpField} />
                </Field>
              </div>

              {/* Fields required by MP but hidden for subscriptions */}
              <select id="mp-issuer"       style={{ display: 'none' }} />
              <select id="mp-installments" style={{ display: 'none' }} />

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={!cardReady || submitting}
                style={submitBtn(!cardReady || submitting)}
              >
                {submitting
                  ? <><Spin /> Processando…</>
                  : !cardReady
                    ? <><Spin /> Carregando…</>
                    : <><Lock style={{ width: '16px', height: '16px' }} /> Assinar por R$ 99,99/mês</>
                }
              </button>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
                <ShieldCheck style={{ width: '14px', height: '14px', color: '#009EE3', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Pagamento 100% seguro e criptografado pelo{' '}
                  <strong style={{ color: '#009EE3' }}>Mercado Pago</strong>
                </span>
              </div>
            </form>

          {/* ── PIX — always in DOM, hidden when card is active ── */}
          <div style={{ display: method === 'pix' ? 'flex' : 'none', flexDirection: 'column', gap: '18px' }}>
              {!pixData ? (
                <>
                  <Field label="Seu CPF (opcional)">
                    <input
                      value={cpf}
                      onChange={e => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </Field>

                  <div style={{
                    backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0',
                    borderRadius: '10px', padding: '14px 16px',
                    fontSize: '13px', color: '#166534', lineHeight: 1.6,
                  }}>
                    <strong>Como funciona o PIX:</strong><br />
                    Gere o QR Code → escaneie com o app do seu banco → pagamento confirmado em segundos.
                    O plano Expert ficará ativo por 30 dias.
                  </div>

                  {error && <ErrorBox message={error} />}

                  <button
                    onClick={handlePixGenerate}
                    disabled={submitting}
                    style={submitBtn(submitting)}
                  >
                    {submitting
                      ? <><Spin /> Gerando QR Code…</>
                      : <><QrCode style={{ width: '16px', height: '16px' }} /> Gerar QR Code PIX — R$ 99,99</>
                    }
                  </button>

                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                    <ShieldCheck style={{ width: '14px', height: '14px', color: '#009EE3', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      Pagamento 100% seguro e criptografado pelo{' '}
                      <strong style={{ color: '#009EE3' }}>Mercado Pago</strong>
                    </span>
                  </div>
                </>
              ) : (
                /* QR code display */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  {pixStatus === 'pending' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px' }}>
                      <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      Aguardando pagamento…
                    </div>
                  )}

                  {pixData.qrCodeBase64 ? (
                    <img
                      src={pixData.qrCodeBase64}
                      alt="QR Code PIX"
                      style={{ width: '220px', height: '220px', borderRadius: '12px', border: '4px solid #E5E7EB' }}
                    />
                  ) : (
                    <div style={{
                      width: '220px', height: '220px', borderRadius: '12px',
                      border: '4px solid #E5E7EB', backgroundColor: '#F9FAFB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#9CA3AF', fontSize: '13px', flexDirection: 'column', gap: '8px',
                    }}>
                      <QrCode style={{ width: '40px', height: '40px' }} />
                      Escaneie com seu banco
                    </div>
                  )}

                  <div style={{ width: '100%' }}>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: 600 }}>
                      PIX Copia e Cola:
                    </p>
                    <div style={{
                      backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB',
                      borderRadius: '8px', padding: '10px 12px',
                      fontSize: '11px', color: '#374151', wordBreak: 'break-all',
                      maxHeight: '80px', overflowY: 'auto', marginBottom: '8px',
                      fontFamily: 'monospace',
                    }}>
                      {pixData.qrCode}
                    </div>
                    <button
                      onClick={handleCopy}
                      style={{
                        width: '100%', height: '44px', borderRadius: '8px',
                        border: '1px solid #E5E7EB', backgroundColor: copied ? '#F0FDF4' : '#fff',
                        color: copied ? '#16A34A' : '#374151',
                        fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {copied
                        ? <><Check style={{ width: '16px', height: '16px' }} /> Copiado!</>
                        : <><Copy style={{ width: '16px', height: '16px' }} /> Copiar código</>
                      }
                    </button>
                  </div>

                  <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>
                    QR Code válido por 30 minutos. Após o pagamento, o plano é ativado automaticamente.
                  </p>

                  <button
                    onClick={() => { setPixData(null); setPixStatus('pending'); }}
                    style={{
                      background: 'none', border: 'none', color: '#E07028',
                      fontSize: '13px', cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    Gerar novo QR Code
                  </button>
                </div>
              )}
            </div>
        </div>

        {/* ── Right: Order summary ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Plan card */}
          <div style={{
            backgroundColor: '#1A0A00', border: '2px solid #E07028',
            borderRadius: '16px', padding: '28px 24px', color: '#fff',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
              backgroundColor: '#E07028', color: '#fff',
              fontSize: '11px', fontWeight: 700, padding: '4px 16px',
              borderRadius: '20px', whiteSpace: 'nowrap', letterSpacing: '0.5px',
            }}>
              MAIS POPULAR
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Star style={{ width: '18px', height: '18px', color: '#E07028' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#FCA46A' }}>Plano Expert</span>
            </div>
            <p style={{ fontSize: '38px', fontWeight: 900, lineHeight: 1.1, marginBottom: '2px' }}>
              R$ 99,99
            </p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '20px' }}>
              {method === 'card' ? '/mês — cobrança automática' : '/30 dias — renovação manual'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    backgroundColor: '#E07028', flexShrink: 0, marginTop: '1px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check style={{ width: '11px', height: '11px', color: '#fff', strokeWidth: 3 }} />
                  </div>
                  <span style={{ fontSize: '13px', color: '#E5E7EB', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price breakdown */}
          <div style={{
            backgroundColor: '#fff', border: '1px solid #E5E7EB',
            borderRadius: '12px', padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Plano Expert</span>
              <span style={{ fontSize: '13px', color: '#111', fontWeight: 600 }}>R$ 99,99</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Desconto</span>
              <span style={{ fontSize: '13px', color: '#22C55E', fontWeight: 600 }}>R$ 0,00</span>
            </div>
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>Total</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#E07028' }}>R$ 99,99</span>
            </div>
          </div>

          {/* Mercado Pago trust badge — destaque */}
          <div style={{
            background:   'linear-gradient(135deg, #009EE3 0%, #0078C1 100%)',
            borderRadius: '12px', padding: '16px 20px',
            display:      'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ShieldCheck style={{ width: '24px', height: '24px', color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                100% seguro • Processado pelo Mercado Pago
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: '3px 0 0', lineHeight: 1.4 }}>
                Seus dados financeiros são criptografados e nunca armazenados em nossos servidores.
              </p>
            </div>
          </div>

          {/* Demais garantias */}
          <div style={{
            backgroundColor: '#fff', border: '1px solid #E5E7EB',
            borderRadius: '12px', padding: '14px 20px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock style={{ width: '16px', height: '16px', color: '#009EE3', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                Conexão SSL — dados 100% criptografados
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Check style={{ width: '16px', height: '16px', color: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                Cancele a qualquer momento, sem multa
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck style={{ width: '16px', height: '16px', color: '#E07028', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                Cobrança automática segura e transparente
              </span>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        #mp-card-number iframe, #mp-expiry iframe, #mp-cvv iframe,
        #mp-id-type iframe, #mp-id-number iframe
        { width: 100% !important; height: 40px !important; }
        @media (max-width: 768px) {
          main { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
      padding: '10px 14px', fontSize: '13px', color: '#DC2626',
    }}>
      {message}
    </div>
  );
}

function Spin() {
  return <Loader2 style={{ width: '17px', height: '17px', animation: 'spin 1s linear infinite' }} />;
}

const mpField: React.CSSProperties = {
  backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB',
  borderRadius: '8px', height: '46px', padding: '0 12px',
  display: 'flex', alignItems: 'center', overflow: 'hidden',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB',
  borderRadius: '8px', height: '46px', padding: '0 12px',
  fontSize: '14px', color: '#111', outline: 'none',
  boxSizing: 'border-box',
};

function submitBtn(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', height: '54px', borderRadius: '10px', border: 'none',
    backgroundColor: disabled ? '#E5E7EB' : '#E07028',
    color:           disabled ? '#9CA3AF' : '#fff',
    fontSize: '15px', fontWeight: 700,
    cursor:          disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'background-color 0.15s', marginTop: '4px',
  };
}
