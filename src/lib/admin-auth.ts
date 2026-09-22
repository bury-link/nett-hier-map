import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type AdminSession = { token: string; expiresAt: number };

export function verifyAdminCredentials(username: unknown, password: unknown, expectedUsername: string | undefined, expectedPassword: string | undefined): boolean {
  if (typeof username !== 'string' || typeof password !== 'string' || !expectedUsername || !expectedPassword) return false;
  const provided = Buffer.from(`${username}\0${password}`);
  const expected = Buffer.from(`${expectedUsername}\0${expectedPassword}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function createAdminSession(secret: string, now = Date.now()): AdminSession {
  const expiresAt = now + 8 * 60 * 60 * 1000;
  const nonce = randomBytes(24).toString('base64url');
  const payload = `${nonce}.${expiresAt}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return { token: `${payload}.${signature}`, expiresAt };
}

export function verifyAdminSession(token: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!token || !secret) return false;
  const [nonce, expiry, signature, extra] = token.split('.');
  if (!nonce || !expiry || !signature || extra || !/^\d+$/.test(expiry) || Number(expiry) < now) return false;
  const payload = `${nonce}.${expiry}`;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function parseCookie(header: string | undefined, name: string): string | undefined {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
