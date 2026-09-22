# Nett Hier Map

A Node.js and TypeScript MVP for recording and browsing photo sightings of the Baden-Württemberg „Nett hier“ sticker.

## Local development

```bash
npm install
DATABASE_URL=postgres://netthier:netthier@localhost:5432/netthier npm run dev
```

The API uses `POST /api/sightings` with multipart fields `photo`, `latitude`, and `longitude`. Manual coordinates take precedence over EXIF GPS data. `GET /api/sightings` returns the public markers.

## Container deployment

Use `compose.portainer.yaml` with a non-empty `POSTGRES_PASSWORD` environment variable. The app exposes port `3000` inside the container and host port `8091` in the provided stack. Images and PostgreSQL data use named volumes.

Before public release, add moderation, reporting/removal, a privacy policy, and a legal review of the name and campaign references.
