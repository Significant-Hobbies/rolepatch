-- Better Auth tables. Keep these separate from the app-level `users` table:
-- Better Auth uses the singular model names for OAuth identities and sessions.
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  expiresAt TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session" (userId);

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account" (userId);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification" (identifier);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  revision INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  create_request_id TEXT,
  create_payload_hash TEXT
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  resume_id TEXT REFERENCES resumes(id),
  url TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  jd_raw TEXT NOT NULL DEFAULT '',
  jd_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  interview_date INTEGER,
  follow_up_at INTEGER,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT,
  offer_amount INTEGER,
  notes TEXT,
  rejection_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  stage TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  normalized_url TEXT,
  board TEXT,
  external_job_id TEXT,
  manual_id TEXT,
  location TEXT,
  remote_eligibility TEXT,
  india_eligibility TEXT,
  salary_period TEXT,
  compensation_evidence TEXT,
  priority TEXT,
  applied_at INTEGER,
  next_action TEXT,
  outcome TEXT,
  event_source TEXT DEFAULT 'existing_workflow',
  event_note TEXT,
  event_key TEXT,
  event_material_versions TEXT NOT NULL DEFAULT '[]',
  create_key TEXT,
  create_hash TEXT
);

CREATE TABLE IF NOT EXISTS tailored_resumes (
  jd_snapshot TEXT,
  id TEXT PRIMARY KEY,
  user_id TEXT,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  resume_id TEXT NOT NULL REFERENCES resumes(id),
  source TEXT NOT NULL DEFAULT '',
  accepted INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 0,
  share_slug TEXT UNIQUE,
  score_original INTEGER NOT NULL DEFAULT 0,
  score_tailored INTEGER NOT NULL DEFAULT 0,
  changes_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS cover_letters (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  resume_id TEXT NOT NULL REFERENCES resumes(id),
  content TEXT NOT NULL DEFAULT '',
  company_research TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS stash_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  category TEXT NOT NULL DEFAULT 'experience',
  label TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS achievement_evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  situation TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  metric TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '[]',
  role_targets TEXT NOT NULL DEFAULT '[]',
  impact_type TEXT NOT NULL DEFAULT 'other',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS token_balances (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 3,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS token_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  balance_after INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  tokens_granted INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dodo_payload TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS fit_scores (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  user_id TEXT,
  overall_score INTEGER NOT NULL DEFAULT 0,
  dimensions TEXT NOT NULL DEFAULT '[]',
  strengths TEXT NOT NULL DEFAULT '[]',
  gaps TEXT NOT NULL DEFAULT '[]',
  recommendation TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS outreach_emails (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  resume_id TEXT NOT NULL REFERENCES resumes(id),
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS interview_stories (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  user_id TEXT,
  theme TEXT NOT NULL DEFAULT '',
  jd_requirement TEXT NOT NULL DEFAULT '',
  situation TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  reflection TEXT NOT NULL DEFAULT '',
  best_for TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS skills_roadmaps (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  user_id TEXT,
  items_json TEXT NOT NULL DEFAULT '[]',
  total_estimated_hours INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS saved_job_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  remote INTEGER NOT NULL DEFAULT 0,
  paused INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER,
  last_result_ids TEXT NOT NULL DEFAULT '[]',
  last_source TEXT,
  last_found_count INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS saved_job_shortlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  external_job_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  job_url TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  saved_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, job_url)
);

CREATE TABLE IF NOT EXISTS job_discovery_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'new_match',
  title TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  external_job_id TEXT,
  company TEXT,
  job_url TEXT,
  location TEXT,
  source TEXT,
  seen INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS company_watches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  career_url TEXT,
  role_query TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  remote INTEGER NOT NULL DEFAULT 0,
  paused INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER,
  last_result_ids TEXT NOT NULL DEFAULT '[]',
  last_source TEXT,
  last_found_count INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS application_queue (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  readiness_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, job_id)
);

CREATE TABLE IF NOT EXISTS application_receipts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  queue_id TEXT REFERENCES application_queue(id),
  user_id TEXT,
  provider TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  fields_json TEXT NOT NULL DEFAULT '[]',
  resume_id TEXT,
  cover_letter_id TEXT,
  confirmation_text TEXT,
  confirmation_url TEXT,
  failure_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_applications_cleaned_url
  ON job_applications (url)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tailored_resumes_share_slug
  ON tailored_resumes (share_slug)
  WHERE share_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS profile_answers (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  label TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  sensitive INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS recruiter_reply_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT,
  from_email TEXT NOT NULL DEFAULT '',
  to_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL DEFAULT 'other',
  applied_status TEXT,
  summary TEXT NOT NULL DEFAULT '',
  message_id TEXT,
  in_reply_to TEXT,
  thread_key TEXT NOT NULL DEFAULT '',
  suggested_reply_subject TEXT NOT NULL DEFAULT '',
  suggested_reply_body TEXT NOT NULL DEFAULT '',
  reply_sent_at INTEGER,
  reply_sent_subject TEXT NOT NULL DEFAULT '',
  reply_sent_body TEXT NOT NULL DEFAULT '',
  reply_send_error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Career database objects shared by the signed-in web and MCP interfaces.

CREATE UNIQUE INDEX IF NOT EXISTS tracker_url ON job_applications(user_id,normalized_url) WHERE normalized_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tracker_board ON job_applications(user_id,board,external_job_id) WHERE board IS NOT NULL AND external_job_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tracker_manual ON job_applications(user_id,manual_id) WHERE manual_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tracker_create ON job_applications(user_id,create_key) WHERE create_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS tracker_order ON job_applications(user_id,created_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS application_create_requests (
  user_id TEXT NOT NULL, request_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL, PRIMARY KEY(user_id,request_id)
);

CREATE TABLE IF NOT EXISTS application_events (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL, status TEXT NOT NULL, prior_status TEXT, source TEXT NOT NULL,
  note TEXT, request_key TEXT, material_versions TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL DEFAULT(unixepoch()), UNIQUE(job_id,revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS tracker_event_request ON application_events(user_id,job_id,request_key) WHERE request_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS tracker_events ON application_events(user_id,job_id,revision DESC);

CREATE TABLE IF NOT EXISTS application_material_versions (
  user_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  id TEXT NOT NULL, revision INTEGER NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
  reference_type TEXT, reference_id TEXT, archived INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT(unixepoch()),
  PRIMARY KEY(user_id,id,revision)
);

CREATE INDEX IF NOT EXISTS tracker_materials ON application_material_versions(user_id,job_id,id,revision DESC);

CREATE TRIGGER IF NOT EXISTS tracker_initial AFTER INSERT ON job_applications WHEN NEW.user_id IS NOT NULL BEGIN
  UPDATE job_applications SET stage=COALESCE(NEW.stage,CASE NEW.status WHEN 'draft' THEN 'preparing' WHEN 'tailored' THEN 'ready' WHEN 'interview' THEN 'screening' ELSE NEW.status END) WHERE id=NEW.id;
  INSERT INTO application_create_requests(user_id,request_id,job_id,request_hash) SELECT NEW.user_id,NEW.create_key,NEW.id,NEW.create_hash WHERE NEW.create_key IS NOT NULL;
  INSERT INTO application_events(id,user_id,job_id,revision,status,source,note)
    SELECT lower(hex(randomblob(16))),user_id,id,revision,stage,event_source,event_note FROM job_applications WHERE id=NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tracker_legacy_edit AFTER UPDATE OF status,url,company,role,jd_text,jd_raw,notes,follow_up_at,interview_date,salary_min,salary_max,salary_currency,offer_amount,rejection_reason,resume_id ON job_applications
WHEN NEW.user_id IS NOT NULL AND NEW.revision=OLD.revision BEGIN
  UPDATE job_applications SET revision=OLD.revision+1,event_source='existing_workflow',event_note=NULL,event_key=NULL,event_material_versions='[]',
    normalized_url=CASE WHEN NEW.url IS OLD.url THEN NEW.normalized_url ELSE NULL END,
    stage=CASE WHEN NEW.status IS OLD.status THEN OLD.stage ELSE CASE NEW.status WHEN 'draft' THEN 'preparing' WHEN 'tailored' THEN 'ready' WHEN 'interview' THEN 'screening' ELSE NEW.status END END
    WHERE id=NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tracker_intake_request AFTER UPDATE OF create_key ON job_applications
WHEN NEW.create_key IS NOT NULL AND NEW.create_key IS NOT OLD.create_key BEGIN
  INSERT INTO application_create_requests(user_id,request_id,job_id,request_hash) VALUES(NEW.user_id,NEW.create_key,NEW.id,NEW.create_hash);
END;

CREATE TRIGGER IF NOT EXISTS tracker_event AFTER UPDATE OF revision ON job_applications
WHEN NEW.user_id IS NOT NULL AND NEW.revision>OLD.revision AND (NEW.stage IS NOT OLD.stage OR (NEW.event_key IS NOT NULL AND NEW.event_key IS NOT OLD.event_key)) BEGIN
  INSERT INTO application_events(id,user_id,job_id,revision,status,prior_status,source,note,request_key,material_versions)
    VALUES(lower(hex(randomblob(16))),NEW.user_id,NEW.id,NEW.revision,NEW.stage,OLD.stage,NEW.event_source,NEW.event_note,NEW.event_key,
      NEW.event_material_versions);
END;

CREATE UNIQUE INDEX IF NOT EXISTS resumes_create_request ON resumes(user_id,create_request_id);

CREATE UNIQUE INDEX IF NOT EXISTS resumes_default ON resumes(user_id) WHERE is_default = 1;

CREATE TRIGGER IF NOT EXISTS resumes_select_default BEFORE UPDATE OF is_default ON resumes
WHEN NEW.is_default = 1 AND OLD.is_default = 0 BEGIN
  UPDATE resumes SET is_default = 0 WHERE user_id = NEW.user_id AND is_default = 1;
END;

CREATE TRIGGER IF NOT EXISTS resumes_insert_default BEFORE INSERT ON resumes
WHEN NEW.is_default = 1 BEGIN
  UPDATE resumes SET is_default = 0 WHERE user_id = NEW.user_id AND is_default = 1;
END;

CREATE TRIGGER IF NOT EXISTS resumes_track_revision AFTER UPDATE OF source,name,is_default,archived_at ON resumes
WHEN NEW.source IS NOT OLD.source OR NEW.name IS NOT OLD.name
  OR NEW.is_default IS NOT OLD.is_default OR NEW.archived_at IS NOT OLD.archived_at BEGIN
  UPDATE resumes SET revision = revision + 1, updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS career_records (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('identity','employment','project','achievement','education','skill','answer','note')),
  title TEXT NOT NULL,
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  sensitive INTEGER NOT NULL DEFAULT 0 CHECK(sensitive = 0 OR kind = 'answer'),
  revision INTEGER NOT NULL DEFAULT 1,
  archived_at INTEGER,
  PRIMARY KEY(user_id,profile_id,id)
);

CREATE INDEX IF NOT EXISTS career_record_kind ON career_records(user_id,profile_id,kind,id);

CREATE TRIGGER IF NOT EXISTS career_insert_revision AFTER INSERT ON career_records BEGIN
  UPDATE resumes SET revision=revision+1,updated_at=unixepoch() WHERE id=NEW.profile_id AND user_id=NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS career_edit_revision AFTER UPDATE ON career_records BEGIN
  UPDATE resumes SET revision=revision+1,updated_at=unixepoch() WHERE id=NEW.profile_id AND user_id=NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS career_delete_revision AFTER DELETE ON career_records BEGIN
  UPDATE resumes SET revision=revision+1,updated_at=unixepoch() WHERE id=OLD.profile_id AND user_id=OLD.user_id;
END;

CREATE TRIGGER IF NOT EXISTS career_records_validate_insert BEFORE INSERT ON career_records BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM resumes WHERE id=NEW.profile_id AND user_id=NEW.user_id AND archived_at IS NULL)
    THEN RAISE(ABORT,'inactive career profile') END;
  SELECT CASE WHEN json_extract(NEW.data_json,'$.related_role_id') IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM career_records WHERE user_id=NEW.user_id AND profile_id=NEW.profile_id AND archived_at IS NULL
       AND id=json_extract(NEW.data_json,'$.related_role_id') AND kind='employment' AND id<>NEW.id)
    THEN RAISE(ABORT,'invalid related role') END;
  SELECT CASE WHEN json_extract(NEW.data_json,'$.related_project_id') IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM career_records WHERE user_id=NEW.user_id AND profile_id=NEW.profile_id AND archived_at IS NULL
       AND id=json_extract(NEW.data_json,'$.related_project_id') AND kind='project' AND id<>NEW.id)
    THEN RAISE(ABORT,'invalid related project') END;
END;

CREATE TRIGGER IF NOT EXISTS career_records_validate_change BEFORE UPDATE OF data_json ON career_records BEGIN
  SELECT CASE WHEN json_extract(NEW.data_json,'$.related_role_id') IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM career_records WHERE user_id=NEW.user_id AND profile_id=NEW.profile_id
       AND id=json_extract(NEW.data_json,'$.related_role_id') AND kind='employment' AND id<>NEW.id)
    THEN RAISE(ABORT,'invalid related role') END;
  SELECT CASE WHEN json_extract(NEW.data_json,'$.related_project_id') IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM career_records WHERE user_id=NEW.user_id AND profile_id=NEW.profile_id
       AND id=json_extract(NEW.data_json,'$.related_project_id') AND kind='project' AND id<>NEW.id)
    THEN RAISE(ABORT,'invalid related project') END;
END;

CREATE TABLE IF NOT EXISTS career_resume_versions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES job_applications(id) ON DELETE RESTRICT,
  series_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  markdown TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  saved INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, request_id),
  UNIQUE (user_id, series_id, revision)
);

CREATE INDEX IF NOT EXISTS career_resume_history ON career_resume_versions(user_id, profile_id, saved, created_at, id);

CREATE TRIGGER IF NOT EXISTS career_resume_legacy_history AFTER INSERT ON tailored_resumes
WHEN NEW.user_id IS NOT NULL
BEGIN
  INSERT INTO career_resume_versions
    (id,user_id,profile_id,application_id,series_id,revision,markdown,snapshot_json,saved,approved,request_id,request_hash,created_at)
  SELECT NEW.id,NEW.user_id,r.id,j.id,NEW.id,1,NEW.source,
    json_object('legacy',json('true'),'jd_text',COALESCE(NEW.jd_snapshot,j.jd_text)),1,NEW.accepted,'legacy:' || NEW.id,'',NEW.created_at
  FROM resumes r JOIN job_applications j ON j.id=NEW.job_id AND j.user_id=NEW.user_id
  JOIN users u ON u.id=NEW.user_id
  WHERE r.id=NEW.resume_id AND r.user_id=NEW.user_id;
END;

CREATE TABLE IF NOT EXISTS career_resume_requests (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  lease_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,request_id)
);
