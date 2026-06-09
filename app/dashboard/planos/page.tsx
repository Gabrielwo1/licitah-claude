'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X, Loader2, CreditCard, Star, AlertCircle, CheckCircle } from 'lucide-react';

interface PlanoInfo {
  plano:          'free' | 'expert';
  subscriptionId: string | null;
  status:         string | null;
  uso:            { gerenciadas: number; documentos: number; empresas: number };
}

const FREE_FEATURES = [
  { texto: 'Encontrar licitações disponíveis',           ok: true },
  { texto: 'Criar até 3 licitações para gerenciamento',  ok: true },
  { texto: 'Adicionar até 5 documentos',                 ok: true },
  { texto: 'Criar até 3 tarefas por licitação',          ok: true },
  { texto: 'Criar 1 CNPJ no sistema',                    ok: true },
  { texto: 'Sem acesso ao relatório de oportunidades diárias', ok: false },
  { texto: 'Sem acesso a criação de declarações',        ok: false },
];

const EXPERT_FEATURES = [
  { texto: 'Encontrar licitações disponíveis',                  ok: true },
  { texto: 'Criar licitações ilimitadas para gerenciamento',    ok: true },
  { texto: 'Adicionar documentos ilimitados',                   ok: true },
  { texto: 'Criar tarefas ilimitadas por licitação',            ok: true },
  { texto: 'Criar CNPJs ilimitados no sistema',                 ok: true },
  { texto: 'Acesso ao relatório de oportunidades diárias',      ok: true },
  { texto: 'Criação de declarações personalizadas',             ok: true },
];

export default function PlanosPage() {
  return (
    <Suspense>
      <PlanosContent />
    </Suspense>
  );
}

function PlanosContent() {
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const justSubscribed = searchParams.get('success') === '1';

  const [info, setInfo]             = useState<PlanoInfo | null>(null);
  const [loading, setLoading]       = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [actionError, setActionError]   = useState<string | null>(null);

  function loadInfo() {
    setLoading(true);
    Promise.all([
      fetch('/api/user/plano').then(r => r.ok ? r.json() : null),
      fetch('/api/checkout/status').then(r => r.ok ? r.json() : null),
    ])
      .then(([planoData, statusData]) => {
        if (!planoData) return;
        setInfo({
          plano:          planoData.plano,
          subscriptionId: statusData?.subscriptionId ?? null,
          status:         statusData?.status ?? null,
          uso:            planoData.uso,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadInfo(); }, []);

  const isExpert = info?.plano === 'expert';

  async function handleCancelar() {
    if (!cancelConfirm) { setCancelConfirm(true); return; }
    setCancelling(true);
    setActionError(null);
    try {
      const res  = await fetch('/api/checkout/cancelar', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { setActionError(json.error ?? 'Erro ao cancelar'); return; }
      setCancelConfirm(false);
      loadInfo();
    } catch {
      setActionError('Erro de conexão. Tente novamente.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-[#0a1175]" />
        <h1 className="text-xl font-bold text-gray-900">Planos e Assinaturas</h1>
      </div>

      {/* Banner de sucesso após checkout */}
      {justSubscribed && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: '10px', padding: '12px 16px', maxWidth: '900px',
          fontSize: '14px', fontWeight: 600, color: '#166534',
        }}>
          <CheckCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
          Assinatura ativada com sucesso! Bem-vindo ao Plano Expert.
        </div>
      )}

      {/* Badge do plano atual */}
      {!loading && info && (
        <div
          style={{
            display:         'inline-flex',
            alignItems:      'center',
            gap:             '8px',
            padding:         '8px 16px',
            borderRadius:    '8px',
            backgroundColor: isExpert ? '#FFF4E5' : '#F0F4FF',
            border:          `1px solid ${isExpert ? '#FFB347' : '#C7D2FE'}`,
            fontSize:        '13px',
            fontWeight:      600,
            color:           isExpert ? '#B45309' : '#0a1175',
          }}
        >
          {isExpert
            ? <><Star className="h-4 w-4" /> Plano Expert ativo</>
            : <><CreditCard className="h-4 w-4" /> Plano Free — Faça upgrade para desbloquear tudo</>
          }
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a1175]" />
        </div>
      ) : (
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap:                 '24px',
            maxWidth:            '900px',
          }}
        >
          {/* ── Plano Free ── */}
          <PlanCard
            nome="Plano Free"
            preco="GRÁTIS"
            descricao="Ideal para testar o sistema e nossos benefícios antes de assinar!"
            features={FREE_FEATURES}
            variante="free"
            ctaLabel={isExpert ? 'Plano básico' : 'Plano atual'}
            ctaDisabled
          />

          {/* ── Plano Expert ── */}
          <PlanCard
            nome="Plano Expert"
            preco="R$ 99,99"
            descricao="A melhor opção pra quem quer total controle e automação!"
            features={EXPERT_FEATURES}
            variante="expert"
            ctaLabel={isExpert ? 'Plano atual' : 'Assinar Agora'}
            ctaOnClick={isExpert ? undefined : () => router.push('/checkout')}
            ctaDisabled={isExpert}
            destaque
          />
        </div>
      )}

      {/* Uso atual (plano free) */}
      {!loading && info && !isExpert && (
        <div
          style={{
            maxWidth:        '900px',
            border:          '1px solid #E8E8E8',
            borderRadius:    '10px',
            padding:         '16px 20px',
            backgroundColor: '#FAFAFA',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#262E3A', marginBottom: '12px' }}>
            Uso atual no Plano Free
          </p>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <UsoItem label="Licitações gerenciadas" atual={info.uso.gerenciadas} limite={3} />
            <UsoItem label="Documentos"             atual={info.uso.documentos}  limite={5} />
            <UsoItem label="CNPJs"                  atual={info.uso.empresas}    limite={1} />
          </div>
        </div>
      )}

      {/* Gerenciar assinatura (plano expert) */}
      {!loading && isExpert && info?.subscriptionId && (
        <div
          style={{
            maxWidth:        '900px',
            border:          '1px solid #FED7AA',
            borderRadius:    '10px',
            padding:         '16px 20px',
            backgroundColor: '#FFF7ED',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', marginBottom: '8px' }}>
            Gerenciar assinatura
          </p>
          <p style={{ fontSize: '12px', color: '#B45309', marginBottom: '12px' }}>
            ID da assinatura: <code style={{ fontFamily: 'monospace' }}>{info.subscriptionId}</code>
          </p>

          {actionError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '8px', padding: '8px 12px', marginBottom: '12px',
              fontSize: '13px', color: '#DC2626',
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              {actionError}
            </div>
          )}

          {cancelConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600 }}>
                Confirmar cancelamento? Você voltará ao plano Free.
              </span>
              <button
                onClick={handleCancelar}
                disabled={cancelling}
                style={{
                  padding: '6px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#DC2626', color: '#fff',
                  fontSize: '13px', fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {cancelling && <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />}
                {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
              <button
                onClick={() => { setCancelConfirm(false); setActionError(null); }}
                style={{
                  padding: '6px 16px', borderRadius: '8px',
                  border: '1px solid #D1D5DB', backgroundColor: '#fff',
                  fontSize: '13px', color: '#374151', cursor: 'pointer',
                }}
              >
                Voltar
              </button>
            </div>
          ) : (
            <button
              onClick={handleCancelar}
              style={{
                padding:         '6px 16px',
                borderRadius:    '8px',
                border:          '1px solid #D1D5DB',
                backgroundColor: '#fff',
                fontSize:        '13px',
                color:           '#374151',
                cursor:          'pointer',
                fontWeight:      600,
              }}
            >
              Cancelar assinatura
            </button>
          )}
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#9CA3AF', maxWidth: '900px' }}>
        Pagamentos processados com segurança pelo Mercado Pago.
        Todos os planos incluem acesso às licitações do governo federal em tempo real.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Componentes internos ──────────────────────────────────────────────────────

function PlanCard({
  nome, preco, descricao, features, variante, ctaLabel, ctaOnClick, ctaDisabled, destaque,
}: {
  nome: string;
  preco: string;
  descricao: string;
  features: { texto: string; ok: boolean }[];
  variante: 'free' | 'expert';
  ctaLabel: string;
  ctaOnClick?: () => void;
  ctaDisabled?: boolean;
  destaque?: boolean;
}) {
  const isExpert = variante === 'expert';
  return (
    <div
      style={{
        borderRadius:    '16px',
        padding:         '28px 24px',
        border:          isExpert ? '2px solid #E07028' : '1px solid #D1D5DB',
        backgroundColor: isExpert ? '#1A0A00' : '#1C1C1E',
        color:           '#fff',
        position:        'relative',
        display:         'flex',
        flexDirection:   'column',
        gap:             '20px',
      }}
    >
      {destaque && (
        <div
          style={{
            position:        'absolute',
            top:             '-13px',
            left:            '50%',
            transform:       'translateX(-50%)',
            backgroundColor: '#E07028',
            color:           '#fff',
            fontSize:        '11px',
            fontWeight:      700,
            padding:         '4px 14px',
            borderRadius:    '20px',
            whiteSpace:      'nowrap',
            letterSpacing:   '0.5px',
          }}
        >
          MAIS POPULAR
        </div>
      )}

      <div>
        <p style={{ fontSize: '14px', color: isExpert ? '#FCA46A' : '#9CA3AF', fontWeight: 600, marginBottom: '4px' }}>
          {nome}
        </p>
        <p style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.1, marginBottom: '4px' }}>
          {preco}
        </p>
        {isExpert && (
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>/mês</p>
        )}
        <p style={{ fontSize: '13px', color: isExpert ? '#F3C89A' : '#9CA3AF', lineHeight: 1.5 }}>
          {descricao}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div
              style={{
                width:           '20px',
                height:          '20px',
                borderRadius:    '50%',
                backgroundColor: f.ok ? (isExpert ? '#E07028' : '#374151') : 'transparent',
                border:          f.ok ? 'none' : '2px solid #4B5563',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                flexShrink:      0,
                marginTop:       '1px',
              }}
            >
              {f.ok
                ? <Check style={{ width: '11px', height: '11px', color: '#fff', strokeWidth: 3 }} />
                : <X     style={{ width: '11px', height: '11px', color: '#4B5563', strokeWidth: 3 }} />
              }
            </div>
            <span style={{ fontSize: '13px', color: f.ok ? '#E5E7EB' : '#6B7280', lineHeight: 1.5 }}>
              {f.texto}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={ctaOnClick}
        disabled={ctaDisabled}
        style={{
          width:           '100%',
          height:          '48px',
          borderRadius:    '10px',
          border:          'none',
          backgroundColor: ctaDisabled
            ? '#374151'
            : isExpert ? '#E07028' : '#374151',
          color:           ctaDisabled ? '#6B7280' : '#fff',
          fontSize:        '14px',
          fontWeight:      700,
          cursor:          ctaDisabled ? 'default' : 'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          gap:             '8px',
          transition:      'background-color 0.15s',
        }}
        onMouseEnter={e => {
          if (!ctaDisabled && isExpert) (e.currentTarget as HTMLElement).style.backgroundColor = '#C06020';
        }}
        onMouseLeave={e => {
          if (!ctaDisabled && isExpert) (e.currentTarget as HTMLElement).style.backgroundColor = '#E07028';
        }}
      >
        {ctaLabel}
        {!ctaDisabled && <span style={{ fontSize: '16px' }}>→</span>}
      </button>
    </div>
  );
}

function UsoItem({ label, atual, limite }: { label: string; atual: number; limite: number }) {
  const pct  = Math.min((atual / limite) * 100, 100);
  const over = atual >= limite;
  return (
    <div style={{ minWidth: '140px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#7B7B7B', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: over ? '#DC2626' : '#262E3A' }}>
          {atual}/{limite}
        </span>
      </div>
      <div style={{ height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            height:          '100%',
            width:           `${pct}%`,
            backgroundColor: over ? '#DC2626' : pct > 66 ? '#F59E0B' : '#0a1175',
            borderRadius:    '3px',
            transition:      'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}
