ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS impersonated_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL;

ALTER TABLE native_exam_sessions
  ADD COLUMN IF NOT EXISTS access_token text;

ALTER TABLE native_exam_sessions
  ADD COLUMN IF NOT EXISTS shuffle_options boolean NOT NULL DEFAULT true;

ALTER TABLE school_questions
  ADD COLUMN IF NOT EXISTS package_id text NOT NULL DEFAULT '';

ALTER TABLE native_exam_attempts
  ADD COLUMN IF NOT EXISTS essay_scores jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE native_exam_attempts
  ADD COLUMN IF NOT EXISTS grading_note text NOT NULL DEFAULT '';

ALTER TABLE native_exam_attempts
  ADD COLUMN IF NOT EXISTS option_manifest jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE native_attendance ADD COLUMN IF NOT EXISTS latitude numeric(10,7);
ALTER TABLE native_attendance ADD COLUMN IF NOT EXISTS longitude numeric(10,7);
ALTER TABLE native_attendance ADD COLUMN IF NOT EXISTS distance_m numeric(10,2);
ALTER TABLE native_attendance ADD COLUMN IF NOT EXISTS qr_token text NOT NULL DEFAULT '';
ALTER TABLE native_attendance ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT '';

DROP INDEX IF EXISTS native_exam_sessions_token_idx;
CREATE INDEX IF NOT EXISTS native_exam_sessions_token_idx
  ON native_exam_sessions (access_token) WHERE access_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS native_grade_complaints (
  id uuid PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES native_exam_attempts(id) ON DELETE RESTRICT,
  student_nis text NOT NULL,
  student_name text NOT NULL,
  class_code text NOT NULL,
  subject text NOT NULL,
  score_before numeric(5,2) NOT NULL,
  score_after numeric(5,2),
  submitted_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  submitter_username text NOT NULL,
  submitter_role text NOT NULL,
  argument text NOT NULL,
  status text NOT NULL DEFAULT 'KOMPLAIN' CHECK (status IN ('KOMPLAIN','SELESAI')),
  teacher_response text NOT NULL DEFAULT '',
  resolved_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, student_nis)
);

CREATE INDEX IF NOT EXISTS native_grade_complaints_status_idx
  ON native_grade_complaints (status, subject, created_at DESC);

CREATE TABLE IF NOT EXISTS native_task_submissions (
  task_id text NOT NULL REFERENCES native_tasks(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  student_nis text NOT NULL,
  status text NOT NULL DEFAULT 'SELESAI',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS native_yaumiah_master (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Ibadah',
  points integer NOT NULL DEFAULT 10 CHECK (points BETWEEN 0 AND 1000),
  class_code text NOT NULL DEFAULT 'SEMUA',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS native_yaumiah_details (
  school_date date NOT NULL,
  student_nis text NOT NULL,
  item_id text NOT NULL REFERENCES native_yaumiah_master(id) ON DELETE RESTRICT,
  done boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_date, student_nis, item_id)
);

CREATE TABLE IF NOT EXISTS native_tahfidz_targets (
  class_code text PRIMARY KEY,
  teacher_name text NOT NULL DEFAULT '',
  surah text NOT NULL DEFAULT '',
  verses text NOT NULL DEFAULT '',
  period text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_questions_package_idx
  ON school_questions (package_id) WHERE active = true AND package_id <> '';

-- Seed seluruh alur lama ke tabel native. Snapshot legacy tetap append-only sebagai arsip.
WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1), packages AS (
  SELECT DISTINCT ON (r.row_values->>1) r.row_values->>1 AS question_id,coalesce(r.row_values->>19,'') AS package_id
    FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id WHERE lower(r.sheet_name)=lower('Bank_Soal_UAS')
   ORDER BY r.row_values->>1,r.source_row_number DESC
)
UPDATE school_questions q SET package_id=p.package_id FROM packages p WHERE p.question_id=q.id AND q.package_id='';

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1)
INSERT INTO native_tasks(id,subject,class_code,title,description,deadline,status,created_by,creator_username)
SELECT DISTINCT ON (trim(r.row_values->>1)) trim(r.row_values->>1),coalesce(r.row_values->>2,''),coalesce(nullif(r.row_values->>3,''),'SEMUA'),
       coalesce(r.row_values->>4,''),coalesce(r.row_values->>5,''),NULL,coalesce(nullif(r.row_values->>8,''),'Aktif'),u.id,coalesce(r.row_values->>7,'')
  FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
  LEFT JOIN app_users u ON lower(u.username)=lower(r.row_values->>7)
 WHERE lower(r.sheet_name)=lower('Tugas_Kelas') AND trim(coalesce(r.row_values->>1,''))<>''
 ORDER BY trim(r.row_values->>1),r.source_row_number DESC ON CONFLICT(id) DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1)
INSERT INTO native_yaumiah_master(id,name,category,points,class_code)
SELECT DISTINCT ON (trim(r.row_values->>0)) trim(r.row_values->>0),coalesce(r.row_values->>1,''),coalesce(nullif(r.row_values->>2,''),'Ibadah'),
       CASE WHEN coalesce(r.row_values->>3,'') ~ '^\d+$' THEN greatest(0,least(1000,(r.row_values->>3)::int)) ELSE 10 END,
       coalesce(nullif(r.row_values->>4,''),'SEMUA')
  FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
 WHERE lower(r.sheet_name)=lower('Master_Yaumiah') AND trim(coalesce(r.row_values->>0,''))<>''
 ORDER BY trim(r.row_values->>0),r.source_row_number DESC ON CONFLICT(id) DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1)
INSERT INTO native_tahfidz_targets(class_code,teacher_name,surah,verses,period)
SELECT DISTINCT ON (trim(r.row_values->>0)) trim(r.row_values->>0),coalesce(r.row_values->>1,''),coalesce(r.row_values->>2,''),
       concat_ws(' · ',nullif(r.row_values->>3,''),nullif(r.row_values->>4,'')),coalesce(r.row_values->>5,'')
  FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
 WHERE lower(r.sheet_name)=lower('Target_Tahfidz') AND trim(coalesce(r.row_values->>0,''))<>''
 ORDER BY trim(r.row_values->>0),r.source_row_number DESC ON CONFLICT(class_code) DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1)
INSERT INTO native_task_submissions(task_id,user_id,student_nis,status,submitted_at)
SELECT DISTINCT ON (r.row_values->>1,u.id) r.row_values->>1,u.id,coalesce(nullif(r.row_values->>3,''),u.student_nis),
       coalesce(nullif(r.row_values->>4,''),'SELESAI'),now()
  FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
  JOIN native_tasks t ON t.id=r.row_values->>1
  JOIN app_users u ON u.active=true AND (lower(u.username)=lower(r.row_values->>2) OR (u.role='siswa' AND u.student_nis=r.row_values->>3))
 WHERE lower(r.sheet_name)=lower('Task_Submissions')
 ORDER BY r.row_values->>1,u.id,r.source_row_number DESC ON CONFLICT(task_id,user_id) DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1), legacy AS (
  SELECT r.*,trim(r.row_values->>0) legacy_id FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
   WHERE lower(r.sheet_name)=lower('Exam_Attempts') AND trim(coalesce(r.row_values->>0,''))<>'' AND upper(coalesce(r.row_values->>8,''))='SUBMITTED'
)
INSERT INTO native_exam_sessions(id,subject,class_code,note,status,shuffle_questions,opened_at,closed_at)
SELECT DISTINCT ((substr(md5('legacy-session:'||legacy_id),1,8)||'-'||substr(md5('legacy-session:'||legacy_id),9,4)||'-4'||substr(md5('legacy-session:'||legacy_id),14,3)||'-a'||substr(md5('legacy-session:'||legacy_id),18,3)||'-'||substr(md5('legacy-session:'||legacy_id),21,12))::uuid),
       coalesce(row_values->>7,''),coalesce(row_values->>6,''),'Migrasi attempt GAS','CLOSED',false,now(),now()
  FROM legacy ON CONFLICT(id) DO NOTHING;

ALTER TABLE native_exam_attempts ADD COLUMN IF NOT EXISTS legacy_attempt_id text;
ALTER TABLE native_exam_attempts ADD COLUMN IF NOT EXISTS legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS native_exam_attempts_legacy_idx ON native_exam_attempts(legacy_attempt_id) WHERE legacy_attempt_id IS NOT NULL;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1), legacy AS (
  SELECT r.*,trim(r.row_values->>0) legacy_id FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
   WHERE lower(r.sheet_name)=lower('Exam_Attempts') AND trim(coalesce(r.row_values->>0,''))<>'' AND upper(coalesce(r.row_values->>8,''))='SUBMITTED'
)
INSERT INTO native_exam_attempts(id,session_id,user_id,student_nis,student_name,class_code,subject,question_manifest,answers,correct_count,total_questions,score,status,submitted_at,legacy_attempt_id,legacy_payload)
SELECT (substr(md5('legacy-attempt:'||legacy_id),1,8)||'-'||substr(md5('legacy-attempt:'||legacy_id),9,4)||'-4'||substr(md5('legacy-attempt:'||legacy_id),14,3)||'-a'||substr(md5('legacy-attempt:'||legacy_id),18,3)||'-'||substr(md5('legacy-attempt:'||legacy_id),21,12))::uuid,
       (substr(md5('legacy-session:'||legacy_id),1,8)||'-'||substr(md5('legacy-session:'||legacy_id),9,4)||'-4'||substr(md5('legacy-session:'||legacy_id),14,3)||'-a'||substr(md5('legacy-session:'||legacy_id),18,3)||'-'||substr(md5('legacy-session:'||legacy_id),21,12))::uuid,
       u.id,coalesce(nullif(row_values->>4,''),u.student_nis),coalesce(nullif(row_values->>5,''),u.full_name),coalesce(row_values->>6,''),coalesce(row_values->>7,''),
       '[]'::jsonb,'{}'::jsonb,CASE WHEN coalesce(row_values->>9,'') ~ '^\d+$' THEN (row_values->>9)::int ELSE 0 END,
       CASE WHEN coalesce(row_values->>10,'') ~ '^\d+$' THEN (row_values->>10)::int ELSE 0 END,
       CASE WHEN coalesce(nullif(row_values->>19,''),row_values->>11,'') ~ '^\d+(\.\d+)?$' THEN greatest(0,least(100,coalesce(nullif(row_values->>19,''),row_values->>11)::numeric)) ELSE 0 END,
       'SUBMITTED',now(),legacy_id,jsonb_build_object('answersRaw',coalesce(row_values->>12,''),'manifestRaw',coalesce(row_values->>15,''),'essayGradingRaw',coalesce(row_values->>16,''),'startedAtRaw',coalesce(row_values->>1,''),'submittedAtRaw',coalesce(row_values->>2,''))
  FROM legacy JOIN app_users u ON u.active=true AND (lower(u.username)=lower(row_values->>3) OR (u.role='siswa' AND u.student_nis=row_values->>4))
 ON CONFLICT DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1)
INSERT INTO native_grade_complaints(id,attempt_id,student_nis,student_name,class_code,subject,score_before,score_after,submitted_by,submitter_username,submitter_role,argument,status,teacher_response,resolved_by,resolved_at)
SELECT (substr(md5('legacy-complaint:'||coalesce(r.row_values->>0,'')),1,8)||'-'||substr(md5('legacy-complaint:'||coalesce(r.row_values->>0,'')),9,4)||'-4'||substr(md5('legacy-complaint:'||coalesce(r.row_values->>0,'')),14,3)||'-a'||substr(md5('legacy-complaint:'||coalesce(r.row_values->>0,'')),18,3)||'-'||substr(md5('legacy-complaint:'||coalesce(r.row_values->>0,'')),21,12))::uuid,
       a.id,coalesce(r.row_values->>3,''),coalesce(r.row_values->>4,''),coalesce(r.row_values->>5,''),coalesce(r.row_values->>6,''),
       CASE WHEN coalesce(r.row_values->>16,r.row_values->>7,'') ~ '^\d+(\.\d+)?$' THEN coalesce(r.row_values->>16,r.row_values->>7)::numeric ELSE 0 END,
       CASE WHEN coalesce(r.row_values->>17,'') ~ '^\d+(\.\d+)?$' THEN (r.row_values->>17)::numeric ELSE NULL END,
       u.id,coalesce(r.row_values->>8,''),coalesce(r.row_values->>10,'siswa'),coalesce(r.row_values->>11,''),
       CASE WHEN upper(coalesce(r.row_values->>13,''))='SELESAI' THEN 'SELESAI' ELSE 'KOMPLAIN' END,coalesce(r.row_values->>18,''),ru.id,
       CASE WHEN coalesce(r.row_values->>19,'')<>'' THEN now() ELSE NULL END
  FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
  JOIN native_exam_attempts a ON a.legacy_attempt_id=r.row_values->>2
  LEFT JOIN app_users u ON lower(u.username)=lower(r.row_values->>8)
  LEFT JOIN app_users ru ON lower(ru.username)=lower(r.row_values->>20)
 WHERE lower(r.sheet_name)=lower('Grade_Complaints') AND trim(coalesce(r.row_values->>0,''))<>''
 ON CONFLICT DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1), settings AS (
  SELECT jsonb_object_agg(r.row_values->>0,r.row_values->>1) AS value FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
   WHERE lower(r.sheet_name)=lower('Pengaturan_Organisasi') AND trim(coalesce(r.row_values->>0,''))<>''
)
INSERT INTO runtime_settings(setting_key,setting_value) SELECT 'organization',value FROM settings WHERE value IS NOT NULL
ON CONFLICT(setting_key) DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1)
INSERT INTO native_messages(id,sender_id,sender_username,sender_name,sender_role,subject,message,status,read_at,read_by,created_at)
SELECT (substr(md5('legacy-message:'||coalesce(r.row_values->>0,'')),1,8)||'-'||substr(md5('legacy-message:'||coalesce(r.row_values->>0,'')),9,4)||'-4'||substr(md5('legacy-message:'||coalesce(r.row_values->>0,'')),14,3)||'-a'||substr(md5('legacy-message:'||coalesce(r.row_values->>0,'')),18,3)||'-'||substr(md5('legacy-message:'||coalesce(r.row_values->>0,'')),21,12))::uuid,
       u.id,coalesce(r.row_values->>2,''),coalesce(r.row_values->>3,''),coalesce(r.row_values->>4,''),coalesce(r.row_values->>5,''),coalesce(r.row_values->>6,''),coalesce(nullif(r.row_values->>7,''),'BELUM DIBACA'),NULL,ru.id,now()
  FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id
  LEFT JOIN app_users u ON lower(u.username)=lower(r.row_values->>2)
  LEFT JOIN app_users ru ON lower(ru.username)=lower(r.row_values->>9)
 WHERE lower(r.sheet_name)=lower('Internal_Messages') AND trim(coalesce(r.row_values->>0,''))<>'' ON CONFLICT(id) DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1)
INSERT INTO native_announcements(id,title,message,targets,created_by,creator_name,created_at)
SELECT (substr(md5('legacy-announcement:'||coalesce(r.row_values->>0,'')),1,8)||'-'||substr(md5('legacy-announcement:'||coalesce(r.row_values->>0,'')),9,4)||'-4'||substr(md5('legacy-announcement:'||coalesce(r.row_values->>0,'')),14,3)||'-a'||substr(md5('legacy-announcement:'||coalesce(r.row_values->>0,'')),18,3)||'-'||substr(md5('legacy-announcement:'||coalesce(r.row_values->>0,'')),21,12))::uuid,
       coalesce(r.row_values->>5,''),coalesce(r.row_values->>6,''),ARRAY[coalesce(nullif(r.row_values->>4,''),'SEMUA')],u.id,coalesce(r.row_values->>3,''),now()
  FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id LEFT JOIN app_users u ON lower(u.username)=lower(r.row_values->>2)
 WHERE lower(r.sheet_name)=lower('Announcements') AND trim(coalesce(r.row_values->>0,''))<>'' ON CONFLICT(id) DO NOTHING;

WITH latest AS (SELECT id FROM import_batches WHERE status='completed' ORDER BY imported_at DESC LIMIT 1)
INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,details)
SELECT u.id,coalesce(nullif(r.row_values->>5,''),'LEGACY_ACTIVITY'),'legacy_user',nullif(r.row_values->>3,''),
       jsonb_build_object('actorUsername',coalesce(r.row_values->>1,''),'actorName',coalesce(r.row_values->>2,''),'targetUsername',coalesce(r.row_values->>3,''),'targetName',coalesce(r.row_values->>4,''),'detail',coalesce(r.row_values->>6,''),'migrated',true)
  FROM legacy_sheet_rows r JOIN latest l ON l.id=r.import_id LEFT JOIN app_users u ON lower(u.username)=lower(r.row_values->>1)
 WHERE lower(r.sheet_name)=lower('Activity_Log');
