/**
 * Cache de licitações — localStorage, TTL 4h, stale-while-revalidate
 *
 * Estratégia:
 *  - Dados são servidos do cache IMEDIATAMENTE (mesmo que stale)
 *  - Revalidação acontece em background sem bloquear a UI
 *  - TTL hard: 4 horas | TTL soft (stale-ok): 4 horas
 *  - Persiste entre sessões (localStorage, não sessionStorage)
 *  - Limite de 20 entradas para não estourar quota
 */

const TTL_MS        = 4 * 60 * 60 * 1000; // 4 horas
const MAX_ENTRIES   = 20;
const PREFIX        = 'lic_v2:';
const LAST_KEY      = 'lic_last_params';

interface CacheEntry {
  data: any[];
  ts: number;
  params: Record<string, string>;
}

// ── Internos ─────────────────────────────────────────────────────────────────

function buildKey(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort()
    .filter(k => params[k])               // ignora chaves vazias
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${PREFIX}${sorted}`;
}

function readEntry(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeEntry(key: string, entry: CacheEntry): void {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Quota cheia — remove a entrada mais antiga e tenta de novo
    evictOldest();
    try { localStorage.setItem(key, JSON.stringify(entry)); } catch {}
  }
}

function evictOldest(): void {
  try {
    const keys = allCacheKeys();
    if (keys.length === 0) return;
    // Ordena por timestamp e remove o mais antigo
    const sorted = keys
      .map(k => ({ k, ts: readEntry(k)?.ts ?? 0 }))
      .sort((a, b) => a.ts - b.ts);
    localStorage.removeItem(sorted[0].k);
  } catch {}
}

function allCacheKeys(): string[] {
  try {
    return Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  } catch {
    return [];
  }
}

function enforceLimit(): void {
  const keys = allCacheKeys();
  if (keys.length <= MAX_ENTRIES) return;
  // Remove os mais antigos até atingir o limite
  const sorted = keys
    .map(k => ({ k, ts: readEntry(k)?.ts ?? 0 }))
    .sort((a, b) => a.ts - b.ts);
  sorted.slice(0, keys.length - MAX_ENTRIES).forEach(({ k }) => {
    try { localStorage.removeItem(k); } catch {}
  });
}

// ── API Pública ───────────────────────────────────────────────────────────────

export interface CacheResult {
  data: any[];
  stale: boolean;   // true = veio do cache expirado (revalidar em bg)
  fresh: boolean;   // true = dentro do TTL
  hit: boolean;     // false = cache miss
}

/**
 * Tenta retornar dados do cache.
 * - fresh:  dentro do TTL     → use, não precisa revalidar
 * - stale:  expirado mas existe → use e revalide em background
 * - miss:   não existe         → busque da API
 */
export function getCacheResult(params: Record<string, string>): CacheResult {
  if (typeof window === 'undefined') return { data: [], stale: false, fresh: false, hit: false };
  const key = buildKey(params);
  const entry = readEntry(key);
  if (!entry) return { data: [], stale: false, fresh: false, hit: false };

  const age = Date.now() - entry.ts;
  const fresh = age < TTL_MS;
  return { data: entry.data, stale: !fresh, fresh, hit: true };
}

/** Atalho: retorna dados se fresh, null se stale/miss */
export function getCached(params: Record<string, string>): any[] | null {
  const r = getCacheResult(params);
  return r.fresh ? r.data : null;
}

/** Salva dados no cache */
export function setCache(params: Record<string, string>, data: any[]): void {
  if (typeof window === 'undefined') return;
  enforceLimit();
  const key = buildKey(params);
  writeEntry(key, { data, ts: Date.now(), params });
  // Persiste os últimos params usados para restauração rápida
  try { localStorage.setItem(LAST_KEY, JSON.stringify(params)); } catch {}
}

/** Retorna os params da última busca (para restauração automática) */
export function getLastParams(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Timestamp da entrada no cache */
export function getCacheTimestamp(params: Record<string, string>): number | null {
  if (typeof window === 'undefined') return null;
  const entry = readEntry(buildKey(params));
  return entry ? entry.ts : null;
}

/** Remove todas as entradas do cache */
export function clearLicitacoesCache(): void {
  if (typeof window === 'undefined') return;
  allCacheKeys().forEach(k => { try { localStorage.removeItem(k); } catch {} });
  try { localStorage.removeItem(LAST_KEY); } catch {}
}
