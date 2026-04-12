// Cache de licitações no sessionStorage do browser
// TTL: 5 minutos por chave de busca

const TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  data: any[];
  ts: number; // timestamp
}

function cacheKey(params: Record<string, string>): string {
  // Ordena as chaves para garantir consistência
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `lic_cache:${sorted}`;
}

export function getCached(params: Record<string, string>): any[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = cacheKey(params);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache(params: Record<string, string>, data: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = cacheKey(params);
    const entry: CacheEntry = { data, ts: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage pode estar cheio — ignora silenciosamente
  }
}

export function clearLicitacoesCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith('lic_cache:'));
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch {}
}
