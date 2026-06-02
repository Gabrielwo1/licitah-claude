import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-cbc';

function getKey(): Buffer {
  const k = process.env.ROBO_ENCRYPTION_KEY || '';
  if (k.length === 64) return Buffer.from(k, 'hex');
  // Fallback: derive 32 bytes from whatever key is set (dev only)
  return Buffer.from(k.padEnd(32, '0').slice(0, 32));
}

export function encrypt(plain: string): string {
  const iv  = randomBytes(16);
  const key = getKey();
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

export function decrypt(stored: string): string {
  const [ivHex, encHex] = stored.split(':');
  if (!ivHex || !encHex) return '';
  const iv  = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
