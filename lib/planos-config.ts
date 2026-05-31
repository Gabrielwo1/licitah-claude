/**
 * Configuração centralizada dos planos e seus limites.
 * Para alterar os limites, edite apenas este arquivo.
 */

export type PlanoTipo = 'free' | 'expert';

export interface PlanoLimites {
  gerenciadas: number;         // max licitações gerenciadas (-1 = ilimitado)
  documentos: number;          // max documentos/habilitações total (-1 = ilimitado)
  tarefasPorLicitacao: number; // max tarefas por licitação (-1 = ilimitado)
  empresas: number;            // max CNPJs/empresas (-1 = ilimitado)
  oportunidades: boolean;      // acesso ao relatório de oportunidades diárias
  declaracoes: boolean;        // acesso à criação de declarações
}

export const PLANOS_LIMITES: Record<PlanoTipo, PlanoLimites> = {
  free: {
    gerenciadas:         3,
    documentos:          5,
    tarefasPorLicitacao: 3,
    empresas:            1,
    oportunidades:       false,
    declaracoes:         false,
  },
  expert: {
    gerenciadas:         -1,
    documentos:          -1,
    tarefasPorLicitacao: -1,
    empresas:            -1,
    oportunidades:       true,
    declaracoes:         true,
  },
};

export const PLANO_LABELS: Record<PlanoTipo, { nome: string; preco: string; descricao: string }> = {
  free: {
    nome:      'Plano Free',
    preco:     'GRÁTIS',
    descricao: 'Ideal para testar o sistema e nossos benefícios antes de assinar!',
  },
  expert: {
    nome:      'Plano Expert',
    preco:     'R$ 99,99',
    descricao: 'A melhor opção pra quem quer total controle e automação!',
  },
};

export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

export function limitLabel(limit: number): string {
  return limit === -1 ? 'Ilimitado' : String(limit);
}
