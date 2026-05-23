# GCP Persistence

ChessAlive uses the realtime server as the persistence boundary. The browser keeps a local cache for speed, but permanent writes should go through the server.

## Chosen Free-Tier Services

- Firestore in Native mode: durable metadata, player settings, puzzle progress, animation set configuration, event streams, and lightweight key/value state.
- Cloud Storage: uploaded GLB, GLTF, PNG, JPG, and WEBP assets.

Do not store GLB files inside Firestore. Firestore stores the asset metadata and Cloud Storage stores the binary object.

## Environment Variables

Set these on the realtime server:

```bash
CHESSALIVE_GCP_PERSISTENCE=1
CHESSALIVE_GCP_PROJECT_ID=<gcp-project-id>
CHESSALIVE_GCS_BUCKET=<bucket-name>
CHESSALIVE_FIRESTORE_PREFIX=chessalive
```

Authentication should use Google Application Default Credentials:

- On a GCP VM, attach a service account with Firestore and Cloud Storage permissions.
- Locally, set `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/service-account.json`.

Optional:

```bash
CHESSALIVE_GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/<bucket-name>
```

If this is not set, uploaded assets are served through the realtime server at `/uploads/<file>`.

## What Is Persisted

- Admin-created piece sets, animation clips, and animation sets.
- User settings and signed-in user profile cache.
- Puzzle rating state and puzzle attempts.
- Generic service key/value records such as saved game snapshots.
- Event streams such as chat, ads, auth, and server events.
- GLB/image asset uploads and metadata.

## Local Development

If GCP environment variables are missing, the server falls back to local JSON files and local uploaded files under `apps/realtime-server/data`. This is only a development fallback, not production storage.
