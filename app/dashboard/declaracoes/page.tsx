'use client';

import { useState, useRef } from 'react';
import { FileText, Download, ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'date';
  width?: 'full' | 'half' | 'third';
}

interface Modelo {
  id: string;
  titulo: string;
  fields: Field[];
  render: (v: Record<string, string>) => React.ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function blank(v: string | undefined, fallback = '___________') {
  return v && v.trim() ? v : fallback;
}

// ─── Modelos ─────────────────────────────────────────────────────────────────

const MODELOS: Modelo[] = [
  {
    id: 'credenciamento',
    titulo: 'Carta de Credenciamento',
    fields: [
      { key: 'empresa', label: 'Razão Social da Empresa', width: 'full' },
      { key: 'cnpj', label: 'CNPJ', width: 'half' },
      { key: 'licitacao', label: 'Nº do Processo / Licitação', width: 'half' },
      { key: 'orgaoLicitante', label: 'Órgão Licitante', width: 'full' },
      { key: 'representante', label: 'Representante Legal (nome)', width: 'full' },
      { key: 'rg1', label: 'RG do Representante', width: 'third' },
      { key: 'orgao1', label: 'Órgão Expedidor', width: 'third' },
      { key: 'cpf1', label: 'CPF do Representante', width: 'third' },
      { key: 'procurador', label: 'Nome do Credenciado / Procurador', width: 'full' },
      { key: 'rg2', label: 'RG do Credenciado', width: 'third' },
      { key: 'orgao2', label: 'Órgão Expedidor', width: 'third' },
      { key: 'cpf2', label: 'CPF do Credenciado', width: 'third' },
      { key: 'cidade', label: 'Cidade', width: 'half' },
      { key: 'data', label: 'Data', type: 'date', width: 'half' },
    ],
    render: (v) => (
      <div>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '20px', textTransform: 'uppercase' }}>Carta de Credenciamento</p>
        <p style={{ marginBottom: '16px', textAlign: 'justify', lineHeight: '1.8' }}>
          A empresa <b>{blank(v.empresa)}</b>, inscrita no CNPJ sob nº <b>{blank(v.cnpj)}</b>, por intermédio de seu representante legal, Sr(a). <b>{blank(v.representante)}</b>, portador da Carteira de Identidade nº <b>{blank(v.rg1)}</b>, Órgão Expedidor <b>{blank(v.orgao1)}</b> e do CPF nº <b>{blank(v.cpf1)}</b>, pela presente CREDENCIA o Sr(a). <b>{blank(v.procurador)}</b>, portador da carteira de identidade nº <b>{blank(v.rg2)}</b>, Órgão Expedidor <b>{blank(v.orgao2)}</b> e do CPF nº <b>{blank(v.cpf2)}</b>, para representá-la na Licitação em epígrafe supra mencionada (<b>{blank(v.licitacao)}</b> — <b>{blank(v.orgaoLicitante)}</b>), outorgando-lhe poderes para concorrer, desistir, renunciar, transigir, firmar recibos, assinar Atas e outros documentos, acompanhar todo o processo Licitatório até o seu final, tomar ciência de outras propostas, podendo para tanto, praticar todos os atos necessários para o bom e fiel cumprimento deste mandato.
        </p>
        <p style={{ marginBottom: '40px' }}>
          Data: <b>{v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}</b> — {blank(v.cidade, '_____________')}
        </p>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '12px' }}>{blank(v.representante, 'Assinatura do Representante Legal')}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'elaboracao',
    titulo: 'Declaração de Elaboração Independente de Proposta',
    fields: [
      { key: 'empresa', label: 'Razão Social da Empresa', width: 'full' },
      { key: 'cnpj', label: 'CNPJ', width: 'half' },
      { key: 'licitacao', label: 'Nº do Processo / Licitação', width: 'half' },
      { key: 'orgaoLicitante', label: 'Órgão Licitante', width: 'full' },
      { key: 'representante', label: 'Representante Legal', width: 'full' },
      { key: 'cargo', label: 'Cargo', width: 'half' },
      { key: 'cpf', label: 'CPF', width: 'half' },
      { key: 'cidade', label: 'Cidade', width: 'half' },
      { key: 'data', label: 'Data', type: 'date', width: 'half' },
    ],
    render: (v) => (
      <div>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '20px', textTransform: 'uppercase' }}>Declaração de Elaboração Independente de Proposta</p>
        <p style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
          Eu, <b>{blank(v.representante)}</b>, portador do CPF nº <b>{blank(v.cpf)}</b>, <b>{blank(v.cargo, 'representante legal')}</b> da empresa <b>{blank(v.empresa)}</b>, inscrita no CNPJ sob nº <b>{blank(v.cnpj)}</b>, para fins do disposto no inciso III do art. 9º da Lei nº 14.133/2021, DECLARO, sob as penas da lei, que a proposta apresentada para a licitação <b>{blank(v.licitacao)}</b> — <b>{blank(v.orgaoLicitante)}</b> foi elaborada de maneira independente pelo Licitante, e que o conteúdo da proposta não foi, no todo ou em parte, direta ou indiretamente, informado a, discutido com ou recebido de qualquer outro participante potencial ou de fato da referida licitação por qualquer meio ou por qualquer pessoa.
        </p>
        <p style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
          Declaro também que a intenção de apresentar a proposta elaborada para a presente licitação não foi informada a, discutido com ou recebido de qualquer outro participante potencial ou de fato da referida licitação por qualquer meio ou por qualquer pessoa.
        </p>
        <p style={{ marginBottom: '40px' }}>
          {blank(v.cidade, '_____________')}, {v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}.
        </p>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '12px' }}>{blank(v.representante, 'Assinatura')}</p>
          <p style={{ fontSize: '12px' }}>{blank(v.cargo, 'Cargo')}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'fatos-impeditivos',
    titulo: 'Declaração de Inexistência de Fatos Impeditivos',
    fields: [
      { key: 'empresa', label: 'Razão Social da Empresa', width: 'full' },
      { key: 'cnpj', label: 'CNPJ', width: 'half' },
      { key: 'licitacao', label: 'Nº do Processo / Licitação', width: 'half' },
      { key: 'orgaoLicitante', label: 'Órgão Licitante', width: 'full' },
      { key: 'representante', label: 'Representante Legal', width: 'full' },
      { key: 'cargo', label: 'Cargo', width: 'half' },
      { key: 'cpf', label: 'CPF', width: 'half' },
      { key: 'cidade', label: 'Cidade', width: 'half' },
      { key: 'data', label: 'Data', type: 'date', width: 'half' },
    ],
    render: (v) => (
      <div>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '20px', textTransform: 'uppercase' }}>Declaração de Inexistência de Fatos Impeditivos</p>
        <p style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
          A empresa <b>{blank(v.empresa)}</b>, inscrita no CNPJ sob nº <b>{blank(v.cnpj)}</b>, por intermédio de seu representante legal, Sr(a). <b>{blank(v.representante)}</b>, <b>{blank(v.cargo, 'representante legal')}</b>, portador do CPF nº <b>{blank(v.cpf)}</b>, DECLARA, para fins do disposto na licitação <b>{blank(v.licitacao)}</b>, promovida por <b>{blank(v.orgaoLicitante)}</b>, sob as penas da Lei, que até a presente data inexistem fatos impeditivos para sua habilitação no presente processo licitatório, ciente da obrigatoriedade de declarar ocorrências posteriores.
        </p>
        <p style={{ marginBottom: '40px' }}>
          {blank(v.cidade, '_____________')}, {v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}.
        </p>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '12px' }}>{blank(v.representante, 'Assinatura do Representante Legal')}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'trabalho-forcado',
    titulo: 'Declaração de Não Trabalho Forçado e Degradante',
    fields: [
      { key: 'empresa', label: 'Razão Social da Empresa', width: 'full' },
      { key: 'cnpj', label: 'CNPJ', width: 'half' },
      { key: 'licitacao', label: 'Nº do Processo / Licitação', width: 'half' },
      { key: 'orgaoLicitante', label: 'Órgão Licitante', width: 'full' },
      { key: 'representante', label: 'Representante Legal', width: 'full' },
      { key: 'cargo', label: 'Cargo', width: 'half' },
      { key: 'cidade', label: 'Cidade', width: 'half' },
      { key: 'data', label: 'Data', type: 'date', width: 'half' },
    ],
    render: (v) => (
      <div>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '20px', textTransform: 'uppercase' }}>Declaração de Não Utilização de Trabalho Forçado e Degradante</p>
        <p style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
          A empresa <b>{blank(v.empresa)}</b>, inscrita no CNPJ sob nº <b>{blank(v.cnpj)}</b>, por intermédio de seu representante legal, Sr(a). <b>{blank(v.representante)}</b>, <b>{blank(v.cargo, 'representante legal')}</b>, DECLARA, para fins do disposto na licitação <b>{blank(v.licitacao)}</b>, promovida por <b>{blank(v.orgaoLicitante)}</b>, em cumprimento ao art. 7º, inciso XXXIII da Constituição Federal e à legislação trabalhista vigente, que não emprega mão de obra que constitua violação ou desrespeito aos direitos fundamentais do trabalhador, não utilizando trabalho forçado ou em condições análogas à escravidão, e que não contrata trabalhadores em condições degradantes.
        </p>
        <p style={{ marginBottom: '40px' }}>
          {blank(v.cidade, '_____________')}, {v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}.
        </p>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '12px' }}>{blank(v.representante, 'Assinatura do Representante Legal')}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'vistoria',
    titulo: 'Declaração de Renúncia de Vistoria',
    fields: [
      { key: 'empresa', label: 'Razão Social da Empresa', width: 'full' },
      { key: 'cnpj', label: 'CNPJ', width: 'half' },
      { key: 'licitacao', label: 'Nº do Processo / Licitação', width: 'half' },
      { key: 'orgaoLicitante', label: 'Órgão Licitante', width: 'full' },
      { key: 'objeto', label: 'Objeto da Licitação', width: 'full' },
      { key: 'representante', label: 'Representante Legal', width: 'full' },
      { key: 'cargo', label: 'Cargo', width: 'half' },
      { key: 'cidade', label: 'Cidade', width: 'half' },
      { key: 'data', label: 'Data', type: 'date', width: 'half' },
    ],
    render: (v) => (
      <div>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '20px', textTransform: 'uppercase' }}>Declaração de Renúncia de Vistoria</p>
        <p style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
          A empresa <b>{blank(v.empresa)}</b>, inscrita no CNPJ sob nº <b>{blank(v.cnpj)}</b>, por intermédio de seu representante legal, Sr(a). <b>{blank(v.representante)}</b>, <b>{blank(v.cargo, 'representante legal')}</b>, DECLARA, para fins de participação na licitação <b>{blank(v.licitacao)}</b>, promovida por <b>{blank(v.orgaoLicitante)}</b>, cujo objeto é <b>{blank(v.objeto)}</b>, que renuncia ao direito de realizar vistoria técnica prévia, tendo pleno conhecimento das condições e peculiaridades do objeto contratual, assumindo total responsabilidade por essa decisão e reconhecendo que não poderá alegar o desconhecimento das condições do local para quaisquer questionamentos futuros.
        </p>
        <p style={{ marginBottom: '40px' }}>
          {blank(v.cidade, '_____________')}, {v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}.
        </p>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '12px' }}>{blank(v.representante, 'Assinatura do Representante Legal')}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'habilitacao',
    titulo: 'Declaração de Habilitação',
    fields: [
      { key: 'empresa', label: 'Razão Social da Empresa', width: 'full' },
      { key: 'cnpj', label: 'CNPJ', width: 'half' },
      { key: 'licitacao', label: 'Nº do Processo / Licitação', width: 'half' },
      { key: 'orgaoLicitante', label: 'Órgão Licitante', width: 'full' },
      { key: 'representante', label: 'Representante Legal', width: 'full' },
      { key: 'cargo', label: 'Cargo', width: 'half' },
      { key: 'cpf', label: 'CPF', width: 'half' },
      { key: 'cidade', label: 'Cidade', width: 'half' },
      { key: 'data', label: 'Data', type: 'date', width: 'half' },
    ],
    render: (v) => (
      <div>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '20px', textTransform: 'uppercase' }}>Declaração de Habilitação</p>
        <p style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
          A empresa <b>{blank(v.empresa)}</b>, inscrita no CNPJ sob nº <b>{blank(v.cnpj)}</b>, por intermédio de seu representante legal, Sr(a). <b>{blank(v.representante)}</b>, <b>{blank(v.cargo, 'representante legal')}</b>, portador do CPF nº <b>{blank(v.cpf)}</b>, DECLARA, para os devidos fins e sob as penas da Lei, com referência à licitação <b>{blank(v.licitacao)}</b>, promovida por <b>{blank(v.orgaoLicitante)}</b>, que:
        </p>
        <ul style={{ marginBottom: '12px', paddingLeft: '20px', lineHeight: '2' }}>
          <li>Não está impedida de contratar com a Administração Pública, direta ou indireta;</li>
          <li>Não foi declarada inidônea pela Administração Pública federal, estadual ou municipal;</li>
          <li>Não está em processo de falência, recuperação judicial ou extrajudicial;</li>
          <li>Cumpre todos os requisitos de habilitação exigidos no edital;</li>
          <li>As informações prestadas são verdadeiras.</li>
        </ul>
        <p style={{ marginBottom: '40px' }}>
          {blank(v.cidade, '_____________')}, {v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}.
        </p>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '12px' }}>{blank(v.representante, 'Assinatura do Representante Legal')}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'mepep',
    titulo: 'Declaração de Micro Empresa ou Empresa de Pequeno Porte',
    fields: [
      { key: 'empresa', label: 'Razão Social da Empresa', width: 'full' },
      { key: 'cnpj', label: 'CNPJ', width: 'half' },
      { key: 'porte', label: 'Porte (ME ou EPP)', width: 'half', placeholder: 'Ex: Microempresa (ME)' },
      { key: 'licitacao', label: 'Nº do Processo / Licitação', width: 'half' },
      { key: 'orgaoLicitante', label: 'Órgão Licitante', width: 'half' },
      { key: 'representante', label: 'Representante Legal', width: 'full' },
      { key: 'cargo', label: 'Cargo', width: 'half' },
      { key: 'cpf', label: 'CPF', width: 'half' },
      { key: 'cidade', label: 'Cidade', width: 'half' },
      { key: 'data', label: 'Data', type: 'date', width: 'half' },
    ],
    render: (v) => (
      <div>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '20px', textTransform: 'uppercase' }}>Declaração de Microempresa ou Empresa de Pequeno Porte</p>
        <p style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
          A empresa <b>{blank(v.empresa)}</b>, inscrita no CNPJ sob nº <b>{blank(v.cnpj)}</b>, por intermédio de seu representante legal, Sr(a). <b>{blank(v.representante)}</b>, <b>{blank(v.cargo, 'representante legal')}</b>, portador do CPF nº <b>{blank(v.cpf)}</b>, DECLARA, sob as penas da Lei, em especial o art. 299 do Código Penal Brasileiro, que se enquadra como <b>{blank(v.porte, 'Microempresa (ME) / Empresa de Pequeno Porte (EPP)')}</b>, nos termos da Lei Complementar nº 123/2006 e suas alterações, para os fins estabelecidos no processo licitatório <b>{blank(v.licitacao)}</b>, promovido por <b>{blank(v.orgaoLicitante)}</b>, bem como que não existe qualquer impedimento legal para tal enquadramento.
        </p>
        <p style={{ marginBottom: '40px' }}>
          {blank(v.cidade, '_____________')}, {v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}.
        </p>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '12px' }}>{blank(v.representante, 'Assinatura do Representante Legal')}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'menor-idade',
    titulo: 'Declaração que não emprega menor de idade, salvo na condição de aprendiz',
    fields: [
      { key: 'empresa', label: 'Razão Social da Empresa', width: 'full' },
      { key: 'cnpj', label: 'CNPJ', width: 'half' },
      { key: 'licitacao', label: 'Nº do Processo / Licitação', width: 'half' },
      { key: 'orgaoLicitante', label: 'Órgão Licitante', width: 'full' },
      { key: 'representante', label: 'Representante Legal', width: 'full' },
      { key: 'cargo', label: 'Cargo', width: 'half' },
      { key: 'cpf', label: 'CPF', width: 'half' },
      { key: 'cidade', label: 'Cidade', width: 'half' },
      { key: 'data', label: 'Data', type: 'date', width: 'half' },
    ],
    render: (v) => (
      <div>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '20px', textTransform: 'uppercase' }}>Declaração de Não Emprego de Menor de Idade</p>
        <p style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
          A empresa <b>{blank(v.empresa)}</b>, inscrita no CNPJ sob nº <b>{blank(v.cnpj)}</b>, por intermédio de seu representante legal, Sr(a). <b>{blank(v.representante)}</b>, <b>{blank(v.cargo, 'representante legal')}</b>, portador do CPF nº <b>{blank(v.cpf)}</b>, DECLARA, para fins do disposto no inciso XXXIII do art. 7º da Constituição Federal, e em atendimento ao que determina a licitação <b>{blank(v.licitacao)}</b>, promovida por <b>{blank(v.orgaoLicitante)}</b>, que não emprega menor de dezoito anos em trabalho noturno, perigoso ou insalubre e não emprega menor de dezesseis anos, salvo menor, a partir de quatorze anos, na condição de aprendiz, nos termos do art. 7º, XXXIII da Constituição Federal.
        </p>
        <p style={{ marginBottom: '40px' }}>
          {blank(v.cidade, '_____________')}, {v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}.
        </p>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '12px' }}>{blank(v.representante, 'Assinatura do Representante Legal')}</p>
        </div>
      </div>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeclaracoesPage() {
  const [modeloId, setModeloId] = useState(MODELOS[0].id);
  const [showDropdown, setShowDropdown] = useState(false);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const modelo = MODELOS.find(m => m.id === modeloId)!;
  const v = values[modeloId] || {};

  function setField(key: string, val: string) {
    setValues(prev => ({
      ...prev,
      [modeloId]: { ...(prev[modeloId] || {}), [key]: val },
    }));
  }

  async function exportPDF() {
    setPrinting(true);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const margin = 20;
    const pageW = 210;
    const usableW = pageW - margin * 2;
    let y = margin;

    function addText(text: string, opts: { bold?: boolean; center?: boolean; size?: number; lineHeight?: number } = {}) {
      const size = opts.size || 11;
      doc.setFontSize(size);
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, usableW);
      const lh = (opts.lineHeight || 1.4) * size * 0.352778;
      if (y + lines.length * lh > 277) { doc.addPage(); y = margin; }
      if (opts.center) {
        lines.forEach((line: string) => {
          doc.text(line, pageW / 2, y, { align: 'center' });
          y += lh;
        });
      } else {
        doc.text(lines, margin, y);
        y += lines.length * lh;
      }
      y += 2;
    }

    // Title
    addText(modelo.titulo.toUpperCase(), { bold: true, center: true, size: 13 });
    y += 6;

    // Body text based on model
    const rendered = getPlainText(modelo, v);
    rendered.forEach(seg => {
      addText(seg.text, { bold: seg.bold, size: 11 });
      if (seg.spaceBefore) y += 4;
    });

    // Signature line
    y += 16;
    doc.setDrawColor(0);
    doc.line(margin + usableW / 2 - 30, y, margin + usableW / 2 + 30, y);
    y += 5;
    doc.setFontSize(10);
    doc.text(blank(v.representante, 'Assinatura do Representante Legal'), pageW / 2, y, { align: 'center' });

    doc.save(`${modelo.titulo.replace(/\s+/g, '_')}.pdf`);
    setPrinting(false);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F5', padding: '28px 24px' }}>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 30px 40px; background: white; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#262E3A', marginBottom: '4px' }}>Declarações</h1>
        <p style={{ fontSize: '13px', color: '#7B7B7B' }}>Modelos prontos — preencha os campos e exporte o PDF</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── Left panel ── */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', padding: '20px' }}>

          {/* Modelo selector */}
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#262E3A', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Modelos de Declarações:
          </p>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <button
              onClick={() => setShowDropdown(v => !v)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#262E3A', textAlign: 'left' }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>{modelo.titulo}</span>
              <ChevronDown className="h-4 w-4 shrink-0" style={{ color: '#7B7B7B', transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>
            {showDropdown && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, backgroundColor: '#1E2A3A', borderRadius: '8px', zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                {MODELOS.map(m => (
                  <button key={m.id} onClick={() => { setModeloId(m.id); setShowDropdown(false); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: m.id === modeloId ? '#FF6600' : '#E0E0E0', fontWeight: m.id === modeloId ? 700 : 400, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {m.id === modeloId && <span style={{ fontSize: '10px' }}>✓</span>}
                    <span>{m.titulo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {modelo.fields.map(f => {
              const colSpan = f.width === 'full' ? 2 : f.width === 'third' ? 1 : 1;
              return (
                <div key={f.key} style={{ gridColumn: `span ${colSpan}` }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#7B7B7B', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    placeholder={f.placeholder || f.label}
                    value={v[f.key] || ''}
                    onChange={e => setField(f.key, e.target.value)}
                    style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', outline: 'none', color: '#262E3A', boxSizing: 'border-box' }}
                  />
                </div>
              );
            })}
          </div>

          {/* Export button */}
          <button
            onClick={exportPDF}
            disabled={printing}
            style={{ marginTop: '20px', width: '100%', backgroundColor: '#1E2A3A', color: '#fff', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '0.5px', opacity: printing ? 0.7 : 1 }}
          >
            <Download className="h-4 w-4" />
            {printing ? 'GERANDO PDF...' : 'EXPORTAR DOCUMENTO'}
          </button>
        </div>

        {/* ── Right panel: preview ── */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', overflow: 'hidden' }}>
          {/* Preview header */}
          <div style={{ backgroundColor: '#1E2A3A', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText className="h-4 w-4" style={{ color: '#fff' }} />
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>Modelo Impresso: {modelo.titulo}</span>
          </div>

          {/* Alert */}
          <div style={{ backgroundColor: '#FFF8F5', borderBottom: '1px solid #FFE0CC', padding: '10px 20px', fontSize: '12px', color: '#7B7B7B' }}>
            ⚠ Verifique se o modelo fornecido no edital estabelece alguma informação adicional ou conflitante com este conteúdo e a necessidade de reconhecimento de firma nas assinaturas, visando evitar a inabilitação do licitante.
          </div>

          {/* Document preview */}
          <div id="print-area" ref={printRef} style={{ padding: '40px 48px', fontFamily: 'Georgia, serif', fontSize: '13px', color: '#000', lineHeight: '1.7', minHeight: '500px' }}>
            {modelo.render(v)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Plain text extraction for jsPDF ─────────────────────────────────────────

function getPlainText(modelo: Modelo, v: Record<string, string>): { text: string; bold?: boolean; spaceBefore?: boolean }[] {
  function b(val: string | undefined, fb = '___________') { return val?.trim() ? val : fb; }
  const segs: { text: string; bold?: boolean; spaceBefore?: boolean }[] = [];

  switch (modelo.id) {
    case 'credenciamento':
      segs.push({ text: `A empresa ${b(v.empresa)}, inscrita no CNPJ sob nº ${b(v.cnpj)}, por intermédio de seu representante legal, Sr(a). ${b(v.representante)}, portador da Carteira de Identidade nº ${b(v.rg1)}, Órgão Expedidor ${b(v.orgao1)} e do CPF nº ${b(v.cpf1)}, pela presente CREDENCIA o Sr(a). ${b(v.procurador)}, portador da carteira de identidade nº ${b(v.rg2)}, Órgão Expedidor ${b(v.orgao2)} e do CPF nº ${b(v.cpf2)}, para representá-la na Licitação em epígrafe supra mencionada (${b(v.licitacao)} — ${b(v.orgaoLicitante)}), outorgando-lhe poderes para concorrer, desistir, renunciar, transigir, firmar recibos, assinar Atas e outros documentos, acompanhar todo o processo Licitatório até o seu final, tomar ciência de outras propostas, podendo para tanto, praticar todos os atos necessários para o bom e fiel cumprimento deste mandato.` });
      segs.push({ text: `Data: ${v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'} — ${b(v.cidade, '_____________')}`, spaceBefore: true });
      break;
    default:
      segs.push({ text: `${modelo.titulo}\n\nDocumento gerado pelo sistema Licitah.\n\nEmpresa: ${b(v.empresa)}\nCNPJ: ${b(v.cnpj)}\nRepresentante: ${b(v.representante)}\nData: ${v.data ? new Date(v.data + 'T12:00').toLocaleDateString('pt-BR') : '__/__/____'}` });
  }
  return segs;
}
