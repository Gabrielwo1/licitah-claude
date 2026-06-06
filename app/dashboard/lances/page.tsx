'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Gavel, Plus, X, TrendingUp, Clock, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type Resultado = 'aguardando' | 'venceu' | 'perdeu' | 'desclassificado' | 'cancelado';

interface Lance {
  lance_id: number;
  lance_licitacao: string;
  lance_objeto: string | null;
  lance_orgao: string | null;
  lance_valor: number;
  lance_observacao: string | null;
  lance_resultado: Resultado;
  lance_data: string;
}

interface Gerenciada {
  lg_id: number;
  lg_identificador: string;
  lg_objeto: string | null;
  lg_orgao: string | null;
}

const RESULTADO_LABELS: Record<Resultado, string> = {
  aguardando:      'Aguardando',
  venceu:          'Venceu',
  perdeu:          'Perdeu',
  desclassificado: 'Desclassificado',
  cancelado:       'Cancelado',
};

const RESULTADO_STYLE: Record<Resultado, React.CSSProperties> = {
  aguardando:      { backgroundColor: '#FFF3CD', color: '#856404' },
  venceu:          { backgroundColor: '#D1FAE5', color: '#065F46' },
  perdeu:          { backgroundColor: '#FEE2E2', color: '#991B1B' },
  desclassificado: { backgroundColor: '#F3F4F6', color: '#374151' },
  cancelado:       { backgroundColor: '#F3F4F6', color: '#6B7280' },
};

const FILTROS: { key: Resultado | 'todos'; label: string }[] = [
  { key: 'todos',           label: 'Todos' },
  { key: 'aguardando',      label: 'Aguardando' },
  { key: 'venceu',          label: 'Venceu' },
  { key: 'perdeu',          label: 'Perdeu' },
  { key: 'desclassificado', label: 'Desclassificado' },
  { key: 'cancelado',       label: 'Cancelado' },
];

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  editando: Lance | null;
  gerenciadas: Gerenciada[];
  initialLicitacao?: string;
  initialObjeto?: string;
  initialOrgao?: string;
  onClose: () => void;
  onSaved: () => void;
}

function LanceModal({ editando, gerenciadas, initialLicitacao, initialObjeto, initialOrgao, onClose, onSaved }: ModalProps) {
  const [licitacao,  setLicitacao]  = useState(editando?.lance_licitacao  || initialLicitacao || '');
  const [objeto,     setObjeto]     = useState(editando?.lance_objeto      || initialObjeto    || '');
  const [orgao,      setOrgao]      = useState(editando?.lance_orgao       || initialOrgao     || '');
  const [valor,      setValor]      = useState(editando ? String(editando.lance_valor) : '');
  const [observacao, setObservacao] = useState(editando?.lance_observacao  || '');
  const [resultado,  setResultado]  = useState<Resultado>(editando?.lance_resultado || 'aguardando');
  const [selectVal,  setSelectVal]  = useState(() => {
    if (editando) return '';
    if (initialLicitacao) return initialLicitacao;
    return '';
  });
  const [manualMode, setManualMode] = useState(!initialLicitacao && gerenciadas.length === 0);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function handleSelectChange(val: string) {
    setSelectVal(val);
    if (val === '_manual') {
      setManualMode(true);
      setLicitacao('');
      setObjeto('');
      setOrgao('');
    } else {
      setManualMode(false);
      const g = gerenciadas.find(x => x.lg_identificador === val);
      setLicitacao(val);
      setObjeto(g?.lg_objeto || '');
      setOrgao(g?.lg_orgao   || '');
    }
  }

  async function handleSave() {
    setError('');
    const licitacaoFinal = licitacao.trim();
    if (!licitacaoFinal) { setError('Número de controle PNCP obrigatório.'); return; }
    if (!valor.trim())   { setError('Valor ofertado obrigatório.');           return; }

    setSaving(true);
    try {
      let res: Response;
      if (editando) {
        res = await fetch(`/api/lances/${editando.lance_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor, resultado, observacao }),
        });
      } else {
        res = await fetch('/api/lances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licitacao: licitacaoFinal, objeto, orgao, valor, observacao, resultado }),
        });
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Erro ao salvar.');
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#262E3A' }}>
            {editando ? 'Editar Lance' : 'Registrar Lance'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>
        )}

        {/* Licitação — só editável ao criar */}
        {editando ? (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">Licitação</p>
            <p className="text-sm font-medium text-gray-800 truncate">
              {editando.lance_objeto || editando.lance_licitacao}
            </p>
          </div>
        ) : (
          <>
            {gerenciadas.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Licitação</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
                  value={selectVal}
                  onChange={e => handleSelectChange(e.target.value)}
                >
                  <option value="">Selecionar licitação gerenciada...</option>
                  {gerenciadas.map(g => (
                    <option key={g.lg_id} value={g.lg_identificador}>
                      {(g.lg_objeto || g.lg_identificador).substring(0, 70)}
                    </option>
                  ))}
                  <option value="_manual">Outra (inserir número de controle)</option>
                </select>
              </div>
            )}

            {(manualMode || gerenciadas.length === 0) && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Número de Controle PNCP</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
                  placeholder="Ex: 00000000000000-1-000001/2024"
                  value={licitacao}
                  onChange={e => setLicitacao(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Objeto</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
                    placeholder="Descrição resumida"
                    value={objeto}
                    onChange={e => setObjeto(e.target.value)}
                  />
                </div>
              </div>
            )}

            {licitacao && !manualMode && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Objeto</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
                  value={objeto}
                  onChange={e => setObjeto(e.target.value)}
                  placeholder="Descrição do objeto"
                />
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Valor Ofertado (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              placeholder="0,00"
              value={valor}
              onChange={e => setValor(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Resultado</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30"
              value={resultado}
              onChange={e => setResultado(e.target.value as Resultado)}
            >
              <option value="aguardando">Aguardando</option>
              <option value="venceu">Venceu</option>
              <option value="perdeu">Perdeu</option>
              <option value="desclassificado">Desclassificado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Observação (opcional)</label>
          <textarea
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1175]/30 resize-none"
            placeholder="Notas sobre este lance..."
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: '#262E3A' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#0a1175' }}
          >
            {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Registrar Lance'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page (needs Suspense for useSearchParams) ───────────────────────────

function LancesContent() {
  const [lances, setLances]           = useState<Lance[]>([]);
  const [gerenciadas, setGerenciadas] = useState<Gerenciada[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filtro, setFiltro]           = useState<Resultado | 'todos'>('todos');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editando, setEditando]       = useState<Lance | null>(null);
  const [preenchido, setPreenchido]   = useState<{ licitacao: string; objeto: string; orgao: string } | null>(null);
  const searchParams                  = useSearchParams();
  const autoOpenDone                  = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [resL, resG] = await Promise.all([
      fetch('/api/lances'),
      fetch('/api/gerenciadas'),
    ]);
    if (resL.ok) { const j = await resL.json(); setLances(j.data || []); }
    if (resG.ok) { const j = await resG.json(); setGerenciadas(j.data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (autoOpenDone.current) return;
    const licitacao = searchParams.get('licitacao');
    if (!licitacao) return;
    autoOpenDone.current = true;
    setPreenchido({
      licitacao,
      objeto: searchParams.get('objeto') || '',
      orgao:  searchParams.get('orgao')  || '',
    });
    setEditando(null);
    setModalOpen(true);
  }, [searchParams]);

  function openNovoModal() {
    setPreenchido(null);
    setEditando(null);
    setModalOpen(true);
  }

  function openEditModal(lance: Lance) {
    setPreenchido(null);
    setEditando(lance);
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    if (!confirm('Remover este lance?')) return;
    await fetch(`/api/lances/${id}`, { method: 'DELETE' });
    setLances(prev => prev.filter(l => l.lance_id !== id));
  }

  const filtrados  = filtro === 'todos' ? lances : lances.filter(l => l.lance_resultado === filtro);
  const total      = lances.length;
  const vencidos   = lances.filter(l => l.lance_resultado === 'venceu').length;
  const aguardando = lances.filter(l => l.lance_resultado === 'aguardando').length;
  const taxa       = (vencidos + lances.filter(l => l.lance_resultado === 'perdeu').length) > 0
    ? Math.round((vencidos / (vencidos + lances.filter(l => l.lance_resultado === 'perdeu').length)) * 100)
    : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '960px' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Gavel className="h-6 w-6" style={{ color: '#FF6600' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#262E3A' }}>Lances</h1>
        </div>
        <button
          onClick={openNovoModal}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#0a1175' }}
        >
          <Plus className="h-4 w-4" />
          Registrar Lance
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Lances', value: total,      icon: Gavel,         color: '#0a1175' },
          { label: 'Aguardando',      value: aguardando, icon: Clock,         color: '#856404' },
          { label: 'Vencidos',        value: vencidos,   icon: CheckCircle2,  color: '#065F46' },
          { label: 'Taxa de Sucesso', value: `${taxa}%`, icon: TrendingUp,    color: '#FF6600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E5E5E5', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
              <span style={{ fontSize: '11px', color: '#7B7B7B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {s.label}
              </span>
            </div>
            <p style={{ fontSize: '26px', fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={filtro === f.key ? { backgroundColor: '#0a1175', color: '#fff' } : { backgroundColor: '#f1f1fc', color: '#262E3A' }}
          >
            {f.label}
            {f.key !== 'todos' && (
              <span className="ml-1.5 opacity-70">{lances.filter(l => l.lance_resultado === f.key).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: '#7B7B7B', fontSize: '14px' }}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#7B7B7B' }}>
          <Gavel className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">{total === 0 ? 'Nenhum lance registrado ainda.' : 'Nenhum lance com este filtro.'}</p>
          {total === 0 && (
            <button onClick={openNovoModal} className="mt-4 text-sm font-semibold underline" style={{ color: '#0a1175' }}>
              Registrar o primeiro lance
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(lance => (
            <div key={lance.lance_id} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E5E5E5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={RESULTADO_STYLE[lance.lance_resultado]}>
                      {RESULTADO_LABELS[lance.lance_resultado]}
                    </span>
                    <span style={{ fontSize: '11px', color: '#7B7B7B' }}>{formatDate(lance.lance_data)}</span>
                  </div>
                  <p className="font-semibold truncate" style={{ fontSize: '14px', color: '#262E3A' }} title={lance.lance_objeto || lance.lance_licitacao}>
                    {lance.lance_objeto || lance.lance_licitacao}
                  </p>
                  {lance.lance_orgao && (
                    <p style={{ fontSize: '12px', color: '#7B7B7B', marginTop: '2px' }}>{lance.lance_orgao}</p>
                  )}
                  {lance.lance_observacao && (
                    <p style={{ fontSize: '12px', color: '#7B7B7B', marginTop: '4px', fontStyle: 'italic' }}>{lance.lance_observacao}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#0a1175' }}>{formatCurrency(lance.lance_valor)}</span>
                  <button onClick={() => openEditModal(lance)} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Editar">
                    <Pencil className="h-4 w-4" style={{ color: '#7B7B7B' }} />
                  </button>
                  <button onClick={() => handleDelete(lance.lance_id)} className="p-1.5 rounded hover:bg-red-50 transition-colors" title="Excluir">
                    <Trash2 className="h-4 w-4" style={{ color: '#FF4500' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <LanceModal
          editando={editando}
          gerenciadas={gerenciadas}
          initialLicitacao={preenchido?.licitacao}
          initialObjeto={preenchido?.objeto}
          initialOrgao={preenchido?.orgao}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

export default function LancesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Carregando...</div>}>
      <LancesContent />
    </Suspense>
  );
}
