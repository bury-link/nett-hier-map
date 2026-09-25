import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptToken, encryptToken } from '../src/lib/token-vault.js';

test('stored Meta tokens are authenticated encrypted and reject tampering', () => {
  const encrypted = encryptToken('page-token', 'encryption-secret');
  assert.notEqual(encrypted, 'page-token');
  assert.equal(decryptToken(encrypted, 'encryption-secret'), 'page-token');
  assert.throws(() => decryptToken(`${encrypted}x`, 'encryption-secret'));
});
