'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2, Lock, Star, CheckCircle } from 'lucide-react';

declare global {
  interface Window { MercadoPago: any; }
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const MP_SDK_URL = 'https://sdk.mercadopago.com/js/v2';

export default function CheckoutModal({ onClose, onSuccess }: Props) {
  const [formReady, setFormReady]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const cardFormRef = useRef<any>(null);
  const mountedRef  = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    function initCardForm() {
      const key = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
      if (!key || !window.MercadoPago) return;

      const mp = new window.MercadoPago(key, { locale: 'pt-BR' });

      cardFormRef.current = mp.cardForm({
        amount: '99.99',
        autoMount: true,
        form: {
          id: 'mp-checkout-form',
          cardNumber:         { id: 'mp-card-number',    placeholder: '0000 0000 0000 0000' },
          expirationDate:     { id: 'mp-expiration',     placeholder: 'MM/AA' },
          securityCode:       { id: 'mp-cvv',            placeholder: 'CVV' },
          cardholderName:     { id: 'mp-holder-name',    placeholder: 'Nome no cartão' },
          issuer:             { id: 'mp-issuer' },
          identificationType: { id: 'mp-id-type' },
          identificationNumber: { id: 'mp-id-number',   placeholder: 'CPF' },
        },
        callbacks: {
          onFormMounted: () => setFormReady(true),
          onSubmit:      handleFormSubmit,
          onFetching:    () => {},
        },
      });
    }

    if (window.MercadoPago) {
      initCardForm();
    } else {
      const existing = document.getElementById('mp-sdk-script');
      if (existing) {
        existing.addEventListener('load', initCardForm);
      } else {
        const script   = document.createElement('script');
        script.id      = 'mp-sdk-script';
        script.src     = MP_SDK_URL;
        script.onload  = initCardForm;
        document.head.appendChild(script);
      }
    }

    return () => {
      try { cardFormRef.current?.unmount?.(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFormSubmit(event: Event) {
    event.preventDefault();
    if (!cardFormRef.current || submitting) return;

    setSubmitting(true);
    setError(null);

    const data = cardFormRef.current.getCardFormData();
    const token = data?.token;

    if (!token) {
      setError('Dados do cartão inválidos. Verifique e tente novamente.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/checkout/criar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Erro ao processar pagamento. Tente novamente.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(onSuccess, 2000);
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position:        'fixed',
        inset:           0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        zIndex:          50,
        padding:         '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#1A0A00',
          border:          '2px solid #E07028',
          borderRadius:    '20px',
          padding:         '32px 28px',
          width:           '100%',
          maxWidth:        '460px',
          maxHeight:       '90vh',
          overflowY:       'auto',
          position:        'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position:   'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            color:      '#9CA3AF', padding: '4px',
          }}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle style={{ width: '56px', height: '56px', color: '#22C55E', margin: '0 auto 16px' }} />
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
              Assinatura confirmada!
            </p>
            <p style={{ fontSize: '14px', color: '#FCA46A' }}>
              Plano Expert ativado com sucesso.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Star style={{ width: '20px', height: '20px', color: '#E07028' }} />
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                  Assinar Plano Expert
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#FCA46A' }}>
                R$ 99,99/mês — cobrança automática mensal
              </p>
            </div>

            {/* Card Form */}
            <form id="mp-checkout-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Card number */}
              <div>
                <label style={labelStyle}>Número do cartão</label>
                <div id="mp-card-number" style={mpFieldStyle} />
              </div>

              {/* Expiry + CVV */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Validade</label>
                  <div id="mp-expiration" style={mpFieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CVV</label>
                  <div id="mp-cvv" style={mpFieldStyle} />
                </div>
              </div>

              {/* Cardholder name */}
              <div>
                <label style={labelStyle}>Nome no cartão</label>
                <div id="mp-holder-name" style={mpFieldStyle} />
              </div>

              {/* CPF */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <div id="mp-id-type" style={mpFieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Documento</label>
                  <div id="mp-id-number" style={mpFieldStyle} />
                </div>
              </div>

              {/* Hidden issuer (required by MP) */}
              <select id="mp-issuer" style={{ display: 'none' }} />

              {/* Error */}
              {error && (
                <div style={{
                  backgroundColor: '#450A0A', border: '1px solid #DC2626',
                  borderRadius: '8px', padding: '10px 14px',
                  fontSize: '13px', color: '#FCA5A5',
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!formReady || submitting}
                style={{
                  width:           '100%',
                  height:          '52px',
                  borderRadius:    '10px',
                  border:          'none',
                  backgroundColor: (!formReady || submitting) ? '#4B3020' : '#E07028',
                  color:           (!formReady || submitting) ? '#8B6040' : '#fff',
                  fontSize:        '15px',
                  fontWeight:      700,
                  cursor:          (!formReady || submitting) ? 'not-allowed' : 'pointer',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  gap:             '8px',
                  transition:      'background-color 0.15s',
                  marginTop:       '4px',
                }}
              >
                {submitting ? (
                  <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  Processando...</>
                ) : !formReady ? (
                  <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  Carregando formulário...</>
                ) : (
                  <>
                    <Lock style={{ width: '16px', height: '16px' }} />
                    Assinar por R$ 99,99/mês
                  </>
                )}
              </button>
            </form>

            <p style={{ fontSize: '11px', color: '#6B7280', textAlign: 'center', marginTop: '12px' }}>
              Pagamento seguro processado pelo Mercado Pago. Cancele a qualquer momento.
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        #mp-card-number iframe,
        #mp-expiration iframe,
        #mp-cvv iframe,
        #mp-holder-name iframe,
        #mp-id-type iframe,
        #mp-id-number iframe { width: 100% !important; height: 40px !important; }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display:      'block',
  fontSize:     '12px',
  fontWeight:   600,
  color:        '#D1D5DB',
  marginBottom: '6px',
};

const mpFieldStyle: React.CSSProperties = {
  backgroundColor: '#2A1505',
  border:          '1px solid #4B3020',
  borderRadius:    '8px',
  height:          '44px',
  padding:         '0 12px',
  display:         'flex',
  alignItems:      'center',
  overflow:        'hidden',
};
