import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('deployment requires the public HTTPS base URL and Meta OAuth credentials without embedding secrets', () => {
  const compose = readFileSync(new URL('../compose.portainer.yaml', import.meta.url), 'utf8');
  assert.match(compose, /PUBLIC_BASE_URL: \$\{PUBLIC_BASE_URL:\?set PUBLIC_BASE_URL\}/);
  assert.match(compose, /META_APP_ID: \$\{META_APP_ID:\?set META_APP_ID\}/);
  assert.match(compose, /META_APP_SECRET: \$\{META_APP_SECRET:\?set META_APP_SECRET\}/);
  assert.match(compose, /META_TOKEN_ENCRYPTION_SECRET: \$\{META_TOKEN_ENCRYPTION_SECRET:\?set META_TOKEN_ENCRYPTION_SECRET\}/);
});
