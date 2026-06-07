/**
 * API client — worker ↔ Next.js communication.
 * All calls use x-worker-secret header for authentication.
 */

const BASE_URL    = process.env.APP_URL!;
const WORKER_SECRET = process.env.WORKER_SECRET!;
const WORKER_ID   = process.env.WORKER_ID || 'worker-1';

const headers = () => ({
  'Content-Type': 'application/json',
  'x-worker-secret': WORKER_SECRET,
});

export interface Job {
  id: number;
  usuario_id: number;
  uasg: string;
  numero_pregao: string;
  item_numero: string | null;
  objeto: string | null;
  preco_minimo: number;
  estrategia: 'agressiva' | 'moderada' | 'conservadora';
  decremento_valor: number | null;
  decremento_pct: number | null;
  cgov_cpf: string;
  cgov_senha: string;
  cgov_cnpj: string;
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${BASE_URL}/api/robo/jobs`, { headers: headers() });
  if (!res.ok) return [];
  const data = await res.json() as { jobs?: Job[] };
  return data.jobs || [];
}

export async function claimJob(id: number): Promise<void> {
  await fetch(`${BASE_URL}/api/robo/sessoes/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ status: 'conectando', worker_id: WORKER_ID }),
  });
}

export async function updateStatus(
  id: number,
  status: string,
  extra: Record<string, any> = {}
): Promise<void> {
  await fetch(`${BASE_URL}/api/robo/sessoes/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ status, ...extra }),
  });
}

export async function heartbeat(id: number): Promise<void> {
  await fetch(`${BASE_URL}/api/robo/sessoes/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({}), // empty body just updates ultimo_heartbeat
  });
}

export async function recordLance(
  sessaoId: number,
  usuarioId: number,
  valor: number,
  tipo: 'automatico' | 'manual',
  contexto: Record<string, any>
): Promise<void> {
  await fetch(`${BASE_URL}/api/robo/sessoes/${sessaoId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ usuario_id: usuarioId, valor, tipo, contexto }),
  });
}

export async function appendLog(id: number, msg: string): Promise<void> {
  const ts = new Date().toISOString();
  await fetch(`${BASE_URL}/api/robo/sessoes/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ log_texto: `[${ts}] ${msg}` }),
  });
}
