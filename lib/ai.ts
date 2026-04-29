import { openai } from '@ai-sdk/openai';

/** Model used across AI features. gpt-4o-mini = fast, cheap, great PT-BR. */
export const AI_MODEL = openai('gpt-4o-mini');
export const AI_MODEL_NAME = 'gpt-4o-mini';

/**
 * Build a normalized text block describing a licitação for LLM context.
 * Used by both Resumo and Pergunte ao Edital.
 */
export function buildLicitacaoContext(licitacao: any, items: any[] = []): string {
  if (!licitacao) return '';

  const fmt = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Não informada';
  const fmtMoney = (v: any) => {
    if (!v || Number(v) <= 0) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  };

  const lines: string[] = [];
  lines.push('=== DADOS DA LICITAÇÃO ===');
  lines.push(`Número PNCP: ${licitacao.numeroControlePNCP || '—'}`);
  lines.push(`Modalidade: ${licitacao.modalidadeNome || '—'}`);
  lines.push(`Situação: ${licitacao.situacaoCompraNome || '—'}`);
  lines.push(`Objeto: ${licitacao.objetoCompra || '—'}`);
  lines.push(`Valor estimado: ${fmtMoney(licitacao.valorTotalEstimado)}`);
  lines.push(`Valor homologado: ${fmtMoney(licitacao.valorTotalHomologado)}`);
  lines.push('');

  lines.push('=== ÓRGÃO ===');
  lines.push(`Nome: ${licitacao.orgaoEntidade?.razaoSocial || '—'}`);
  lines.push(`CNPJ: ${licitacao.orgaoEntidade?.cnpj || '—'}`);
  lines.push(`Esfera: ${licitacao.orgaoEntidade?.esferaId || '—'} | Poder: ${licitacao.orgaoEntidade?.poderId || '—'}`);
  lines.push('');

  lines.push('=== UNIDADE / LOCAL ===');
  lines.push(`Unidade: ${licitacao.unidadeOrgao?.nomeUnidade || '—'}`);
  lines.push(`Município: ${licitacao.unidadeOrgao?.municipioNome || '—'} - ${licitacao.unidadeOrgao?.ufSigla || '—'}`);
  lines.push('');

  lines.push('=== DATAS ===');
  lines.push(`Publicação no PNCP: ${fmt(licitacao.dataPublicacaoPncp)}`);
  lines.push(`Abertura das propostas: ${fmt(licitacao.dataAberturaProposta)}`);
  lines.push(`Encerramento das propostas: ${fmt(licitacao.dataEncerramentoProposta)}`);
  lines.push('');

  lines.push('=== INFORMAÇÕES COMPLEMENTARES ===');
  lines.push(`Modo de disputa: ${licitacao.modoDisputaNome || '—'}`);
  lines.push(`Critério de julgamento: ${licitacao.criterioJulgamentoNome || '—'}`);
  lines.push(`Amparo legal: ${licitacao.amparoLegal?.nome || '—'} ${licitacao.amparoLegal?.descricao ? `— ${licitacao.amparoLegal.descricao}` : ''}`);
  lines.push(`SRP (Sistema Registro de Preços): ${licitacao.srp ? 'Sim' : 'Não'}`);
  if (licitacao.informacaoComplementar) {
    lines.push(`Observações: ${licitacao.informacaoComplementar}`);
  }
  if (licitacao.justificativaPresencial) {
    lines.push(`Justificativa presencial: ${licitacao.justificativaPresencial}`);
  }
  if (licitacao.linkSistemaOrigem) {
    lines.push(`Link sistema origem: ${licitacao.linkSistemaOrigem}`);
  }
  lines.push('');

  if (items && items.length > 0) {
    lines.push(`=== ITENS (${items.length}) ===`);
    items.slice(0, 50).forEach((it: any, i: number) => {
      const desc = it.descricao || it.descricaoComplementar || '—';
      const qtd = it.quantidade || '—';
      const unidade = it.unidadeMedida || '—';
      const valorUnit = fmtMoney(it.valorUnitarioEstimado);
      const valorTotal = fmtMoney(it.valorTotal);
      lines.push(`${i + 1}. ${desc}`);
      lines.push(`   Quantidade: ${qtd} ${unidade} · Unitário: ${valorUnit} · Total: ${valorTotal}`);
      if (it.materialOuServico) lines.push(`   Tipo: ${it.materialOuServico === 'M' ? 'Material' : 'Serviço'}`);
      if (it.criterioJulgamentoNome) lines.push(`   Critério: ${it.criterioJulgamentoNome}`);
    });
    if (items.length > 50) {
      lines.push(`... e mais ${items.length - 50} itens (truncados para limite de contexto)`);
    }
  }

  return lines.join('\n');
}

/** System prompt for the structured Resumo. */
export const RESUMO_SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras. Sua missão é gerar um resumo executivo CLARO, OBJETIVO e ÚTIL de uma licitação, ajudando o usuário a decidir rapidamente se vale a pena participar.

Regras OBRIGATÓRIAS:
1. Use APENAS dados presentes no contexto fornecido. NUNCA invente informações.
2. Se um campo não foi informado, escreva "Não informado" — não tente preencher com hipóteses.
3. Seja direto. Linguagem profissional mas acessível para empresário.
4. Use Markdown (negrito com **, listas com -, títulos com ###).
5. Em valores monetários, use o formato brasileiro (R$ 1.234,56).
6. NÃO mencione que você é uma IA.

ESTRUTURA OBRIGATÓRIA da resposta (use exatamente esses títulos):

### 📋 Visão Geral
Parágrafo curto (2-3 linhas) descrevendo o que está sendo licitado, qual modalidade, quem é o órgão e a localidade.

### 💰 Valores e Modalidade
- **Modalidade:** ...
- **Valor estimado:** ...
- **Modo de disputa:** ...
- **Critério de julgamento:** ...
- **SRP:** ...

### 📅 Prazos Críticos
- **Publicação:** ...
- **Abertura das propostas:** ...
- **Encerramento:** ...
Se houver prazo curto (menos de 7 dias até abertura), DESTAQUE com ⚠️.

### 📦 Objeto e Itens Principais
Resuma o objeto em 2 frases. Se houver itens, liste os 3-5 mais relevantes (maiores valores ou quantidades).

### ⚠️ Pontos de Atenção
Liste 3-5 pontos práticos relevantes para quem vai participar. Exemplos:
- Exigências de habilitação prováveis (baseadas no objeto/modalidade)
- Riscos identificáveis (prazos curtos, valor muito baixo/alto, modalidade restritiva)
- Oportunidades (ME/EPP, valor atrativo, abertura próxima)

### ✅ Recomendação
Uma frase objetiva: "Vale a pena avaliar" / "Cuidado com [X]" / "Atenção: ..." — baseado nos dados.

Lembre-se: o usuário precisa decidir em 30 segundos se prossegue com essa oportunidade.`;

/** System prompt for the Pergunte ao Edital chat. */
export const PERGUNTAR_SYSTEM_PROMPT = `Você é um assistente especializado em licitações públicas brasileiras, integrado ao sistema Licitah. Sua missão é responder perguntas sobre uma licitação específica usando APENAS as informações fornecidas no contexto.

Regras OBRIGATÓRIAS:
1. Responda APENAS com base no contexto fornecido. Se a informação não estiver no contexto, diga claramente: "Essa informação não está disponível nos dados desta licitação. Recomendo consultar o edital completo no PNCP."
2. NUNCA invente dados, valores, datas ou exigências.
3. Seja direto e objetivo. Comece pela resposta, depois explique se necessário.
4. Use Markdown leve (negrito, listas curtas) quando ajudar a clareza.
5. Para valores monetários use formato BR (R$ 1.234,56).
6. Quando o usuário fizer perguntas genéricas sobre licitações (não sobre esta licitação específica), você pode responder com base em conhecimento geral da Lei 14.133/21 e Lei 8.666/93, mas DEIXE CLARO que é uma orientação geral e não uma análise da licitação específica.
7. Se a pergunta for sobre estratégia/decisão (ex: "vale a pena participar?"), seja honesto sobre limites: aponte os pontos relevantes do contexto, mas explique que a decisão depende da análise interna do usuário.
8. NÃO mencione que você é uma IA.
9. NUNCA responda perguntas fora do escopo de licitações públicas.
10. Português brasileiro formal mas acessível.

Lembre-se: o usuário confia que você é preciso. Quando não souber, admita.`;
