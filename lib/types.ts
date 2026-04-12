export interface Licitacao {
  numeroControlePNCP: string;
  objetoCompra: string;
  valorTotalEstimado: number | null;
  orgaoEntidade: {
    razaoSocial: string;
    cnpj: string;
  };
  unidadeOrgao: {
    ufNome: string;
    municipioNome: string;
    ufSigla: string;
  };
  modalidadeNome: string;
  modalidadeId: number;
  situacaoCompraNome: string;
  situacaoCompraId: number;
  dataPublicacaoPncp: string;
  dataAtualizacaoPncp?: string | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  linkSistemaOrigem: string | null;
  sequencialCompra: number;
  anoCompra: number;
}

export interface LicitacaoItem {
  numeroItem: number;
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  valorUnitarioEstimado: number | null;
  valorTotal: number | null;
}

export interface ApiResponse {
  data: Licitacao[];
  totalRegistros: number;
  paginasRestantes: boolean;
}

export interface Usuario {
  usuario_id: number;
  usuario_nome: string;
  usuario_email: string;
  usuario_funcao: number;
  usuario_ativo: number;
  usuario_hash: string;
  usuario_telefone?: string;
  usuario_cpf?: string;
}

export interface Empresa {
  empresa_id: number;
  empresa_nome: string;
  empresa_cnpj: string;
  empresa_hash: string;
}

export interface Tarefa {
  licitacoes_tarefa_id: number;
  licitacoes_tarefa_nome: string;
  licitacoes_tarefa_prazo: string;
  licitacoes_tarefa_status: number;
  licitacoes_tarefa_licitacao_governo: string;
  licitacoes_tarefa_empresa: number;
}

export interface Anotacao {
  licitacoes_anotacao_id: number;
  licitacoes_anotacao_texto: string;
  licitacoes_anotacao_hash: string;
  licitacoes_anotacao_autor: number;
  licitacoes_anotacao_licitacao_governo: string;
  licitacoes_anotacao_data?: string;
  autor_nome?: string;
}

export interface Favorito {
  favorito_id: number;
  favorito_modulo: string;
  favorito_identificador: string;
  favorito_autor: number;
  favorito_empresa: number;
}

export interface Notificacao {
  notificacao_id: number;
  notificacao_cabecalho: string;
  notificacao_body: string;
  notificacao_destinatario: number;
  notificacao_data: string;
  notificacao_lido: number;
}

export interface Plano {
  plano_id: number;
  plano_nome: string;
  plano_curta: string;
  plano_longa: string;
  plano_hash: string;
}
