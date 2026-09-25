import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { claimInstagramPublication, completeInstagramPublication, createDatabase, createInstagramPublication, createReport, createSighting, deleteSighting, failInstagramPublication, findActiveUpload, getSavedInstagramConnection, initialiseDatabase, listAdminSightings, listOpenReports, listSightings, listSightingsMissingLocationDescriptions, resolveReport, saveInstagramConnection, setInstagramPublicationStatus, setLocationDescription, setSightingStatus } from './database.js';
import { createAdminSession, parseCookie, verifyAdminCredentials, verifyAdminSession } from './lib/admin-auth.js';
import { readEmbeddedCoordinates } from './lib/image-metadata.js';
import { validateSubmissionWithSource } from './lib/submission.js';
import { createThumbnail, normalizeUploadImage } from './lib/thumbnail.js';
import { createUploadRateLimiter } from './lib/upload-rate-limit.js';
import { verifyMetaSignedRequest } from './lib/meta-data-deletion.js';
import { buildMetaAuthorizationUrl, createOAuthState, exchangeAuthorizationCode, getInstagramConnection, publishInstagramImage, verifyOAuthState } from './lib/meta-instagram.js';
import { decryptToken, encryptToken } from './lib/token-vault.js';
import { requirePublicHttpsBaseUrl } from './lib/public-url.js';
import { resolveLocationDescription } from './lib/location-description.js';

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://netthier:***@localhost:5432/netthier';
const uploadDirectory = process.env.UPLOAD_DIRECTORY ?? path.resolve('data/uploads');
const publicDirectory = path.resolve('dist/public');
const temporaryDirectory = path.resolve('data/tmp');
const friendlyCaptchaApiKey = process.env.FRIENDLYCAPTCHA_API_KEY;
const friendlyCaptchaSiteKey = process.env.FRIENDLYCAPTCHA_SITE_KEY ?? 'FCMS82ULRDPS8F43';
const adminUsername = process.env.NETTHIER_ADMIN_USERNAME;
const adminPassword = process.env.NETTHIER_ADMIN_PASSWORD;
const adminSessionSecret = process.env.NETTHIER_SESSION_SECRET;
const metaAppId = process.env.META_APP_ID;
const metaAppSecret = process.env.META_APP_SECRET;
const metaTokenEncryptionSecret = process.env.META_TOKEN_ENCRYPTION_SECRET;
const publicBaseUrl = requirePublicHttpsBaseUrl(process.env.PUBLIC_BASE_URL ?? 'https://nett-hier-map.de');
const metaOAuthRedirectUri = `${publicBaseUrl}/api/admin/meta/callback`;
const sessionCookieName = 'netthier_admin_session';
const metaOAuthCookieName = 'netthier_meta_oauth_nonce';
const uploadRateLimiter = createUploadRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });
const loginRateLimiter = createUploadRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });
const reportRateLimiter = createUploadRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

const pause = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function queueLocationDescription(id: string, latitude: number, longitude: number): Promise<void> {
  try {
    const locationDescription = await resolveLocationDescription(latitude, longitude);
    if (locationDescription) await setLocationDescription(database, id, locationDescription.value, locationDescription.interpreted);
  } catch (error) {
    console.warn(`Location description lookup failed for sighting ${id}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}
async function backfillMissingLocationDescriptions(): Promise<void> {
  const sightings = await listSightingsMissingLocationDescriptions(database);
  for (const sighting of sightings) {
    await queueLocationDescription(sighting.id, sighting.latitude, sighting.longitude);
    await pause(1_100);
  }
}

for (const directory of [uploadDirectory, temporaryDirectory]) {
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
}

const upload = multer({
  dest: temporaryDirectory,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith('image/')),
});
const metadataUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith('image/')),
});

const database = createDatabase(databaseUrl);
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.use(express.json({ limit: '20kb' }));

async function verifyFriendlyCaptcha(responseToken: unknown): Promise<void> {
  if (!friendlyCaptchaApiKey) throw new Error('Der Uploadschutz ist noch nicht eingerichtet.');
  if (typeof responseToken !== 'string' || responseToken.length === 0) throw new Error('Bitte schließe den Bot-Schutz ab.');
  const verification = await fetch('https://global.frcapi.com/api/v2/captcha/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': friendlyCaptchaApiKey },
    body: JSON.stringify({ response: responseToken, sitekey: friendlyCaptchaSiteKey }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await verification.json().catch(() => null) as { success?: boolean } | null;
  if (!verification.ok || !result?.success) throw new Error('Der Bot-Schutz konnte nicht bestätigt werden. Bitte versuche es erneut.');
}

function limitUpload(request: express.Request, response: express.Response, next: express.NextFunction): void {
  const result = uploadRateLimiter.check(request.ip || 'unknown');
  if (result.allowed) return next();
  response.setHeader('Retry-After', result.retryAfterSeconds);
  response.status(429).json({ error: `Zu viele Uploadversuche. Bitte versuche es in ${result.retryAfterSeconds} Sekunden erneut.` });
}

function requireAdmin(request: express.Request, response: express.Response, next: express.NextFunction): void {
  const token = parseCookie(request.headers.cookie, sessionCookieName);
  if (!verifyAdminSession(token, adminSessionSecret)) {
    response.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
  next();
}

function uploadPath(filename: string): string {
  if (path.basename(filename) !== filename) throw new Error('Ungültiger Dateiname.');
  return path.join(uploadDirectory, filename);
}

app.get('/api/health', async (_request, response) => {
  await database.query('SELECT 1');
  response.json({ status: 'ok' });
});

app.post('/api/meta/data-deletion', (request, response) => {
  const payload = verifyMetaSignedRequest(request.body?.signed_request, metaAppSecret);
  if (!payload) return response.status(400).json({ error: 'Ungültige Meta-Löschanfrage.' });
  const confirmationCode = randomUUID().replaceAll('-', '');
  return response.json({ url: `https://nett-hier-map.de/datenloeschung.html?confirmation_code=${confirmationCode}`, confirmation_code: confirmationCode });
});

app.get('/uploads/:filename', async (request, response, next) => {
  try {
    const filename = String(request.params.filename);
    if (await findActiveUpload(database, filename) === null) return response.sendStatus(404);
    return response.sendFile(uploadPath(filename), { maxAge: '7d', immutable: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/sightings', async (_request, response, next) => {
  try { response.json({ sightings: await listSightings(database) }); } catch (error) { next(error); }
});

app.post('/api/photo-location', metadataUpload.single('photo'), async (request, response, next) => {
  try {
    if (!request.file) throw new Error('Please choose an image file.');
    const coordinates = await readEmbeddedCoordinates(request.file.buffer);
    response.json(coordinates ?? { latitude: null, longitude: null });
  } catch (error) { next(error); }
});

app.post('/api/sightings', limitUpload, upload.single('photo'), async (request, response, next) => {
  const temporaryFile = request.file?.path;
  let filename: string | undefined;
  let thumbnailFilename: string | undefined;
  try {
    if (!request.file) throw new Error('Please choose an image file.');
    await verifyFriendlyCaptcha(request.body['frc-captcha-response']);
    const sourceBuffer = readFileSync(temporaryFile!);
    const exif = await readEmbeddedCoordinates(sourceBuffer);
    const coordinates = validateSubmissionWithSource(request.body, exif);
    const normalizedImage = await normalizeUploadImage(sourceBuffer);
    filename = `${randomUUID()}.jpg`;
    thumbnailFilename = `${randomUUID()}.jpg`;
    await writeFile(uploadPath(filename), normalizedImage);
    await createThumbnail(uploadPath(filename), uploadPath(thumbnailFilename));
    const id = randomUUID();
    const instagramConsent = request.body.instagramConsent === 'yes';
    await createSighting(database, { id, ...coordinates, imageFilename: filename, thumbnailFilename, instagramConsent });
    if (instagramConsent) await createInstagramPublication(database, id);
    void queueLocationDescription(id, coordinates.latitude, coordinates.longitude);
    response.status(201).json({ id, ...coordinates, imageUrl: `/uploads/${filename}`, thumbnailUrl: `/uploads/${thumbnailFilename}` });
  } catch (error) {
    for (const generatedFile of [filename, thumbnailFilename]) if (generatedFile && existsSync(uploadPath(generatedFile))) rmSync(uploadPath(generatedFile));
    next(error);
  } finally {
    if (temporaryFile && existsSync(temporaryFile)) rmSync(temporaryFile);
  }
});

app.post('/api/reports', async (request, response, next) => {
  try {
    const rate = reportRateLimiter.check(request.ip || 'unknown');
    if (!rate.allowed) return response.status(429).json({ error: 'Zu viele Meldungen. Bitte später erneut versuchen.' });
    await verifyFriendlyCaptcha(request.body?.captchaResponse);
    const sightingId = request.body?.sightingId;
    const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
    if (typeof sightingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sightingId) || reason.length < 5 || reason.length > 1000) return response.status(400).json({ error: 'Bitte beschreibe den Grund der Meldung in 5 bis 1.000 Zeichen.' });
    if (!await createReport(database, { id: randomUUID(), sightingId, reason })) return response.status(404).json({ error: 'Dieser Fundort ist nicht verfügbar.' });
    return response.status(201).json({ status: 'received' });
  } catch (error) { next(error); }
});

app.post('/api/admin/login', (request, response) => {
  const rate = loginRateLimiter.check(request.ip || 'unknown');
  if (!rate.allowed) return response.status(429).json({ error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' });
  if (!verifyAdminCredentials(request.body?.username, request.body?.password, adminUsername, adminPassword) || !adminSessionSecret) {
    return response.status(401).json({ error: 'Benutzername oder Passwort ist nicht korrekt.' });
  }
  const session = createAdminSession(adminSessionSecret);
  response.cookie(sessionCookieName, session.token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: session.expiresAt - Date.now() });
  return response.status(204).end();
});

app.post('/api/admin/logout', requireAdmin, (_request, response) => {
  response.clearCookie(sessionCookieName, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
  response.status(204).end();
});
app.get('/api/admin/session', requireAdmin, (_request, response) => response.json({ authenticated: true, username: adminUsername }));
app.get('/api/admin/meta/connect', requireAdmin, (_request, response) => {
  if (!metaAppId || !metaAppSecret || !adminSessionSecret || !metaTokenEncryptionSecret) return response.status(503).json({ error: 'Instagram-Verbindung ist nicht eingerichtet.' });
  const nonce = randomBytes(32).toString('base64url');
  const state = createOAuthState(adminSessionSecret, nonce);
  response.cookie(metaOAuthCookieName, nonce, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/admin/meta/callback', maxAge: 10 * 60_000 });
  return response.redirect(302, buildMetaAuthorizationUrl({ appId: metaAppId, redirectUri: metaOAuthRedirectUri, state }));
});
app.get('/api/admin/meta/callback', async (request, response) => {
  const nonce = parseCookie(request.headers.cookie, metaOAuthCookieName);
  response.clearCookie(metaOAuthCookieName, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/admin/meta/callback' });
  if (!verifyOAuthState(request.query.state, adminSessionSecret, nonce) || typeof request.query.code !== 'string' || request.query.error) return response.redirect('/admin?meta=failed');
  if (!metaAppId || !metaAppSecret || !metaTokenEncryptionSecret) return response.redirect('/admin?meta=failed');
  try {
    const userAccessToken = await exchangeAuthorizationCode(request.query.code, metaAppId, metaAppSecret, metaOAuthRedirectUri);
    const connection = await getInstagramConnection(userAccessToken);
    await saveInstagramConnection(database, { ...connection, accessToken: encryptToken(connection.accessToken, metaTokenEncryptionSecret!) });
    return response.redirect('/admin?meta=connected');
  } catch (error) {
    console.error('Meta OAuth connection failed:', error instanceof Error ? error.message : 'Unknown Meta OAuth error');
    return response.redirect('/admin?meta=failed');
  }
});
app.get('/api/admin/meta/status', requireAdmin, async (_request, response, next) => {
  try { const connection = await getSavedInstagramConnection(database); return response.json({ connected: Boolean(connection), username: connection?.username ?? null }); } catch (error) { next(error); }
});
app.post('/api/admin/sightings/:id/instagram/approve', requireAdmin, async (request, response, next) => {
  try { if (!await setInstagramPublicationStatus(database, String(request.params.id), 'approved', typeof request.body?.caption === 'string' ? request.body.caption.trim().slice(0, 2_200) : null)) return response.sendStatus(404); return response.status(204).end(); } catch (error) { next(error); }
});
app.post('/api/admin/sightings/:id/instagram/reject', requireAdmin, async (request, response, next) => {
  try { if (!await setInstagramPublicationStatus(database, String(request.params.id), 'rejected')) return response.sendStatus(404); return response.status(204).end(); } catch (error) { next(error); }
});
app.post('/api/admin/sightings/:id/instagram/publish', requireAdmin, async (request, response, next) => {
  const sightingId = String(request.params.id);
  try {
    const publication = await claimInstagramPublication(database, sightingId);
    if (!publication) return response.status(409).json({ error: 'Diese Sichtung ist nicht zur Veröffentlichung freigegeben.' });
    const connection = await getSavedInstagramConnection(database);
    if (!connection || !metaTokenEncryptionSecret) { await failInstagramPublication(database, sightingId, 'Instagram account is not connected.'); return response.status(409).json({ error: 'Instagram-Konto ist nicht verbunden.' }); }
    const imageUrl = new URL(`/uploads/${encodeURIComponent(publication.imageFilename)}`, publicBaseUrl).toString();
    const detailUrl = new URL(`/fundort.html?id=${encodeURIComponent(publication.sightingId)}`, publicBaseUrl).toString();
    const caption = publication.caption ?? `Nett hier.\n\nFundort auf der Karte:\n${detailUrl}`;
    const mediaId = await publishInstagramImage({ instagramAccountId: connection.instagramAccountId, accessToken: decryptToken(connection.accessToken, metaTokenEncryptionSecret), imageUrl, caption });
    await completeInstagramPublication(database, sightingId, mediaId);
    return response.status(204).end();
  } catch (error) {
    await failInstagramPublication(database, sightingId, error instanceof Error ? error.message : 'Meta publication failed.');
    next(error);
  }
});
app.get('/api/admin/sightings', requireAdmin, async (_request, response, next) => {
  try { response.json({ sightings: await listAdminSightings(database) }); } catch (error) { next(error); }
});
app.get('/api/admin/reports', requireAdmin, async (_request, response, next) => {
  try { response.json({ reports: await listOpenReports(database) }); } catch (error) { next(error); }
});
app.post('/api/admin/reports/:id/resolve', requireAdmin, async (request, response, next) => {
  try { if (!await resolveReport(database, String(request.params.id))) return response.sendStatus(404); return response.status(204).end(); } catch (error) { next(error); }
});
app.post('/api/admin/sightings/:id/deactivate', requireAdmin, async (request, response, next) => {
  try {
    if (!await setSightingStatus(database, String(request.params.id), 'disabled')) return response.sendStatus(404);
    return response.status(204).end();
  } catch (error) { next(error); }
});
app.post('/api/admin/sightings/:id/reactivate', requireAdmin, async (request, response, next) => {
  try {
    if (!await setSightingStatus(database, String(request.params.id), 'active')) return response.sendStatus(404);
    return response.status(204).end();
  } catch (error) { next(error); }
});
app.delete('/api/admin/sightings/:id', requireAdmin, async (request, response, next) => {
  try {
    const deleted = await deleteSighting(database, String(request.params.id));
    if (!deleted) return response.sendStatus(404);
    for (const filename of [deleted.imageFilename, deleted.thumbnailFilename]) {
      if (filename && existsSync(uploadPath(filename))) rmSync(uploadPath(filename));
    }
    return response.status(204).end();
  } catch (error) { next(error); }
});

app.get('/admin', (_request, response) => response.sendFile(path.join(publicDirectory, 'admin.html')));
app.use(express.static(publicDirectory));
app.get('*splat', (_request, response) => response.sendFile(path.join(publicDirectory, 'index.html')));
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'The request could not be completed.';
  response.status(400).json({ error: message });
});

await initialiseDatabase(database);
void backfillMissingLocationDescriptions();
app.listen(port, () => console.log(`Nett Hier Map running on port ${port}`));
