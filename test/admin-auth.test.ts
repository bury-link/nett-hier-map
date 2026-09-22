import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminSession, parseCookie, verifyAdminCredentials, verifyAdminSession } from '../src/lib/admin-auth.js';

test('admin credentials require a complete exact match', () => {
  assert.equal(verifyAdminCredentials('admin', 'correct', 'admin', 'correct'), true);
  assert.equal(verifyAdminCredentials('admin', 'wrong', 'admin', 'correct'), false);
  assert.equal(verifyAdminCredentials('other', 'correct', 'admin', 'correct'), false);
});

test('signed admin session expires and rejects tampering', () => {
  const session = createAdminSession('session-secret', 1_000);
  assert.equal(verifyAdminSession(session.token, 'session-secret', 1_001), true);
  assert.equal(verifyAdminSession(`${session.token}x`, 'session-secret', 1_001), false);
  assert.equal(verifyAdminSession(session.token, 'session-secret', session.expiresAt + 1), false);
});

test('cookie parser returns the named admin cookie only', () => {
  assert.equal(parseCookie('other=a; netthier_admin_session=token; x=y', 'netthier_admin_session'), 'token');
});
