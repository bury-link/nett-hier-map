import { createHmac, timingSafeEqual } from 'node:crypto';

const graphVersion = 'v22.0';
const authorizationScopes = ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'];
type Fetch = (url: URL, init?: RequestInit) => Promise<Response>;
type OAuthStatePayload = { nonce: string; expiresAt: number };
export type InstagramConnection = { pageId: string; instagramAccountId: string; username: string | null; accessToken: string };

function sign(payload: string, secret: string): string { return createHmac('sha256', secret).update(payload).digest('base64url'); }
function equal(left: string, right: string): boolean { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }

export function createOAuthState(secret: string, nonce: string, now = Date.now(), lifetimeMs = 10 * 60_000): string {
  const payload = Buffer.from(JSON.stringify({ nonce, expiresAt: now + lifetimeMs } satisfies OAuthStatePayload)).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyOAuthState(value: unknown, secret: string | undefined, nonce: string | undefined, now = Date.now()): boolean {
  if (typeof value !== 'string' || !secret || !nonce) return false;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra || !equal(signature, sign(payload, secret))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthStatePayload;
    return typeof parsed.nonce === 'string' && parsed.nonce === nonce && Number.isSafeInteger(parsed.expiresAt) && parsed.expiresAt > now;
  } catch { return false; }
}

export function buildMetaAuthorizationUrl(input: { appId: string; redirectUri: string; state: string }): string {
  const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  url.search = new URLSearchParams({ client_id: input.appId, redirect_uri: input.redirectUri, response_type: 'code', scope: authorizationScopes.join(','), state: input.state }).toString();
  return url.toString();
}

async function graphJson(url: URL, init: RequestInit | undefined, fetcher: Fetch): Promise<Record<string, unknown>> {
  const response = await fetcher(url, init);
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !body) throw new Error('Meta Graph API request failed.');
  return body;
}

export async function exchangeAuthorizationCode(code: string, appId: string, appSecret: string, redirectUri: string, fetcher: Fetch = (url, init) => fetch(url, init)): Promise<string> {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  url.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }).toString();
  const result = await graphJson(url, undefined, fetcher);
  if (typeof result.access_token !== 'string') throw new Error('Meta OAuth response did not include an access token.');
  return result.access_token;
}

export async function getInstagramConnection(userAccessToken: string, fetcher: Fetch = (url, init) => fetch(url, init)): Promise<InstagramConnection> {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
  url.search = new URLSearchParams({ fields: 'id,access_token,instagram_business_account{id,username}', access_token: userAccessToken }).toString();
  const result = await graphJson(url, undefined, fetcher);
  const page = Array.isArray(result.data) ? result.data.find((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && typeof (entry as Record<string, unknown>).id === 'string' && typeof (entry as Record<string, unknown>).access_token === 'string' && typeof ((entry as Record<string, unknown>).instagram_business_account as Record<string, unknown> | undefined)?.id === 'string') : undefined;
  if (!page) throw new Error('No Facebook Page with a linked Instagram professional account was found.');
  const instagram = page.instagram_business_account as Record<string, unknown>;
  return { pageId: page.id as string, instagramAccountId: instagram.id as string, username: typeof instagram.username === 'string' ? instagram.username : null, accessToken: page.access_token as string };
}

export async function publishInstagramImage(input: { instagramAccountId: string; accessToken: string; imageUrl: string; caption: string }, fetcher: Fetch = (url, init) => fetch(url, init)): Promise<string> {
  const imageUrl = new URL(input.imageUrl);
  if (imageUrl.protocol !== 'https:' || !imageUrl.hostname || imageUrl.username || imageUrl.password) throw new Error('Instagram publishing requires a public HTTPS image URL.');
  const containerUrl = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(input.instagramAccountId)}/media`);
  const container = await graphJson(containerUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ image_url: imageUrl.toString(), caption: input.caption, access_token: input.accessToken }).toString() }, fetcher);
  if (typeof container.id !== 'string') throw new Error('Meta did not create a media container.');
  const publishUrl = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(input.instagramAccountId)}/media_publish`);
  const published = await graphJson(publishUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ creation_id: container.id, access_token: input.accessToken }).toString() }, fetcher);
  if (typeof published.id !== 'string') throw new Error('Meta did not publish the media container.');
  return published.id;
}
