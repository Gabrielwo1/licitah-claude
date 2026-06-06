/**
 * Licitah — Worker do Robô de Lances
 *
 * Loop principal que:
 * 1. Busca sessões pendentes via /api/robo/jobs
 * 2. Para cada sessão: abre browser, loga no Compras.gov, monitora a disputa
 * 3. Aplica a estratégia de lance configurada pelo usuário
 * 4. Reporta todos os eventos de volta para o dashboard
 *
 * Deploy: Railway ou Render (container sempre ligado)
 * Vars de ambiente necessárias:
 *   APP_URL          — URL do app Next.js (ex: https://licitah.vercel.app)
 *   WORKER_SECRET    — Mesmo valor do WORKER_SECRET no Next.js
 *   WORKER_ID        — Identificador desta instância (ex: worker-railway-1)
 */

import 'dotenv/config';
import { fetchJobs, claimJob, updateStatus, recordLance, appendLog, heartbeat, Job } from './api';
import { iniciarBrowser, login, navegarParaPregao, lerEstadoDisputa, submeterLance } from './comprasgov';
import { decidirLance, EstadoDisputa } from './estrategias';

const POLL_INTERVAL_MS     = 30_000;  // Verifica novos jobs a cada 30s
const HEARTBEAT_INTERVAL_MS = 15_000;  // Heartbeat a cada 15s por sessão ativa
const LANCE_INTERVAL_MS    = 5_000;   // Verifica lance a cada 5s durante disputa

const activeSessions = new Set<number>();

async function processarSessao(job: Job): Promise<void> {
  const sid = job.id;
  activeSessions.add(sid);

  const { browser, page } = await iniciarBrowser();
  let heartbeatTimer: NodeJS.Timeout | null = null;

  async function log(msg: string) {
    console.log(`[sessão ${sid}] ${msg}`);
    await appendLog(sid, msg).catch(() => {});
  }

  try {
    // ── 1. Login ────────────────────────────────────────────────────────────
    await updateStatus(sid, 'conectando');
    await log('Iniciando login no Compras.gov...');

    const logado = await login(page, job.cgov_cpf, job.cgov_senha);
    if (!logado) {
      await updateStatus(sid, 'erro');
      await log('Falha no login — verifique CPF/senha nas configurações.');
      return;
    }
    await log('Login realizado com sucesso.');

    // ── 2. Navegar para o pregão ────────────────────────────────────────────
    await updateStatus(sid, 'aguardando_disputa');
    await log(`Navegando para Pregão ${job.numero_pregao} / UASG ${job.uasg}...`);

    const navegou = await navegarParaPregao(page, job.uasg, job.numero_pregao, job.item_numero);
    if (!navegou) {
      await updateStatus(sid, 'erro');
      await log('Não foi possível localizar o pregão. Verifique UASG e número.');
      return;
    }
    await log('Sala de disputa localizada. Aguardando abertura...');

    // ── 3. Heartbeat periódico ──────────────────────────────────────────────
    heartbeatTimer = setInterval(() => heartbeat(sid).catch(() => {}), HEARTBEAT_INTERVAL_MS);

    // ── 4. Loop de disputa ──────────────────────────────────────────────────
    let rodadas = 0;
    const MAX_RODADAS = 720; // 1h a 5s/rodada

    while (rodadas < MAX_RODADAS) {
      await new Promise(r => setTimeout(r, LANCE_INTERVAL_MS));
      rodadas++;

      const estado = await lerEstadoDisputa(page);

      if (!estado.disputaAtiva) {
        await log('Disputa encerrada pelo pregoeiro.');
        break;
      }

      if (estado.melhorLanceAtual === 0) {
        await log('Aguardando abertura da fase de lances...');
        continue;
      }

      if (rodadas === 1 || rodadas % 6 === 0) {
        await updateStatus(sid, 'em_disputa', {
          melhor_lance:  estado.nossoMelhorLance,
          posicao_atual: estado.somosMelhor ? 1 : 2,
        });
      }

      // ── 5. Aplicar estratégia ─────────────────────────────────────────────
      const estadoDecisao: EstadoDisputa = {
        melhorLanceAtual:  estado.melhorLanceAtual,
        nossoMelhorLance:  estado.nossoMelhorLance,
        somosMelhor:       estado.somosMelhor,
        precoMinimo:       job.preco_minimo,
        minutosRestantes:  estado.minutosRestantes,
        decrementoValor:   job.decremento_valor,
        decrementoPct:     job.decremento_pct,
      };

      const decisao = decidirLance(job.estrategia, estadoDecisao);

      if (!decisao.darLance) {
        if (rodadas % 12 === 0) await log(decisao.motivo);
        continue;
      }

      // ── 6. Dar lance ──────────────────────────────────────────────────────
      await log(`Dando lance de R$ ${decisao.valor!.toFixed(2)} — ${decisao.motivo}`);
      const aceito = await submeterLance(page, decisao.valor!);

      if (aceito) {
        await recordLance(sid, job.usuario_id, decisao.valor!, 'automatico', {
          motivo:            decisao.motivo,
          lance_anterior:    estado.melhorLanceAtual,
          minutos_restantes: estado.minutosRestantes,
        });
        await log(`Lance de R$ ${decisao.valor!.toFixed(2)} aceito!`);
      } else {
        await log(`Lance de R$ ${decisao.valor!.toFixed(2)} rejeitado pelo sistema.`);
      }
    }

    // ── 7. Resultado final ────────────────────────────────────────────────
    const estadoFinal = await lerEstadoDisputa(page);
    const resultado = estadoFinal.somosMelhor ? 'vencemos' : 'perdemos';
    await updateStatus(sid, resultado, {
      melhor_lance:   estadoFinal.nossoMelhorLance,
      lance_vencedor: estadoFinal.melhorLanceAtual,
    });
    await log(`Sessão encerrada — resultado: ${resultado.toUpperCase()}`);

  } catch (err: any) {
    console.error(`[sessão ${sid}] Erro inesperado:`, err);
    await updateStatus(sid, 'erro').catch(() => {});
    await appendLog(sid, `Erro inesperado: ${err?.message || err}`).catch(() => {});
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    await browser.close().catch(() => {});
    activeSessions.delete(sid);
  }
}

async function pollLoop(): Promise<void> {
  console.log('[worker] Iniciando loop de polling...');

  while (true) {
    try {
      const jobs = await fetchJobs();

      for (const job of jobs) {
        if (activeSessions.has(job.id)) continue;
        console.log(`[worker] Novo job: sessão ${job.id} — Pregão ${job.numero_pregao} / UASG ${job.uasg}`);
        await claimJob(job.id);
        // Processa em paralelo sem bloquear o loop
        processarSessao(job).catch(err => console.error(`[worker] Sessão ${job.id} falhou:`, err));
      }
    } catch (err) {
      console.error('[worker] Erro no poll:', err);
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// ── Inicialização ─────────────────────────────────────────────────────────────

const required = ['APP_URL', 'WORKER_SECRET'];
const missing  = required.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`[worker] Variáveis de ambiente faltando: ${missing.join(', ')}`);
  process.exit(1);
}

pollLoop().catch(err => {
  console.error('[worker] Loop fatal:', err);
  process.exit(1);
});
