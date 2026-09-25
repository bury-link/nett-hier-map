import { createHmac, timingSafeEqual } from 'node:crypto';

type MetaDeletionPayload = { algorithm?: string; user_id?: string };

export function verifyMetaSignedRequest(value: unknown, secret: string | undefined): MetaDeletionPayload | null {
  if (typeof value !== 'string' || !secret) return null;
  const [signature, payload] = value.split('.');
  if (!signature || !payload) return null;
  const received = Buffer.from(signature, 'base64url');
  const expected = createHmac('sha256', secret).update(payload).digest();
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as MetaDeletionPayload;
    return decoded.algorithm === 'HMAC-SHA256' && typeof decoded.user_id === 'string' ? decoded : null;
  } catch { return null; }
}
