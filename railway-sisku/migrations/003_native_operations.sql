CREATE TABLE IF NOT EXISTS native_attendance (
  id uuid PRIMARY KEY,
  school_date date NOT NULL,
  student_nis text NOT NULL,
  student_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Hadir',
  check_in_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_date, student_nis)
);

CREATE TABLE IF NOT EXISTS native_yaumiah (
  id uuid PRIMARY KEY,
  school_date date NOT NULL,
  student_nis text NOT NULL,
  student_name text NOT NULL DEFAULT '',
  class_code text NOT NULL DEFAULT '',
  achievement numeric(5,2) NOT NULL DEFAULT 0 CHECK (achievement BETWEEN 0 AND 100),
  reading text NOT NULL DEFAULT '',
  parent_note text NOT NULL DEFAULT '',
  recorded_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_date, student_nis)
);

CREATE TABLE IF NOT EXISTS native_tasks (
  id text PRIMARY KEY,
  subject text NOT NULL,
  class_code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  deadline timestamptz,
  status text NOT NULL DEFAULT 'Aktif',
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  creator_username text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS native_announcements (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  targets text[] NOT NULL DEFAULT ARRAY['SEMUA']::text[],
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  creator_name text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS native_messages (
  id uuid PRIMARY KEY,
  sender_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  sender_username text NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  sender_role text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'BELUM DIBACA',
  read_at timestamptz,
  read_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS native_exam_sessions (
  id uuid PRIMARY KEY,
  subject text NOT NULL,
  class_code text NOT NULL DEFAULT 'SEMUA',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('OPEN','CLOSED')),
  shuffle_questions boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS native_exam_sessions_open_idx
  ON native_exam_sessions (class_code, subject) WHERE status = 'OPEN';

CREATE TABLE IF NOT EXISTS native_exam_attempts (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES native_exam_sessions(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  student_nis text NOT NULL,
  student_name text NOT NULL,
  class_code text NOT NULL,
  subject text NOT NULL,
  question_manifest jsonb NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  correct_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  score numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'STARTED' CHECK (status IN ('STARTED','SUBMITTED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE (session_id, user_id)
);

COMMENT ON TABLE native_exam_attempts IS
  'Attempt CBT native; manifest membekukan daftar soal agar perubahan bank soal tidak mengubah attempt berjalan.';
