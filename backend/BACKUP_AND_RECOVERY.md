# NutriSense AI — Database Backup, Recovery & Storage Architecture

## 1. PostgreSQL Persistence & Migrations
- Primary database: **Neon Serverless PostgreSQL** configured via `DATABASE_URL` in `backend/.env`.
- Schema versioning: **Alembic** (`alembic.ini` + `alembic/versions/`) alongside non-destructive additive `ensure_audit_schema_upgrades(engine)`.
- Commands:
  - Inspect status: `.\\.venv\\Scripts\\alembic.exe current`
  - Apply upgrades: `.\\.venv\\Scripts\\alembic.exe upgrade head`
  - Safe logical snapshot: `.\\.venv\\Scripts\\python.exe backup_db.py`

## 2. Backup & Recovery Strategy
- **Logical Snapshot Script (`backup_db.py`)**: Exports all tables and row counts into gzipped JSON under `backend/backups/`. Note: these local backups live on the host filesystem unless pushed to off-site object storage (S3/R2/GCS).
- **Neon Cloud Backups (External Managed Provider)**: Neon maintains continuous WAL branch/restore history according to your Neon plan retention window. Verify point-in-time recovery limits directly in your Neon Console.
- **Recommended Production Schedule**:
  - Daily automated logical dump or Neon snapshot retention (14–30 days).
  - Pre-migration snapshot (`python backup_db.py` + Neon branch) before any schema migration.
  - Quarterly restore test into a scratch staging Neon branch to confirm recoverability.

## 3. Uploaded Meal Photos (`private_uploads/` vs Production Object Storage)
- Authenticated meal photos are currently saved inside `backend/private_uploads/` with metadata in PostgreSQL `uploaded_files` (`sha256_hex`, `mime_type`, `user_id`, `is_private = True`) and served **only** through owner-checked `GET /api/uploads/{file_key}`.
- **Production Warning**: Ephemeral container platforms (Render free/standard containers, Heroku dynos, Cloud Run) wipe local disk on redeploy or restart. For multi-instance / cloud deployments, configure an S3-compatible bucket (AWS S3 / Cloudflare R2 / GCS) with server-side encryption, private ACLs, and pre-signed / proxied owner-checked retrieval.
