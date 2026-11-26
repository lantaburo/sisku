ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS native_managed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS school_subjects (
  code text PRIMARY KEY,
  name text NOT NULL,
  subject_group text NOT NULL DEFAULT 'Umum',
  active boolean NOT NULL DEFAULT true,
  source_import_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_subjects_code_ci_idx
  ON school_subjects (lower(code));

CREATE TABLE IF NOT EXISTS school_classes (
  code text PRIMARY KEY,
  name text NOT NULL,
  homeroom_name text NOT NULL DEFAULT '-',
  capacity integer NOT NULL DEFAULT 30 CHECK (capacity BETWEEN 1 AND 200),
  active boolean NOT NULL DEFAULT true,
  source_import_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_classes_code_ci_idx
  ON school_classes (lower(code));

CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  nip text NOT NULL UNIQUE,
  subjects text NOT NULL DEFAULT '',
  homeroom_class text NOT NULL DEFAULT '-',
  active boolean NOT NULL DEFAULT true,
  source_import_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_questions (
  id text PRIMARY KEY,
  subject text NOT NULL,
  class_code text NOT NULL,
  cognitive_level text NOT NULL DEFAULT 'C3',
  competency text NOT NULL DEFAULT '',
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer_key text NOT NULL DEFAULT '',
  approval_status text NOT NULL DEFAULT 'Menunggu Approval Kepsek',
  question_type text NOT NULL DEFAULT 'PG',
  revision_note text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  creator_username text NOT NULL DEFAULT '',
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  source_timestamp text NOT NULL DEFAULT '',
  source_import_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_questions_scope_idx
  ON school_questions (subject, class_code, approval_status) WHERE active = true;

WITH latest AS (
  SELECT id FROM import_batches WHERE status = 'completed' ORDER BY imported_at DESC LIMIT 1
)
INSERT INTO school_subjects(code, name, subject_group, source_import_id)
SELECT DISTINCT ON (lower(trim(r.row_values ->> 0)))
       trim(r.row_values ->> 0), trim(r.row_values ->> 1), coalesce(nullif(trim(r.row_values ->> 2), ''), 'Umum'), r.import_id
  FROM legacy_sheet_rows r JOIN latest l ON l.id = r.import_id
 WHERE lower(r.sheet_name) = lower('Master_Mapel')
   AND trim(coalesce(r.row_values ->> 0, '')) <> ''
   AND trim(coalesce(r.row_values ->> 1, '')) <> ''
 ORDER BY lower(trim(r.row_values ->> 0)), r.source_row_number DESC
ON CONFLICT DO NOTHING;

WITH latest AS (
  SELECT id FROM import_batches WHERE status = 'completed' ORDER BY imported_at DESC LIMIT 1
)
INSERT INTO school_classes(code, name, homeroom_name, capacity, source_import_id)
SELECT DISTINCT ON (lower(trim(r.row_values ->> 0)))
       trim(r.row_values ->> 0), trim(r.row_values ->> 1), coalesce(nullif(trim(r.row_values ->> 2), ''), '-'),
       CASE WHEN coalesce(r.row_values ->> 3, '') ~ '^\d+$' THEN greatest(1, least(200, (r.row_values ->> 3)::integer)) ELSE 30 END,
       r.import_id
  FROM legacy_sheet_rows r JOIN latest l ON l.id = r.import_id
 WHERE lower(r.sheet_name) = lower('Master_Kelas')
   AND trim(coalesce(r.row_values ->> 0, '')) <> ''
   AND trim(coalesce(r.row_values ->> 1, '')) <> ''
 ORDER BY lower(trim(r.row_values ->> 0)), r.source_row_number DESC
ON CONFLICT DO NOTHING;

WITH latest AS (
  SELECT id FROM import_batches WHERE status = 'completed' ORDER BY imported_at DESC LIMIT 1
), teachers AS (
  SELECT r.import_id, trim(r.row_values ->> 0) AS nip, trim(r.row_values ->> 1) AS username,
         coalesce(r.row_values ->> 3, '') AS subjects, coalesce(nullif(trim(r.row_values ->> 4), ''), '-') AS homeroom
    FROM legacy_sheet_rows r JOIN latest l ON l.id = r.import_id
   WHERE lower(r.sheet_name) = lower('Master_Guru')
)
INSERT INTO teacher_profiles(user_id, nip, subjects, homeroom_class, source_import_id)
SELECT DISTINCT ON (t.nip) u.id, t.nip, t.subjects, t.homeroom, t.import_id
  FROM teachers t JOIN app_users u ON lower(u.username) = lower(t.username)
 WHERE t.nip <> ''
 ORDER BY t.nip, u.updated_at DESC
ON CONFLICT DO NOTHING;

WITH latest AS (
  SELECT id FROM import_batches WHERE status = 'completed' ORDER BY imported_at DESC LIMIT 1
), questions AS (
  SELECT r.*, trim(r.row_values ->> 1) AS question_id, coalesce(r.row_values ->> 17, '') AS creator
    FROM legacy_sheet_rows r JOIN latest l ON l.id = r.import_id
   WHERE lower(r.sheet_name) = lower('Bank_Soal_UAS')
)
INSERT INTO school_questions(
  id, subject, class_code, cognitive_level, competency, question_text, options, answer_key,
  approval_status, question_type, revision_note, image_url, creator_username, created_by,
  source_timestamp, source_import_id
)
SELECT DISTINCT ON (q.question_id)
       q.question_id, coalesce(q.row_values ->> 2, ''), coalesce(q.row_values ->> 3, ''),
       coalesce(nullif(q.row_values ->> 4, ''), 'C3'), coalesce(q.row_values ->> 5, ''),
       coalesce(q.row_values ->> 6, ''),
       jsonb_build_object('A', coalesce(q.row_values ->> 7, ''), 'B', coalesce(q.row_values ->> 8, ''),
                          'C', coalesce(q.row_values ->> 9, ''), 'D', coalesce(q.row_values ->> 10, ''),
                          'E', coalesce(q.row_values ->> 11, '')),
       coalesce(q.row_values ->> 12, ''), coalesce(nullif(q.row_values ->> 13, ''), 'Menunggu Approval Kepsek'),
       coalesce(nullif(q.row_values ->> 14, ''), 'PG'), coalesce(q.row_values ->> 15, ''),
       coalesce(q.row_values ->> 16, ''), q.creator, u.id, coalesce(q.row_values ->> 0, ''), q.import_id
  FROM questions q LEFT JOIN app_users u ON lower(u.username) = lower(q.creator)
 WHERE q.question_id <> '' AND trim(coalesce(q.row_values ->> 6, '')) <> ''
 ORDER BY q.question_id, q.source_row_number DESC
ON CONFLICT DO NOTHING;

COMMENT ON TABLE school_questions IS
  'Bank soal native PostgreSQL. Snapshot GAS hanya dipakai sebagai seed migrasi dan tidak menimpa perubahan native.';
