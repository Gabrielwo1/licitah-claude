import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'Licitah <notificacoes@licitah.com.br>';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://app.licitah.com.br';

/* ─── base template ─────────────────────────────────────────── */
function wrap(body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:28px 32px;text-align:center}
  .header img{height:36px}
  .header h1{margin:12px 0 0;font-size:22px;color:#fff;font-weight:700;letter-spacing:-.02em}
  .body{padding:32px}
  .body p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d3d5c}
  .btn{display:inline-block;background:#ff6a1a;color:#fff!important;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:15px;margin:8px 0 20px}
  .card{background:#f8f8fb;border:1px solid #e8e8f0;border-radius:8px;padding:18px 20px;margin:16px 0}
  .card b{display:block;font-size:14px;color:#1a1a2e;margin-bottom:4px}
  .card span{font-size:13px;color:#6b7280}
  .tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(255,106,26,.12);color:#e55b00}
  .footer{background:#f4f4f5;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e8e8f0}
  .footer a{color:#6b7280;text-decoration:none}
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-.04em">Licitah</div>
    <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px">Plataforma de Licitações</div>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    <p>Você está recebendo este e-mail pois tem alertas ativos no Licitah.<br>
    <a href="${BASE_URL}/dashboard/perfil">Gerenciar notificações</a> · <a href="${BASE_URL}">Acessar painel</a></p>
  </div>
</div>
</body></html>`;
}

/* ─── low-level send ────────────────────────────────────────── */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    return !error;
  } catch {
    return false;
  }
}

/* ─── templates ─────────────────────────────────────────────── */

export async function sendBoasVindas(email: string, nome: string): Promise<boolean> {
  const html = wrap(`
    <p>Olá, <strong>${nome}</strong>! 👋</p>
    <p>Sua conta no <strong>Licitah</strong> foi criada com sucesso. Agora você tem acesso à plataforma de gestão de licitações mais completa do Brasil.</p>
    <p>Configure seu perfil de busca para receber alertas de oportunidades no seu segmento:</p>
    <a class="btn" href="${BASE_URL}/dashboard/oportunidades">Configurar alertas</a>
    <div class="card">
      <b>🔎 Busca inteligente</b><span>Encontre licitações com IA para o seu segmento</span>
      <b style="margin-top:12px">📋 Gestão de editais</b><span>Organize prazos, documentos e tarefas</span>
      <b style="margin-top:12px">🤖 Robô de lances</b><span>Dê lances automáticos no Compras.gov</span>
    </div>
    <p style="color:#9ca3af;font-size:13px">Qualquer dúvida, responda este e-mail. Estamos aqui para ajudar.</p>
  `);
  return sendEmail(email, 'Boas-vindas ao Licitah! 🎉', html);
}

export async function sendResetSenha(email: string, token: string): Promise<boolean> {
  const link = `${BASE_URL}/reset-senha?token=${token}`;
  const html = wrap(`
    <p>Recebemos um pedido de <strong>redefinição de senha</strong> para sua conta.</p>
    <p>Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
    <a class="btn" href="${link}">Redefinir senha</a>
    <p style="color:#9ca3af;font-size:13px">Se você não solicitou isso, ignore este e-mail — sua senha não será alterada.</p>
    <p style="color:#9ca3af;font-size:13px">Ou copie o link: <a href="${link}" style="color:#6b7280">${link}</a></p>
  `);
  return sendEmail(email, 'Redefinição de senha — Licitah', html);
}

export async function sendAlertaOportunidades(
  email: string,
  nome: string,
  count: number,
  preview: Array<{ objeto: string; orgao?: string; valor?: string }>
): Promise<boolean> {
  const cards = preview
    .slice(0, 3)
    .map(
      (l) => `
      <div class="card">
        <b>${l.objeto.substring(0, 90)}</b>
        <span>${l.orgao || ''}${l.valor ? ` · R$ ${l.valor}` : ''}</span>
      </div>`
    )
    .join('');

  const html = wrap(`
    <p>Olá, <strong>${nome}</strong>!</p>
    <p>Encontramos <strong>${count} nova${count > 1 ? 's' : ''} licitaç${count > 1 ? 'ões' : 'ão'}</strong> publicada${count > 1 ? 's' : ''} nas últimas 24h que corresponde${count > 1 ? 'm' : ''} ao seu perfil de busca.</p>
    ${cards}
    ${count > 3 ? `<p style="color:#6b7280;font-size:14px">...e mais ${count - 3} oportunidade${count - 3 > 1 ? 's' : ''} no seu painel.</p>` : ''}
    <a class="btn" href="${BASE_URL}/dashboard/oportunidades">Ver todas as oportunidades</a>
  `);
  return sendEmail(email, `🔔 ${count} nova${count > 1 ? 's' : ''} licitaç${count > 1 ? 'ões' : 'ão'} para você — Licitah`, html);
}

export async function sendAlertaStatus(
  email: string,
  nome: string,
  objeto: string,
  de: string,
  para: string
): Promise<boolean> {
  const html = wrap(`
    <p>Olá, <strong>${nome}</strong>!</p>
    <p>Uma das licitações que você está gerenciando teve sua situação alterada:</p>
    <div class="card">
      <b>${objeto.substring(0, 100)}</b>
      <span>De: <em>${de}</em> → Para: <strong>${para}</strong></span>
    </div>
    <a class="btn" href="${BASE_URL}/dashboard">Ver no painel</a>
  `);
  return sendEmail(email, `📋 Situação alterada: ${para} — Licitah`, html);
}

export async function sendAlertaAberturaAmanha(
  email: string,
  nome: string,
  objeto: string,
  orgao: string,
  dataAbertura: string
): Promise<boolean> {
  const html = wrap(`
    <p>Olá, <strong>${nome}</strong>!</p>
    <p>⏰ <strong>Lembrete:</strong> amanhã é o dia de abertura de propostas para uma licitação que você está acompanhando.</p>
    <div class="card">
      <b>${objeto.substring(0, 100)}</b>
      <span>Órgão: ${orgao}</span>
      <span>Abertura: ${dataAbertura}</span>
    </div>
    <p>Certifique-se de que sua documentação e proposta estão prontas.</p>
    <a class="btn" href="${BASE_URL}/dashboard">Acessar painel</a>
  `);
  return sendEmail(email, '⏰ Abertura de proposta amanhã — Licitah', html);
}
