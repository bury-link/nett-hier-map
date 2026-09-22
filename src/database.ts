import { Pool } from 'pg';

export type Sighting = { id: string; latitude: number; longitude: number; imageUrl: string; thumbnailUrl: string; createdAt: string };
export type AdminSighting = Sighting & { status: 'active' | 'disabled'; reportCount: number };
export type Report = { id: string; sightingId: string; reason: string; createdAt: string };
type SightingRow = { id: string; latitude: number; longitude: number; image_filename: string; thumbnail_filename: string | null; status: 'active' | 'disabled'; created_at: Date; report_count: number | string };
const baseSelect = `SELECT s.id, s.latitude, s.longitude, s.image_filename, s.thumbnail_filename, s.status, s.created_at, COUNT(r.id) FILTER (WHERE r.status = 'open') AS report_count FROM sightings s LEFT JOIN reports r ON r.sighting_id = s.id`;
function toSighting(row: SightingRow): Sighting { return { id: row.id, latitude: row.latitude, longitude: row.longitude, imageUrl: `/uploads/${encodeURIComponent(row.image_filename)}`, thumbnailUrl: `/uploads/${encodeURIComponent(row.thumbnail_filename ?? row.image_filename)}`, createdAt: row.created_at.toISOString() }; }
export function createDatabase(connectionString: string): Pool { return new Pool({ connectionString }); }
export async function initialiseDatabase(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sightings (id UUID PRIMARY KEY, latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90), longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180), image_filename TEXT NOT NULL, thumbnail_filename TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE sightings ADD COLUMN IF NOT EXISTS thumbnail_filename TEXT;
    ALTER TABLE sightings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    CREATE TABLE IF NOT EXISTS reports (id UUID PRIMARY KEY, sighting_id UUID NOT NULL REFERENCES sightings(id) ON DELETE CASCADE, reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000), status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ);
    CREATE INDEX IF NOT EXISTS sightings_created_at_idx ON sightings (created_at DESC);
    CREATE INDEX IF NOT EXISTS sightings_status_idx ON sightings (status);
    CREATE INDEX IF NOT EXISTS reports_status_created_at_idx ON reports (status, created_at DESC);
  `);
}
export async function listSightings(pool: Pool): Promise<Sighting[]> { const result = await pool.query<SightingRow>(`${baseSelect} WHERE s.status = 'active' GROUP BY s.id ORDER BY s.created_at DESC`); return result.rows.map(toSighting); }
export async function listAdminSightings(pool: Pool): Promise<AdminSighting[]> { const result = await pool.query<SightingRow>(`${baseSelect} GROUP BY s.id ORDER BY s.created_at DESC`); return result.rows.map((row) => ({ ...toSighting(row), status: row.status, reportCount: Number(row.report_count) })); }
export async function listOpenReports(pool: Pool): Promise<Report[]> { const result = await pool.query<{ id: string; sighting_id: string; reason: string; created_at: Date }>(`SELECT id, sighting_id, reason, created_at FROM reports WHERE status = 'open' ORDER BY created_at DESC`); return result.rows.map((row) => ({ id: row.id, sightingId: row.sighting_id, reason: row.reason, createdAt: row.created_at.toISOString() })); }
export async function createReport(pool: Pool, report: { id: string; sightingId: string; reason: string }): Promise<boolean> { const result = await pool.query(`INSERT INTO reports (id, sighting_id, reason) SELECT $1, id, $3 FROM sightings WHERE id = $2 AND status = 'active'`, [report.id, report.sightingId, report.reason]); return result.rowCount === 1; }
export async function resolveReport(pool: Pool, id: string): Promise<boolean> { const result = await pool.query(`UPDATE reports SET status = 'resolved', resolved_at = NOW() WHERE id = $1 AND status = 'open'`, [id]); return result.rowCount === 1; }
export async function findActiveUpload(pool: Pool, filename: string): Promise<string | null> { const result = await pool.query<{ filename: string }>(`SELECT image_filename AS filename FROM sightings WHERE status = 'active' AND image_filename = $1 UNION ALL SELECT thumbnail_filename AS filename FROM sightings WHERE status = 'active' AND thumbnail_filename = $1 LIMIT 1`, [filename]); return result.rows[0]?.filename ?? null; }
export async function setSightingStatus(pool: Pool, id: string, status: 'active' | 'disabled'): Promise<boolean> { const result = await pool.query('UPDATE sightings SET status = $2 WHERE id = $1', [id, status]); return result.rowCount === 1; }
export async function deleteSighting(pool: Pool, id: string): Promise<{ imageFilename: string; thumbnailFilename: string | null } | null> { const result = await pool.query<{ image_filename: string; thumbnail_filename: string | null }>('DELETE FROM sightings WHERE id = $1 RETURNING image_filename, thumbnail_filename', [id]); const row = result.rows[0]; return row ? { imageFilename: row.image_filename, thumbnailFilename: row.thumbnail_filename } : null; }
export async function createSighting(pool: Pool, sighting: { id: string; latitude: number; longitude: number; imageFilename: string; thumbnailFilename: string }): Promise<void> { await pool.query(`INSERT INTO sightings (id, latitude, longitude, image_filename, thumbnail_filename) VALUES ($1, $2, $3, $4, $5)`, [sighting.id, sighting.latitude, sighting.longitude, sighting.imageFilename, sighting.thumbnailFilename]); }
