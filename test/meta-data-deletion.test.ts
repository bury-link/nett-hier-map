import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { verifyMetaSignedRequest } from '../src/lib/meta-data-deletion.js';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
test('verifies Meta signed deletion requests', () => {
  const payload = encode({ algorithm: 'HMAC-SHA256', user_id: 'meta-user' });
  const signature = createHmac('sha256', 'secret').update(payload).digest('base64url');
  assert.equal(verifyMetaSignedRequest(`${signature}.${payload}`, 'secret')?.user_id, 'meta-user');
});
test('rejects tampered Meta signed deletion requests', () => {
  assert.equal(verifyMetaSignedRequest('bad.payload', 'secret'), null);
});
