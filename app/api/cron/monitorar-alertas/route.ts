import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { parseKeywords, parseRegion } from '@/lib/oportunidades';
import { queryOportunidadesFromCache } from '@/lib/oportunidades-cache';
import { createNotificacao, sendWhatsApp } from '@/lib/alertas';
import {
  sendAlertaOportunidades,
  sendAlertaStatus,
  sendAlertaAberturaAmanha,
} from '@/lib/email';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const provided   = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expected   = process.env.CRON_SECRET || '';
  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const summary = { oportunidades: 0, statusChanges: 0, aberturaAlerts: 0, whatsappSent: 0, emailSent: 0 };

  // ── 1. New opportunity alerts ────────────────────────────────────────────────
  const userConfigs = await sql`
    SELECT lo.licitacoes_oportunidade_autor  AS user_id,
           lo.licitacoes_oportunidade_tagmento AS tagmento,
           lo.licitacoes_oportunidade_regioes  AS regioes,
           lo.catmat_codes,
           lo.ultimo_alerta_em,
           u.usuario_whatsapp,
           u.usuario_email,
           u.usuario_display AS nome
    FROM licitacoes_oportunidades lo
    JOIN usuarios u ON u.usuario_id = lo.licitacoes_oportunidade_autor
    WHERE lo.licitacoes_oportunidade_tagmento IS NOT NULL
      AND lo.licitacoes_oportunidade_tagmento <> ''
      AND (lo.ultimo_alerta_em IS NULL OR lo.ultimo_alerta_em < NOW() - INTERVAL '20 hours')
  `.catch(() => [] as any[]);

  for (const cfg of userConfigs) {
    const keywords = parseKeywords(cfg.tagmento);
    if (keywords.length === 0) continue;

    const region      = parseRegion(cfg.regioes || '');
    const catmatCodes: string[] = Array.isArray(cfg.catmat_codes) ? cfg.catmat_codes : [];

    const results = await queryOportunidadesFromCache(keywords, region, {
      periodo: '24h',
      catmatCodes,
      limit: 100,
    });

    if (results.length === 0) continue;

    const count = results.length;
    summary.oportunidades += count;

    await createNotificacao(
      cfg.user_id,
      `${count} nova${count > 1 ? 's' : ''} oportunidade${count > 1 ? 's' : ''}`,
      `Encontramos ${count} licitaç${count > 1 ? 'ões' : 'ão'} publicada${count > 1 ? 's' : ''} nas últimas 24h que corresponde${count > 1 ? 'm' : ''} ao seu perfil de busca.`
    );

    await sql`
      UPDATE licitacoes_oportunidades
      SET ultimo_alerta_em = NOW()
      WHERE licitacoes_oportunidade_autor = ${cfg.user_id}
    `.catch(() => null);

    // Email
    if (cfg.usuario_email) {
      const preview = results.slice(0, 3).map((r: any) => ({
        objeto: r.objetoCompra || '',
        orgao: r.orgaoEntidade?.razaoSocial || '',
      }));
      const sent = await sendAlertaOportunidades(cfg.usuario_email, cfg.nome || '', count, preview);
      if (sent) summary.emailSent++;
    }

    // WhatsApp (urgent only)
    if (cfg.usuario_whatsapp) {
      const now = Date.now();
      const urgent = results.filter((r: any) => {
        const dt = r.dataEncerramentoProposta || r.dataAberturaProposta;
        if (!dt) return false;
        const diff = new Date(dt).getTime() - now;
        return diff > 0 && diff < 48 * 60 * 60 * 1000;
      });
      if (urgent.length > 0) {
        const preview = urgent.slice(0, 3)
          .map((r: any) => `• ${(r.objetoCompra || 'Ver objeto').substring(0, 80)}`)
          .join('\n');
        const msg =
          `🔔 *Licitah* — ${urgent.length} licitaç${urgent.length > 1 ? 'ões urgentes' : 'ão urgente'}!\n\n` +
          preview +
          `\n\nAcesse seu painel para ver detalhes e participar.`;
        const sent = await sendWhatsApp(cfg.usuario_whatsapp, msg);
        if (sent) summary.whatsappSent++;
      }
    }
  }

  // ── 2. Managed licitação status changes ──────────────────────────────────────
  const changed = await sql`
    SELECT lg.lg_id,
           lg.lg_conta        AS user_id,
           lg.lg_objeto,
           lg.lg_identificador,
           lg.lg_situacao     AS situacao_antiga,
           c.situacao         AS situacao_nova,
           u.usuario_whatsapp,
           u.usuario_email,
           u.usuario_display  AS nome
    FROM licitacoes_gerenciadas lg
    JOIN licitacoes_pncp_cache c ON c.numero_controle_pncp = lg.lg_identificador
    JOIN usuarios u ON u.usuario_id = lg.lg_conta
    WHERE c.situacao IS NOT NULL
      AND c.situacao <> lg.lg_situacao
  `.catch(() => [] as any[]);

  for (const row of changed) {
    summary.statusChanges++;

    await createNotificacao(
      row.user_id,
      'Situação de licitação alterada',
      `A licitação "${(row.lg_objeto || '').substring(0, 80)}" mudou de "${row.situacao_antiga}" para "${row.situacao_nova}".`
    );

    await sql`
      UPDATE licitacoes_gerenciadas
      SET lg_situacao = ${row.situacao_nova}
      WHERE lg_id = ${row.lg_id}
    `.catch(() => null);

    // Email
    if (row.usuario_email) {
      const sent = await sendAlertaStatus(
        row.usuario_email,
        row.nome || '',
        row.lg_objeto || '',
        row.situacao_antiga,
        row.situacao_nova
      );
      if (sent) summary.emailSent++;
    }

    // WhatsApp
    if (row.usuario_whatsapp) {
      const msg =
        `📋 *Licitah* — Situação alterada\n\n` +
        `"${(row.lg_objeto || '').substring(0, 80)}"\n\n` +
        `De: ${row.situacao_antiga}\nPara: *${row.situacao_nova}*\n\nAcesse seu painel para mais detalhes.`;
      const sent = await sendWhatsApp(row.usuario_whatsapp, msg);
      if (sent) summary.whatsappSent++;
    }
  }

  // ── 3. Tomorrow's abertura alerts ────────────────────────────────────────────
  const amanha = await sql`
    SELECT lg.lg_id,
           lg.lg_conta   AS user_id,
           lg.lg_objeto,
           lg.lg_orgao,
           lg.lg_data_abertura,
           u.usuario_whatsapp,
           u.usuario_email,
           u.usuario_display AS nome
    FROM licitacoes_gerenciadas lg
    JOIN usuarios u ON u.usuario_id = lg.lg_conta
    WHERE lg.lg_data_abertura::date = (CURRENT_DATE + INTERVAL '1 day')::date
  `.catch(() => [] as any[]);

  for (const row of amanha) {
    summary.aberturaAlerts++;

    await createNotificacao(
      row.user_id,
      'Abertura de proposta amanhã',
      `A licitação "${(row.lg_objeto || '').substring(0, 80)}" tem abertura de propostas amanhã.`
    );

    const dataFormatada = row.lg_data_abertura
      ? new Date(row.lg_data_abertura).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';

    // Email
    if (row.usuario_email) {
      const sent = await sendAlertaAberturaAmanha(
        row.usuario_email,
        row.nome || '',
        row.lg_objeto || '',
        row.lg_orgao || '—',
        dataFormatada
      );
      if (sent) summary.emailSent++;
    }

    // WhatsApp
    if (row.usuario_whatsapp) {
      const msg =
        `⏰ *Licitah* — Lembrete de abertura\n\n` +
        `*Amanhã* é o dia de abertura de propostas para:\n\n` +
        `"${(row.lg_objeto || '').substring(0, 80)}"\n` +
        `Órgão: ${row.lg_orgao || '—'}\n\nNão perca o prazo!`;
      const sent = await sendWhatsApp(row.usuario_whatsapp, msg);
      if (sent) summary.whatsappSent++;
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
