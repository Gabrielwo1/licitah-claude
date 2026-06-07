'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bot, Plus, X, Settings, StopCircle, Activity, CheckCircle2, XCircle, Clock, Gavel, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type Estrategia = 'agressiva' | 'moderada' | 'conservadora';
type Status = 'aguardando' | 'conectando' | 'aguardando_disputa' | 'em_disputa' | 'vencemos' | 'perdemos' | 'erro' | 'cancelado';

interface Sessao {
  id: number;
  uasg: string;
  numero_pregao: string;
  item_numero: string | null;
  objeto: string | null;
  preco_minimo: number;
  estrategia: Estrategia;
  status: Status;
  melhor_lance: number | null;
  lance_vencedor: number | null;
  posicao_atual: number | null;
  iniciado_em: string;
  encerrado_em: string | null;
  lances: Lance[] | null;
}

interface Lance {
  id: number;
  valor: number;
  tipo: string;
  criado_em: string;
  contexto: any;
}

interface Config {
  cgov_cpf: string | null;
  cgov_cnpj: string | null;
  cgov_senha_set: boolean;
  estrategia: Estrategia;
  decremento_valor: number | null;
  decremento_pct: number | null;
}

const STATUS_LABEL: Record<Status, string> = {
  aguardando:         'Aguardando',
  conectando:         'Conectando',
  aguardando_disputa: 'Aguard. Disputa',
  em_disputa:         'EM DISPUTA',
  vencemos:           'Vencemos!',
  perdemos:           'Perdemos',
  erro:               'Erro',
  cancelado:          'Cancelado',
};

const STATUS_STYLE: Record<Status, React.CSSProperties> = {
  aguardando:         { backgroundColor: '#FFF3CD', color: '#856404' },
  conectando:         { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  aguardando_disputa: { backgroundColor: '#E0F2FE', color: '#0369A1' },
  em_disputa:         { backgroundColor: '#FF6600', color: '#fff' },
  vencemos:           { backgroundColor: '#D1FAE5', color: '#065F46' },
  perdemos:           { backgroundColor: '#FEE2E2', color: '#991B1B' },
  erro:               { backgroundColor: '#FEF3C7', color: '#92400E' },
  cancelado:          { backgroundColor: '#F3F4F6', color: '#6B7280' },
};

const emptyForm = {
  uasg: '', numero_pregao: '', item_numero: '', objeto: '',
  preco_minimo: '', estrategia: 'moderada' as Estrategia,
  decremento_valor: '', decremento_pct: '',
};

function fmt(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ── Config modal ─────────────────────────────────────────────────────────────

function ConfigModal({ config, onClose, onSaved }: { config: Config | null; onClose: () => void; onSaved: () => void }) {
  const [cpf, setCpf]           = useState(config?.cgov_cpf || '');
  const [senha, setSenha]       = useState('');
  const [cnpj, setCnpj]         = useState(config?.cgov_cnpj || '');
  const [est, setEst]           = useState<Estrategia>(config?.estrategia || 'moderada');
  const [decrVal, setDecrVal]   = useState(config?.decremento_valor ? String(config.decremento_valor) : '');
  const [decrPct, setDecrPct]   = useState(config?.decremento_pct ? String(config.decremento_pct) : '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function save() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/robo/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cgov_cpf: cpf, cgov_senha: senha || undefined, cgov_cnpj: cnpj, estrategia: est, decremento_valor: decrVal || null, decremento_pct: decrPct || null }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erro'); return; }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#262E3A' }}>Configuração do Robô</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>}

        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Credenciais Compras.gov</p>
          <p className="text-xs text-gray-400">Armazenadas criptografadas (AES-256). Nunca exibidas.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">CPF</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">CNPJ da empresa</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="00.000.000/0001-00" value={cnpj} onChange={e => setCnpj(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Senha Compras.gov {config?.cgov_senha_set && <span className="text-xs text-green-600">(já configurada — deixe em branco para manter)</span>}
          </label>
          <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
            placeholder="Nova senha (opcional)" value={senha} onChange={e => setSenha(e.target.value)} />
        </div>

        <div className="space-y-1 pt-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estratégia padrão</p>
        </div>
        <div className="space-y-1.5">
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
            value={est} onChange={e => setEst(e.target.value as Estrategia)}>
            <option value="agressiva">Agressiva — sempre 1 centavo abaixo do menor lance</option>
            <option value="moderada">Moderada — lance quando ultrapassar margem configurada</option>
            <option value="conservadora">Conservadora — lance apenas nos últimos 2 minutos</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Decremento fixo (R$)</label>
            <input type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="Ex: 0,50" value={decrVal} onChange={e => setDecrVal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Decremento percentual (%)</label>
            <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="Ex: 0,5" value={decrPct} onChange={e => setDecrPct(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50" style={{ color: '#262E3A' }}>Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#0a1175' }}>
            {saving ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Nova sessão modal ─────────────────────────────────────────────────────────

function NovaSessaoModal({ config, onClose, onSaved }: { config: Config | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm]     = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const f = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    setSaving(true); setError('');
    if (!form.uasg || !form.numero_pregao || !form.preco_minimo) {
      setError('UASG, número do pregão e preço mínimo são obrigatórios.'); setSaving(false); return;
    }
    try {
      const res = await fetch('/api/robo/sessoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erro'); return; }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#262E3A' }}>Iniciar Sessão do Robô</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>}
        {!config?.cgov_senha_set && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-4 py-3 text-sm">
            Configure as credenciais do Compras.gov antes de iniciar uma sessão.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">UASG</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="Ex: 158140" value={form.uasg} onChange={f('uasg')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Número do Pregão</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="Ex: 00023/2024" value={form.numero_pregao} onChange={f('numero_pregao')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Item (opcional)</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="Ex: 1" value={form.item_numero} onChange={f('item_numero')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Preço Mínimo (R$) *</label>
            <input type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="0,00" value={form.preco_minimo} onChange={f('preco_minimo')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Objeto (opcional)</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
            placeholder="Descrição do item" value={form.objeto} onChange={f('objeto')} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Estratégia</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
            value={form.estrategia} onChange={e => setForm(p => ({ ...p, estrategia: e.target.value as Estrategia }))}>
            <option value="agressiva">Agressiva</option>
            <option value="moderada">Moderada</option>
            <option value="conservadora">Conservadora</option>
          </select>
        </div>
        {(form.estrategia === 'moderada' || form.estrategia === 'conservadora') && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Decremento fixo (R$)</label>
              <input type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
                placeholder="Ex: 0,50" value={form.decremento_valor} onChange={f('decremento_valor')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Decremento % (alternativo)</label>
              <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
                placeholder="Ex: 0,5" value={form.decremento_pct} onChange={f('decremento_pct')} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50" style={{ color: '#262E3A' }}>Cancelar</button>
          <button onClick={save} disabled={saving || !config?.cgov_senha_set}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#FF6600' }}>
            {saving ? 'Iniciando...' : '🤖 Iniciar Robô'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session card ─────────────────────────────────────────────────────────────

function SessaoCard({ s, onCancel }: { s: Sessao; onCancel: (id: number) => void }) {
  const [expanded, setExpanded] = useState(s.status === 'em_disputa');
  const ativo = ['aguardando', 'conectando', 'aguardando_disputa', 'em_disputa'].includes(s.status);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E5E5', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={STATUS_STYLE[s.status]}>
                {STATUS_LABEL[s.status]}
              </span>
              {ativo && <span className="flex items-center gap-1 text-xs text-green-600"><Activity className="h-3 w-3 animate-pulse" />Ao vivo</span>}
            </div>
            <p className="font-semibold text-sm" style={{ color: '#262E3A' }}>
              UASG {s.uasg} — Pregão {s.numero_pregao}
              {s.item_numero && ` · Item ${s.item_numero}`}
            </p>
            {s.objeto && <p className="text-xs text-gray-500 mt-0.5 truncate">{s.objeto}</p>}
            <p className="text-xs text-gray-400 mt-1">{fmt(s.iniciado_em)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500">Preço mínimo</p>
            <p className="font-bold text-sm" style={{ color: '#0a1175' }}>{formatCurrency(s.preco_minimo)}</p>
            {s.melhor_lance && (
              <>
                <p className="text-xs text-gray-500 mt-1">Nosso melhor</p>
                <p className="font-bold text-sm text-green-700">{formatCurrency(s.melhor_lance)}</p>
              </>
            )}
            {s.posicao_atual && (
              <p className="text-xs font-semibold mt-1" style={{ color: s.posicao_atual === 1 ? '#065F46' : '#856404' }}>
                {s.posicao_atual}º lugar
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          {ativo && (
            <button onClick={() => onCancel(s.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#FF4500' }}>
              <StopCircle className="h-3.5 w-3.5" />
              Parar robô
            </button>
          )}
          {(s.lances?.length ?? 0) > 0 && (
            <button onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {s.lances!.length} lance{s.lances!.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {expanded && s.lances && s.lances.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-1.5" style={{ backgroundColor: '#FAFAFA' }}>
          {s.lances.slice(0, 10).map(l => (
            <div key={l.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{fmt(l.criado_em)} · <span className="text-gray-400">{l.tipo}</span></span>
              <span className="font-semibold" style={{ color: '#0a1175' }}>{formatCurrency(l.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_SESSOES: Sessao[] = [
  {
    id: 99,
    uasg: '158140',
    numero_pregao: '00042/2024',
    item_numero: '3',
    objeto: 'Aquisição de Notebook Dell Latitude 5540 — 20 unidades',
    preco_minimo: 3800.00,
    estrategia: 'moderada',
    status: 'em_disputa',
    melhor_lance: 4120.00,
    lance_vencedor: null,
    posicao_atual: 1,
    iniciado_em: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    encerrado_em: null,
    lances: [
      { id: 5, valor: 4120.00, tipo: 'automatico', criado_em: new Date(Date.now() - 2 * 60 * 1000).toISOString(),  contexto: {} },
      { id: 4, valor: 4250.00, tipo: 'automatico', criado_em: new Date(Date.now() - 6 * 60 * 1000).toISOString(),  contexto: {} },
      { id: 3, valor: 4390.00, tipo: 'automatico', criado_em: new Date(Date.now() - 10 * 60 * 1000).toISOString(), contexto: {} },
      { id: 2, valor: 4520.00, tipo: 'automatico', criado_em: new Date(Date.now() - 14 * 60 * 1000).toISOString(), contexto: {} },
      { id: 1, valor: 4680.00, tipo: 'automatico', criado_em: new Date(Date.now() - 18 * 60 * 1000).toISOString(), contexto: {} },
    ],
  },
  {
    id: 98,
    uasg: '090019',
    numero_pregao: '00015/2024',
    item_numero: '1',
    objeto: 'Serviços de Limpeza e Conservação — Contrato anual',
    preco_minimo: 28000.00,
    estrategia: 'conservadora',
    status: 'aguardando_disputa',
    melhor_lance: null,
    lance_vencedor: null,
    posicao_atual: null,
    iniciado_em: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    encerrado_em: null,
    lances: [],
  },
  {
    id: 97,
    uasg: '250005',
    numero_pregao: '00008/2024',
    item_numero: '2',
    objeto: 'Fornecimento de Material de Escritório — Papel A4 e Canetas',
    preco_minimo: 1200.00,
    estrategia: 'agressiva',
    status: 'vencemos',
    melhor_lance: 1185.00,
    lance_vencedor: 1185.00,
    posicao_atual: 1,
    iniciado_em: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    encerrado_em: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lances: [
      { id: 9, valor: 1185.00, tipo: 'automatico', criado_em: new Date(Date.now() - 32 * 60 * 1000).toISOString(), contexto: {} },
      { id: 8, valor: 1200.00, tipo: 'automatico', criado_em: new Date(Date.now() - 45 * 60 * 1000).toISOString(), contexto: {} },
      { id: 7, valor: 1250.00, tipo: 'automatico', criado_em: new Date(Date.now() - 60 * 60 * 1000).toISOString(), contexto: {} },
    ],
  },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoboPage() {
  const [sessoes, setSessoes]       = useState<Sessao[]>([]);
  const [config, setConfig]         = useState<Config | null>(null);
  const [loading, setLoading]       = useState(true);
  const [configModal, setConfigModal] = useState(false);
  const [novaModal, setNovaModal]   = useState(false);
  const [filtro, setFiltro]         = useState<'ativas' | 'todas'>('ativas');

  const load = useCallback(async () => {
    const [rs, rc] = await Promise.all([fetch('/api/robo/sessoes'), fetch('/api/robo/config')]);
    if (rs.ok) { const j = await rs.json(); setSessoes(j.data || []); }
    if (rc.ok) { const j = await rc.json(); setConfig(j.data); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 8s while there are active sessions
  useEffect(() => {
    const ativas = sessoes.filter(s => ['aguardando','conectando','aguardando_disputa','em_disputa'].includes(s.status));
    if (ativas.length === 0) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [sessoes, load]);

  async function cancelarSessao(id: number) {
    if (!confirm('Parar o robô para esta sessão?')) return;
    await fetch(`/api/robo/sessoes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelado' }),
    });
    load();
  }

  const isDemo   = !loading && sessoes.length === 0;
  const baseSessoes = isDemo ? DEMO_SESSOES : sessoes;
  const ativas   = baseSessoes.filter(s => ['aguardando','conectando','aguardando_disputa','em_disputa'].includes(s.status));
  const vencidas = baseSessoes.filter(s => s.status === 'vencemos');
  const perdidas = baseSessoes.filter(s => s.status === 'perdemos');
  const taxa     = (vencidas.length + perdidas.length) > 0 ? Math.round(vencidas.length / (vencidas.length + perdidas.length) * 100) : 0;

  const exibidas = filtro === 'ativas' ? sessoes.filter(s => ['aguardando','conectando','aguardando_disputa','em_disputa'].includes(s.status)) : sessoes;


  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6" style={{ color: '#FF6600' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#262E3A' }}>Robô de Lances</h1>
          {ativas.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white animate-pulse" style={{ backgroundColor: '#FF6600' }}>
              <Activity className="h-3 w-3" />{ativas.length} ativo{ativas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setConfigModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: '#262E3A' }}>
            <Settings className="h-4 w-4" />
            Configurar
          </button>
          <button onClick={() => setNovaModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#FF6600' }}>
            <Plus className="h-4 w-4" />
            Nova Sessão
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Sessões Ativas', value: ativas.length, icon: Activity, color: '#FF6600' },
          { label: 'Vencemos',       value: vencidas.length, icon: CheckCircle2, color: '#065F46' },
          { label: 'Perdemos',       value: perdidas.length, icon: XCircle,     color: '#991B1B' },
          { label: 'Taxa de Vitória', value: `${taxa}%`, icon: Gavel, color: '#0a1175' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E5E5E5', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
              <span style={{ fontSize: '11px', color: '#7B7B7B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
            </div>
            <p style={{ fontSize: '26px', fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Config warning */}
      {!config?.cgov_senha_set && (
        <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF3CD', border: '1px solid #FDE68A' }}>
          <Settings className="h-4 w-4 shrink-0" style={{ color: '#856404' }} />
          <p className="text-sm" style={{ color: '#856404' }}>
            Configure suas credenciais do Compras.gov para ativar o robô.{' '}
            <button onClick={() => setConfigModal(true)} className="font-semibold underline">Configurar agora</button>
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[{ k: 'ativas', l: `Ativas (${ativas.length})` }, { k: 'todas', l: `Todas (${sessoes.length})` }].map(f => (
          <button key={f.k} onClick={() => setFiltro(f.k as any)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={filtro === f.k ? { backgroundColor: '#0a1175', color: '#fff' } : { backgroundColor: '#f1f1fc', color: '#262E3A' }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Sessions */}
      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : exibidas.length === 0 && sessoes.length === 0 ? (
        <>
          {/* Demo banner */}
          <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <Bot className="h-4 w-4 shrink-0" style={{ color: '#1D4ED8' }} />
            <p className="text-sm" style={{ color: '#1E40AF' }}>
              <span className="font-bold">Prévia demonstrativa</span> — veja abaixo como ficará o painel quando o robô estiver disputando pregões reais.
            </p>
          </div>
          <div className="space-y-3 opacity-75 pointer-events-none select-none">
            {DEMO_SESSOES.map(s => <SessaoCard key={s.id} s={s} onCancel={() => {}} />)}
          </div>
        </>
      ) : exibidas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Nenhuma sessão ativa no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exibidas.map(s => <SessaoCard key={s.id} s={s} onCancel={cancelarSessao} />)}
        </div>
      )}

      {configModal && <ConfigModal config={config} onClose={() => setConfigModal(false)} onSaved={() => { setConfigModal(false); load(); }} />}
      {novaModal && <NovaSessaoModal config={config} onClose={() => setNovaModal(false)} onSaved={() => { setNovaModal(false); load(); }} />}
    </div>
  );
}
