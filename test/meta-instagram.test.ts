import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { buildMetaAuthorizationUrl, createOAuthState, getInstagramConnection, publishInstagramImage, verifyOAuthState } from '../src/lib/meta-instagram.js';

const secret = 'test-state-secret';

test('OAuth state is signed, expires, and is bound to its nonce', () => {
  const state = createOAuthState(secret, 'nonce-value', 1_000, 60_000);
  assert.equal(verifyOAuthState(state, secret, 'nonce-value', 60_999), true);
  assert.equal(verifyOAuthState(state, secret, 'wrong-nonce', 1_001), false);
  assert.equal(verifyOAuthState(`${state}x`, secret, 'nonce-value', 1_001), false);
  assert.equal(verifyOAuthState(state, secret, 'nonce-value', 61_001), false);
});

test('Meta authorization URL uses the configured callback and least required Instagram scopes', () => {
  const url = new URL(buildMetaAuthorizationUrl({ appId: 'app-id', redirectUri: 'https://nett-hier-map.de/api/admin/meta/callback', state: 'signed-state' }));
  assert.equal(url.origin, 'https://www.facebook.com');
  assert.equal(url.searchParams.get('client_id'), 'app-id');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://nett-hier-map.de/api/admin/meta/callback');
  assert.equal(url.searchParams.get('state'), 'signed-state');
  assert.deepEqual(url.searchParams.get('scope')?.split(',').sort(), ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement', 'pages_show_list']);
});

test('connection discovery queries each managed Page for its linked Instagram account', async () => {
  const requests: string[] = [];
  const connection = await getInstagramConnection('short-lived-token', async (url) => {
    requests.push(url.toString());
    if (url.pathname.endsWith('/me/accounts')) return new Response(JSON.stringify({ data: [{ id: 'page-1', access_token: 'page-token' }] }), { status: 200 });
    if (url.pathname.endsWith('/page-1')) return new Response(JSON.stringify({ id: 'page-1', instagram_business_account: { id: 'ig-1', username: 'nett' } }), { status: 200 });
    throw new Error(`Unexpected request: ${url}`);
  });
  assert.deepEqual(connection, { pageId: 'page-1', instagramAccountId: 'ig-1', username: 'nett', accessToken: 'page-token' });
  assert.match(requests[0]!, /\/me\/accounts/);
  assert.match(requests[1]!, /\/page-1/);
});

test('publishing creates a media container then publishes it with a public HTTPS image URL', async () => {
  const requests: Array<{ url: string; body: string }> = [];
  const result = await publishInstagramImage({ instagramAccountId: 'ig-1', accessToken: 'page-token', imageUrl: 'https://nett-hier-map.de/uploads/photo.jpg', caption: 'Nett hier.' }, async (url, init) => {
    requests.push({ url: url.toString(), body: String(init?.body) });
    if (requests.length === 1) return new Response(JSON.stringify({ id: 'container-1' }), { status: 200 });
    if (requests.length === 2) return new Response(JSON.stringify({ status_code: 'FINISHED' }), { status: 200 });
    return new Response(JSON.stringify({ id: 'media-1' }), { status: 200 });
  });
  assert.equal(result, 'media-1');
  assert.match(requests[0]!.body, /image_url=https%3A%2F%2Fnett-hier-map.de%2Fuploads%2Fphoto.jpg/);
  assert.match(requests[2]!.body, /creation_id=container-1/);
});

test('publishing waits for Meta to finish processing its image container', async () => {
  const requests: Array<{ url: string; body: string }> = [];
  const result = await publishInstagramImage(
    { instagramAccountId: 'ig-1', accessToken: 'page-token', imageUrl: 'https://nett-hier-map.de/uploads/photo.jpg', caption: 'Nett hier.' },
    async (url, init) => {
      requests.push({ url: url.toString(), body: String(init?.body) });
      if (requests.length === 1) return new Response(JSON.stringify({ id: 'container-1' }), { status: 200 });
      if (requests.length === 2) return new Response(JSON.stringify({ status_code: 'FINISHED' }), { status: 200 });
      return new Response(JSON.stringify({ id: 'media-1' }), { status: 200 });
    },
  );
  assert.equal(result, 'media-1');
  assert.match(requests[1]!.url, /\/container-1\?fields=status_code/);
  assert.match(requests[2]!.url, /\/media_publish/);
});

test('publishing rejects non-public image URLs before contacting Meta', async () => {
  await assert.rejects(() => publishInstagramImage({ instagramAccountId: 'ig-1', accessToken: 'page-token', imageUrl: 'http://localhost/uploads/photo.jpg', caption: 'Nett hier.' }, async () => new Response('{}')), /public HTTPS/);
});

test('Meta Graph errors retain a safe API code for administrator diagnostics', async () => {
  await assert.rejects(
    () => getInstagramConnection('token', async () => new Response(JSON.stringify({ error: { message: 'The access token is invalid.', code: 190 } }), { status: 400 })),
    /Meta Graph API request failed \(code 190\): The access token is invalid\./,
  );
});
