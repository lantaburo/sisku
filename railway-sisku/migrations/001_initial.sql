CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY,
  source_type text NOT NULL CHECK (source_type IN ('google_sheets', 'json_file')),
  source_ref text NOT NULL,
  source_exported_at timestamptz,
  snapshot_checksum text NOT NULL,
  status text NOT NULL CHECK (status IN ('completed', 'failed')),
  sheet_count integer NOT NULL DEFAULT 0 CHECK (sheet_count >= 0),
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  imported_at timestamptz NOT NULL DEFAULT now(),
  error_message text
);

CREATE UNIQUE INDEX IF NOT EXISTS import_batches_completed_checksum_idx
  ON import_batches (snapshot_checksum)
  WHERE status = 'completed';

CREATE TABLE IF NOT EXISTS import_sheets (
  import_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE RESTRICT,
  sheet_name text NOT NULL,
  headers jsonb NOT NULL,
  row_count integer NOT NULL CHECK (row_count >= 0),
  sheet_checksum text NOT NULL,
  PRIMARY KEY (import_id, sheet_name)
);

CREATE TABLE IF NOT EXISTS legacy_sheet_rows (
  import_id uuid NOT NULL,
  sheet_name text NOT NULL,
  source_row_number integer NOT NULL CHECK (source_row_number >= 2),
  row_values jsonb NOT NULL,
  row_checksum text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (import_id, sheet_name, source_row_number),
  FOREIGN KEY (import_id, sheet_name)
    REFERENCES import_sheets(import_id, sheet_name) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS legacy_sheet_rows_lookup_idx
  ON legacy_sheet_rows (sheet_name, import_id);

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  source_user_id text,
  username text NOT NULL,
  pin_hash text NOT NULL,
  role text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  class_code text NOT NULL DEFAULT '',
  student_nis text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  source_import_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT,
  pin_upgraded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_ci_idx
  ON app_users (lower(username));
CREATE INDEX IF NOT EXISTS app_users_student_nis_idx
  ON app_users (student_nis);

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS user_sessions_active_idx
  ON user_sessions (token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_log_actor_time_idx
  ON audit_log (actor_user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS runtime_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE legacy_sheet_rows IS
  'Snapshot append-only dari Google Sheets. Tidak boleh dipakai sebagai target operasi delete/update aplikasi.';
