/**
 * Helper para checar o plano do usuário e verificar limites.
 *
 * O plano é armazenado na coluna `usuario_plano` da tabela `usuarios`.
 * Execute a migração abaixo antes de fazer deploy:
 *
 *   ALTER TABLE usuarios
 *     ADD COLUMN IF NOT EXISTS usuario_plano VARCHAR(20) NOT NULL DEFAULT 'free';
 */

import sql from './db';
import { type PlanoTipo, PLANOS_LIMITES } from './planos-config';

export async function getUserPlano(userId: string): Promise<PlanoTipo> {
  try {
    const rows = await sql`
      SELECT usuario_plano FROM usuarios
      WHERE usuario_id = ${userId} AND usuario_ativo = 1
      LIMIT 1
    `;
    const p = rows[0]?.usuario_plano;
    return p === 'expert' ? 'expert' : 'free';
  } catch {
    return 'free';
  }
}

// ── Verificações de limite ────────────────────────────────────────────────────

interface LimiteResult {
  ok: boolean;
  atual: number;
  limite: number;
  plano: PlanoTipo;
}

export async function verificarLimiteGerenciadas(userId: string): Promise<LimiteResult> {
  const plano = await getUserPlano(userId);
  const limite = PLANOS_LIMITES[plano].gerenciadas;
  if (limite === -1) return { ok: true, atual: 0, limite, plano };

  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM licitacoes_gerenciadas WHERE lg_conta = ${userId}
  `;
  const atual = Number(rows[0]?.c || 0);
  return { ok: atual < limite, atual, limite, plano };
}

export async function verificarLimiteDocumentos(userId: string): Promise<LimiteResult> {
  const plano = await getUserPlano(userId);
  const limite = PLANOS_LIMITES[plano].documentos;
  if (limite === -1) return { ok: true, atual: 0, limite, plano };

  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM licitacoes_habilitacoes
    WHERE licitacoes_habilitacao_autor = ${userId}
  `;
  const atual = Number(rows[0]?.c || 0);
  return { ok: atual < limite, atual, limite, plano };
}

export async function verificarLimiteTarefas(
  userId: string,
  licitacaoGoverno?: string | null,
): Promise<LimiteResult> {
  const plano = await getUserPlano(userId);
  const limite = PLANOS_LIMITES[plano].tarefasPorLicitacao;
  if (limite === -1) return { ok: true, atual: 0, limite, plano };

  const rows = licitacaoGoverno
    ? await sql`
        SELECT COUNT(*)::int AS c FROM licitacoes_tarefas
        WHERE licitacoes_tarefa_autor = ${userId}
          AND licitacoes_tarefa_licitacao_governo = ${licitacaoGoverno}
      `
    : await sql`
        SELECT COUNT(*)::int AS c FROM licitacoes_tarefas
        WHERE licitacoes_tarefa_autor = ${userId}
      `;
  const atual = Number(rows[0]?.c || 0);
  return { ok: atual < limite, atual, limite, plano };
}

export async function verificarLimiteEmpresas(userId: string): Promise<LimiteResult> {
  const plano = await getUserPlano(userId);
  const limite = PLANOS_LIMITES[plano].empresas;
  if (limite === -1) return { ok: true, atual: 0, limite, plano };

  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM empresas_associacao WHERE ea_usuario = ${userId}
  `;
  const atual = Number(rows[0]?.c || 0);
  return { ok: atual < limite, atual, limite, plano };
}

// ── Resposta padronizada de limite atingido ───────────────────────────────────

export function respostaLimiteAtingido(
  recurso: string,
  atual: number,
  limite: number,
  plano: PlanoTipo,
) {
  return {
    error:    'limite_plano',
    recurso,
    atual,
    limite,
    plano,
    message:  `Você atingiu o limite de ${limite} ${recurso} do plano Free. Faça upgrade para o Expert para ter acesso ilimitado.`,
  };
}
