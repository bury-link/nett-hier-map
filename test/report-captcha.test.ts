import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('internal reports require a completed Friendly Captcha token', () => {
  const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
  const detail = readFileSync(new URL('../src/public/fundort.ts', import.meta.url), 'utf8');
  assert.match(server, /await verifyFriendlyCaptcha\(request\.body\?\.captchaResponse\)/);
  assert.match(detail, /FriendlyCaptchaSDK/);
  assert.match(detail, /captchaResponse/);
});
