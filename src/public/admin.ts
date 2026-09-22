type Sighting = { id: string; latitude: number; longitude: number; imageUrl: string; thumbnailUrl: string; createdAt: string; status: 'active' | 'disabled'; reportCount: number };
type Report = { id: string; sightingId: string; reason: string; createdAt: string };
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const loginView = byId<HTMLElement>('login-view'); const adminView = byId<HTMLElement>('admin-view'); const list = byId<HTMLElement>('admin-list'); const reportList = byId<HTMLElement>('report-list'); const loginStatus = byId<HTMLElement>('login-status'); const adminStatus = byId<HTMLElement>('admin-status'); const logout = byId<HTMLButtonElement>('logout');
function setStatus(element: HTMLElement, message = '', state = ''): void { element.textContent = message; element.dataset.state = state; } function date(value: string): string { return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
async function request(url: string, options: RequestInit = {}): Promise<Response> { return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) }, credentials: 'same-origin' }); }
function renderSightings(sightings: Sighting[]): void { list.replaceChildren(); if (!sightings.length) { list.textContent = 'Keine Sichtungen vorhanden.'; return; } for (const sighting of sightings) { const card = document.createElement('article'); card.className = 'admin-card'; card.innerHTML = `<img src="${sighting.thumbnailUrl}" alt="Vorschau der Sichtung" /><div><p class="admin-state" data-state="${sighting.status}">${sighting.status === 'active' ? 'Öffentlich sichtbar' : 'Deaktiviert'}</p><time>${date(sighting.createdAt)}</time><p>${sighting.latitude.toFixed(5)}, ${sighting.longitude.toFixed(5)}</p><p class="admin-report-count">${sighting.reportCount ? `${sighting.reportCount} offene Meldung${sighting.reportCount === 1 ? '' : 'en'}` : 'Keine offenen Meldungen'}</p><div class="admin-actions"></div></div>`; const actions = card.querySelector<HTMLElement>('.admin-actions')!; const toggle = document.createElement('button'); toggle.className = 'secondary-button'; toggle.type = 'button'; toggle.textContent = sighting.status === 'active' ? 'Deaktivieren' : 'Reaktivieren'; toggle.addEventListener('click', async () => { await mutate(`/api/admin/sightings/${encodeURIComponent(sighting.id)}/${sighting.status === 'active' ? 'deactivate' : 'reactivate'}`, { method: 'POST' }); }); const remove = document.createElement('button'); remove.className = 'admin-delete'; remove.type = 'button'; remove.textContent = 'Endgültig löschen'; remove.addEventListener('click', async () => { if (window.confirm('Diese Sichtung einschließlich aller Meldungen, Originalbild und Vorschau endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) await mutate(`/api/admin/sightings/${encodeURIComponent(sighting.id)}`, { method: 'DELETE' }); }); actions.append(toggle, remove); list.append(card); } }
function renderReports(reports: Report[]): void {
  reportList.replaceChildren();
  if (!reports.length) { reportList.textContent = 'Keine offenen Meldungen.'; return; }
  for (const report of reports) {
    const item = document.createElement('article');
    item.className = 'admin-report';
    const content = document.createElement('div');
    const reportedAt = document.createElement('time');
    reportedAt.textContent = date(report.createdAt);
    const reason = document.createElement('p');
    reason.textContent = report.reason;
    const link = document.createElement('a');
    link.href = `/fundort.html?id=${encodeURIComponent(report.sightingId)}`;
    link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Fundort öffnen ↗';
    const resolve = document.createElement('button');
    resolve.className = 'secondary-button'; resolve.type = 'button'; resolve.textContent = 'Meldung erledigen';
    resolve.addEventListener('click', async () => { await mutate(`/api/admin/reports/${encodeURIComponent(report.id)}/resolve`, { method: 'POST' }); });
    content.append(reportedAt, reason, link); item.append(content, resolve); reportList.append(item);
  }
}
async function load(): Promise<void> { const [sightingResponse, reportResponse] = await Promise.all([request('/api/admin/sightings'), request('/api/admin/reports')]); if (!sightingResponse.ok || !reportResponse.ok) throw new Error('Die Verwaltungsdaten konnten nicht geladen werden.'); renderSightings((await sightingResponse.json() as { sightings: Sighting[] }).sightings); renderReports((await reportResponse.json() as { reports: Report[] }).reports); }
async function mutate(url: string, options: RequestInit): Promise<void> { try { const response = await request(url, options); if (!response.ok) throw new Error(); setStatus(adminStatus, 'Änderung gespeichert.', 'success'); await load(); } catch { setStatus(adminStatus, 'Die Änderung konnte nicht gespeichert werden.', 'error'); } }
async function showAdmin(): Promise<void> { try { const response = await request('/api/admin/session'); if (!response.ok) throw new Error(); loginView.hidden = true; adminView.hidden = false; logout.hidden = false; await load(); } catch { loginView.hidden = false; adminView.hidden = true; logout.hidden = true; } }
byId<HTMLFormElement>('login-form').addEventListener('submit', async (event) => { event.preventDefault(); setStatus(loginStatus, 'Anmeldung wird geprüft …'); const response = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: byId<HTMLInputElement>('username').value, password: byId<HTMLInputElement>('password').value }) }); if (!response.ok) { setStatus(loginStatus, 'Anmeldung nicht möglich.', 'error'); return; } setStatus(loginStatus); await showAdmin(); }); logout.addEventListener('click', async () => { await request('/api/admin/logout', { method: 'POST' }); await showAdmin(); }); void showAdmin();
