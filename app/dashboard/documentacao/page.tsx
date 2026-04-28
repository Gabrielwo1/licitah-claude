'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  Plus,
  Search,
  Link as LinkIcon,
  Check,
  X,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ShieldCheck,
  FileText,
  Upload,
} from 'lucide-react';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface Habilitacao {
  licitacoes_habilitacao_id: number;
  licitacoes_habilitacao_nome: string;
  licitacoes_habilitacao_documento: string;
  licitacoes_habilitacao_data_validade: string | null;
  licitacoes_habilitacao_licitacao_governo: string | null;
  licitacoes_habilitacao_data: string;
}

interface LicitacaoGerenciada {
  lg_id: number;
  lg_identificador: string;
  lg_objeto: string | null;
  lg_orgao: string | null;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function DocumentacaoPage() {
  const [docs, setDocs] = useState<Habilitacao[]>([]);
  const [gerenciadas, setGerenciadas] = useState<LicitacaoGerenciada[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Vincular modal
  const [vincularDoc, setVincularDoc] = useState<Habilitacao | null>(null);
  const [selectedLicitacao, setSelectedLicitacao] = useState('');
  const [vincularLoading, setVincularLoading] = useState(false);

  // Novo documento modal
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoValidade, setNovoValidade] = useState('');
  const [novoLoading, setNovoLoading] = useState(false);
  const [novoFile, setNovoFile] = useState<File | null>(null);
  const [novoFileError, setNovoFileError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function resetNovoModal() {
    setShowNovoModal(false);
    setNovoNome('');
    setNovoValidade('');
    setNovoFile(null);
    setNovoFileError('');
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSelectFile(file: File | null) {
    setNovoFileError('');
    if (!file) { setNovoFile(null); return; }

    // Type check (some browsers leave .doc/.docx mime empty — fall back to extension)
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const okByMime = ACCEPTED_MIME.includes(file.type);
    const okByExt  = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'].includes(ext);
    if (!okByMime && !okByExt) {
      setNovoFileError('Formato não suportado. Use PDF, DOC, DOCX, PNG ou JPG.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setNovoFileError(`Arquivo muito grande (${formatBytes(file.size)}). Máximo 10 MB.`);
      return;
    }

    setNovoFile(file);
    // Pre-fill name if empty, using filename without extension
    if (!novoNome.trim()) {
      const base = file.name.replace(/\.[^.]+$/, '');
      setNovoNome(base.slice(0, 200));
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [docsRes, gerenciadasRes] = await Promise.all([
        fetch('/api/habilitacoes?all=true'),
        fetch('/api/gerenciadas'),
      ]);
      const docsData = await docsRes.json();
      const gerenciadasData = await gerenciadasRes.json();
      setDocs(Array.isArray(docsData) ? docsData : []);
      setGerenciadas(Array.isArray(gerenciadasData.data) ? gerenciadasData.data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = docs.filter((d) =>
    d.licitacoes_habilitacao_nome.toLowerCase().includes(search.toLowerCase())
  );

  const total = docs.length;
  const validos = docs.filter((d) => !isExpired(d.licitacoes_habilitacao_data_validade)).length;
  const vencidos = docs.filter(
    (d) => d.licitacoes_habilitacao_data_validade && isExpired(d.licitacoes_habilitacao_data_validade)
  ).length;
  const vinculados = docs.filter(
    (d) => d.licitacoes_habilitacao_licitacao_governo && d.licitacoes_habilitacao_licitacao_governo !== ''
  ).length;

  async function handleVincular() {
    if (!vincularDoc || !selectedLicitacao) return;
    setVincularLoading(true);
    try {
      await fetch('/api/habilitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vincular: true,
          docId: vincularDoc.licitacoes_habilitacao_id,
          licitacaoGoverno: selectedLicitacao,
        }),
      });
      setVincularDoc(null);
      setSelectedLicitacao('');
      await loadData();
    } finally {
      setVincularLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir este documento?')) return;
    await fetch(`/api/habilitacoes/${id}`, { method: 'DELETE' });
    await loadData();
  }

  async function handleNovoDocumento() {
    if (!novoNome.trim()) return;
    setNovoLoading(true);
    try {
      let documento = '';
      if (novoFile) {
        try {
          documento = await fileToDataUrl(novoFile);
        } catch {
          setNovoFileError('Falha ao ler o arquivo. Tente novamente.');
          setNovoLoading(false);
          return;
        }
      }

      const res = await fetch('/api/habilitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome.trim(),
          documento,
          dataValidade: novoValidade || null,
          licitacaoGoverno: '',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNovoFileError(data.error || `Erro ao salvar (${res.status}).`);
        return;
      }

      resetNovoModal();
      await loadData();
    } finally {
      setNovoLoading(false);
    }
  }

  function getLicitacaoLabel(identificador: string | null) {
    if (!identificador) return null;
    const lic = gerenciadas.find((g) => g.lg_identificador === identificador);
    if (!lic) return identificador;
    return lic.lg_identificador + (lic.lg_orgao ? ` — ${lic.lg_orgao}` : '');
  }

  return (
    <div style={{ backgroundColor: '#F5F5F5', minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#7B7B7B',
            fontSize: '14px',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          <ChevronLeft size={16} />
          Voltar
        </Link>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#262E3A',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <FolderOpen size={26} color="#FF6600" />
              Documentação
            </h1>
            <p style={{ color: '#7B7B7B', fontSize: '14px', margin: '4px 0 0 0' }}>
              Todos os seus documentos cadastrados
            </p>
          </div>
          <button
            onClick={() => setShowNovoModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FF6600',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Novo documento
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {[
          { label: 'Total de documentos', value: total, color: '#262E3A', icon: <FolderOpen size={20} color="#FF6600" /> },
          { label: 'Válidos', value: validos, color: '#16a34a', icon: <Check size={20} color="#16a34a" /> },
          { label: 'Vencidos', value: vencidos, color: '#dc2626', icon: <X size={20} color="#dc2626" /> },
          { label: 'Vinculados a licitações', value: vinculados, color: '#2563eb', icon: <LinkIcon size={20} color="#2563eb" /> },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              border: '1px solid #E8E8E8',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#7B7B7B', fontWeight: 500 }}>{card.label}</span>
              {card.icon}
            </div>
            <span style={{ fontSize: '28px', fontWeight: 700, color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          border: '1px solid #E8E8E8',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <Search size={16} color="#7B7B7B" />
        <input
          type="text"
          placeholder="Pesquisar por nome do documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            color: '#262E3A',
            flex: 1,
            backgroundColor: 'transparent',
          }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #E8E8E8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#7B7B7B' }}>
            Carregando documentos...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#7B7B7B' }}>
            <FolderOpen size={40} color="#E8E8E8" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0 }}>Nenhum documento encontrado.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E8E8' }}>
                  {['Nome do arquivo', 'Validade', 'Status', 'Licitação vinculada', 'Ações'].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#7B7B7B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          backgroundColor: '#FAFAFA',
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, idx) => {
                  const expired = isExpired(doc.licitacoes_habilitacao_data_validade);
                  const hasLic =
                    doc.licitacoes_habilitacao_licitacao_governo &&
                    doc.licitacoes_habilitacao_licitacao_governo !== '';
                  return (
                    <tr
                      key={doc.licitacoes_habilitacao_id}
                      style={{
                        borderBottom: idx < filtered.length - 1 ? '1px solid #F0F0F0' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFA')
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
                      }
                    >
                      {/* Nome */}
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#262E3A', fontWeight: 500 }}>
                        <div className="flex items-center" style={{ gap: '8px' }}>
                          <ShieldCheck size={15} color="#FF6600" />
                          {doc.licitacoes_habilitacao_nome}
                        </div>
                      </td>
                      {/* Validade */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#7B7B7B' }}>
                        {formatDate(doc.licitacoes_habilitacao_data_validade)}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {doc.licitacoes_habilitacao_data_validade ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: expired ? '#fee2e2' : '#dcfce7',
                              color: expired ? '#dc2626' : '#16a34a',
                            }}
                          >
                            {expired ? <X size={11} /> : <Check size={11} />}
                            {expired ? 'Vencido' : 'Válido'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#7B7B7B' }}>—</span>
                        )}
                      </td>
                      {/* Licitação vinculada */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#7B7B7B', maxWidth: '200px' }}>
                        {hasLic ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#2563eb',
                              fontWeight: 500,
                            }}
                          >
                            <ExternalLink size={12} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px', display: 'inline-block' }}>
                              {getLicitacaoLabel(doc.licitacoes_habilitacao_licitacao_governo)}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: '#C0C0C0', fontStyle: 'italic', fontSize: '12px' }}>Não vinculado</span>
                        )}
                      </td>
                      {/* Ações */}
                      <td style={{ padding: '14px 16px' }}>
                        <div className="flex items-center" style={{ gap: '8px' }}>
                          {doc.licitacoes_habilitacao_documento && (
                            <button
                              onClick={() => {
                                const d = doc.licitacoes_habilitacao_documento;
                                if (d.startsWith('data:')) {
                                  const w = window.open('', '_blank');
                                  if (w) { w.document.write(`<iframe src="${d}" width="100%" height="100%" style="border:none"></iframe>`); }
                                } else {
                                  window.open(d, '_blank');
                                }
                              }}
                              title="Abrir documento"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: '#F0F9F4', color: '#259F46', border: 'none', cursor: 'pointer' }}
                            >
                              <ExternalLink size={12} />
                              Abrir
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setVincularDoc(doc);
                              setSelectedLicitacao('');
                            }}
                            title="Vincular a licitação"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: '#EEF2FF',
                              color: '#2563eb',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <LinkIcon size={12} />
                            Vincular
                          </button>
                          <button
                            onClick={() => handleDelete(doc.licitacoes_habilitacao_id)}
                            title="Excluir"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '5px',
                              borderRadius: '6px',
                              backgroundColor: '#FEF2F2',
                              color: '#dc2626',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vincular Modal */}
      {vincularDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setVincularDoc(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#262E3A', margin: 0 }}>
                Vincular documento
              </h2>
              <button
                onClick={() => setVincularDoc(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#7B7B7B', marginBottom: '20px' }}>
              Vinculando: <strong style={{ color: '#262E3A' }}>{vincularDoc.licitacoes_habilitacao_nome}</strong>
            </p>

            <label style={{ fontSize: '13px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '6px' }}>
              Selecionar licitação
            </label>
            <select
              value={selectedLicitacao}
              onChange={(e) => setSelectedLicitacao(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E8E8E8',
                fontSize: '14px',
                color: '#262E3A',
                backgroundColor: '#fff',
                marginBottom: '20px',
                outline: 'none',
              }}
            >
              <option value="">Selecione uma licitação...</option>
              {gerenciadas.map((g) => (
                <option key={g.lg_id} value={g.lg_identificador}>
                  {g.lg_identificador}
                  {g.lg_orgao ? ` — ${g.lg_orgao}` : ''}
                </option>
              ))}
            </select>

            <div className="flex" style={{ gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setVincularDoc(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #E8E8E8',
                  backgroundColor: '#fff',
                  color: '#7B7B7B',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleVincular}
                disabled={!selectedLicitacao || vincularLoading}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedLicitacao ? '#FF6600' : '#E8E8E8',
                  color: selectedLicitacao ? '#fff' : '#7B7B7B',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: selectedLicitacao ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LinkIcon size={14} />
                {vincularLoading ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Novo Documento Modal */}
      {showNovoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) resetNovoModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#262E3A', margin: 0 }}>
                Novo documento
              </h2>
              <button
                onClick={resetNovoModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B7B7B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '6px' }}>
                Nome do documento *
              </label>
              <input
                type="text"
                placeholder="Ex: Certidão Negativa Federal"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E8E8E8',
                  fontSize: '14px',
                  color: '#262E3A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#262E3A', display: 'block', marginBottom: '6px' }}>
                Data de validade
              </label>
              <input
                type="date"
                value={novoValidade}
                onChange={(e) => setNovoValidade(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E8E8E8',
                  fontSize: '14px',
                  color: '#262E3A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
              onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />

            {/* Dropzone or file preview */}
            {!novoFile ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleSelectFile(f);
                }}
                style={{
                  border: `2px dashed ${dragOver ? '#FF6600' : '#E8E8E8'}`,
                  borderRadius: '10px',
                  padding: '24px',
                  textAlign: 'center',
                  color: dragOver ? '#FF6600' : '#7B7B7B',
                  fontSize: '13px',
                  marginBottom: novoFileError ? '8px' : '24px',
                  backgroundColor: dragOver ? '#FFF7F0' : '#FAFAFA',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  outline: 'none',
                }}
              >
                <Upload size={28} color={dragOver ? '#FF6600' : '#C0C0C0'} style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Arraste um arquivo aqui ou clique para selecionar</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#C0C0C0' }}>
                  PDF, DOC, DOCX, PNG, JPG — máx. 10 MB
                </p>
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid #E8E8E8',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: novoFileError ? '8px' : '24px',
                  backgroundColor: '#F9FAFB',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
                    backgroundColor: '#FFF1E6', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <FileText size={20} color="#FF6600" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px', fontWeight: 600, color: '#262E3A',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                    title={novoFile.name}
                  >
                    {novoFile.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#7B7B7B', marginTop: '2px' }}>
                    {formatBytes(novoFile.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNovoFile(null);
                    setNovoFileError('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  title="Remover arquivo"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px', borderRadius: '6px', color: '#7B7B7B',
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FEE2E2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#7B7B7B'; }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* File error */}
            {novoFileError && (
              <div
                style={{
                  fontSize: '12.5px', color: '#dc2626', marginBottom: '20px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <X size={13} /> {novoFileError}
              </div>
            )}

            <div className="flex" style={{ gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={resetNovoModal}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #E8E8E8',
                  backgroundColor: '#fff',
                  color: '#7B7B7B',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleNovoDocumento}
                disabled={!novoNome.trim() || novoLoading}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: novoNome.trim() ? '#FF6600' : '#E8E8E8',
                  color: novoNome.trim() ? '#fff' : '#7B7B7B',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: novoNome.trim() ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} />
                {novoLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
