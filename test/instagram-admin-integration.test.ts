import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/public/admin.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/public/admin.html', import.meta.url), 'utf8');

test('admin OAuth callback validates signed state and stores the server-side token connection', () => {
  assert.match(server, /app\.get\('\/api\/admin\/meta\/connect', requireAdmin/);
  assert.match(server, /createOAuthState\(adminSessionSecret, nonce\)/);
  assert.match(server, /sameSite: 'lax'/);
  assert.match(server, /verifyOAuthState\(request\.query\.state, adminSessionSecret, nonce\)/);
  assert.match(server, /exchangeAuthorizationCode\(request\.query\.code, metaAppId, metaAppSecret/);
  assert.match(server, /await saveInstagramConnection\(database, \{ \.\.\.connection, accessToken: encryptToken\(connection\.accessToken, metaTokenEncryptionSecret!\) \}\)/);
});

test('admin interface connects Meta and moderates opted-in publications', () => {
  assert.match(page, /id="meta-connect"/);
  assert.match(page, /\/api\/admin\/meta\/connect/);
  assert.match(admin, /instagramConsent/);
  assert.match(admin, /\/instagram\/approve/);
  assert.match(admin, /\/instagram\/reject/);
  assert.match(admin, /\/instagram\/publish/);
});

test('only approved active queue items are published through Meta with a public upload URL', () => {
  assert.match(server, /claimInstagramPublication\(database, sightingId\)/);
  assert.match(server, /new URL\(`\/uploads\/\$\{encodeURIComponent\(publication\.imageFilename\)\}`, publicBaseUrl\)/);
  assert.match(server, /publishInstagramImage/);
  assert.match(server, /completeInstagramPublication\(database, sightingId, mediaId\)/);
});
