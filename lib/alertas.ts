import sql from '@/lib/db';

export async function createNotificacao(
  userId: number,
  cabecalho: string,
  body: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO notificacoes
        (notificacao_cabecalho, notificacao_body, notificacao_destinatario, notificacao_data, notificacao_lido)
      VALUES (${cabecalho}, ${body}, ${userId}, NOW(), 0)
    `;
  } catch { /* best-effort */ }
}

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const url      = process.env.WHATSAPP_URL;
  const token    = process.env.WHATSAPP_TOKEN;
  const instance = process.env.WHATSAPP_INSTANCE;

  if (!url || !token || !instance || !phone) return false;

  const number = phone.replace(/\D/g, '');
  if (number.length < 10) return false;

  try {
    const res = await fetch(`${url}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: token },
      body: JSON.stringify({ number, textMessage: { text: message } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
