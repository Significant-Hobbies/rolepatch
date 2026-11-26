-- Preserve legacy status consumers while making the exact tracker stage durable.
ALTER TABLE job_applications ADD COLUMN stage TEXT;
ALTER TABLE job_applications ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE job_applications ADD COLUMN normalized_url TEXT;
ALTER TABLE job_applications ADD COLUMN board TEXT;
ALTER TABLE job_applications ADD COLUMN external_job_id TEXT;
ALTER TABLE job_applications ADD COLUMN manual_id TEXT;
ALTER TABLE job_applications ADD COLUMN location TEXT;
ALTER TABLE job_applications ADD COLUMN remote_eligibility TEXT;
ALTER TABLE job_applications ADD COLUMN india_eligibility TEXT;
ALTER TABLE job_applications ADD COLUMN salary_period TEXT;
ALTER TABLE job_applications ADD COLUMN compensation_evidence TEXT;
ALTER TABLE job_applications ADD COLUMN priority TEXT;
ALTER TABLE job_applications ADD COLUMN applied_at INTEGER;
ALTER TABLE job_applications ADD COLUMN next_action TEXT;
ALTER TABLE job_applications ADD COLUMN outcome TEXT;
ALTER TABLE job_applications ADD COLUMN event_source TEXT DEFAULT 'existing_workflow';
ALTER TABLE job_applications ADD COLUMN event_note TEXT;
ALTER TABLE job_applications ADD COLUMN event_key TEXT;
ALTER TABLE job_applications ADD COLUMN event_material_versions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE job_applications ADD COLUMN create_key TEXT;
ALTER TABLE job_applications ADD COLUMN create_hash TEXT;
CREATE UNIQUE INDEX tracker_url ON job_applications(user_id,normalized_url) WHERE normalized_url IS NOT NULL;
CREATE UNIQUE INDEX tracker_board ON job_applications(user_id,board,external_job_id) WHERE board IS NOT NULL AND external_job_id IS NOT NULL;
CREATE UNIQUE INDEX tracker_manual ON job_applications(user_id,manual_id) WHERE manual_id IS NOT NULL;
CREATE UNIQUE INDEX tracker_create ON job_applications(user_id,create_key) WHERE create_key IS NOT NULL;
CREATE INDEX tracker_order ON job_applications(user_id,created_at DESC,id DESC);

UPDATE job_applications SET stage = CASE status WHEN 'draft' THEN 'preparing' WHEN 'tailored' THEN 'ready' WHEN 'interview' THEN 'screening' ELSE status END;
CREATE TABLE application_create_requests (
  user_id TEXT NOT NULL, request_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL, PRIMARY KEY(user_id,request_id)
);

CREATE TABLE application_events (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL, status TEXT NOT NULL, prior_status TEXT, source TEXT NOT NULL,
  note TEXT, request_key TEXT, material_versions TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL DEFAULT(unixepoch()), UNIQUE(job_id,revision)
);
CREATE UNIQUE INDEX tracker_event_request ON application_events(user_id,job_id,request_key) WHERE request_key IS NOT NULL;
CREATE INDEX tracker_events ON application_events(user_id,job_id,revision DESC);
CREATE TABLE application_material_versions (
  user_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  id TEXT NOT NULL, revision INTEGER NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
  reference_type TEXT, reference_id TEXT, archived INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT(unixepoch()),
  PRIMARY KEY(user_id,id,revision)
);
CREATE INDEX tracker_materials ON application_material_versions(user_id,job_id,id,revision DESC);

-- Legacy inserts without a tracker stage and legacy edits enter the same revision/history sequence.
CREATE TRIGGER tracker_initial AFTER INSERT ON job_applications WHEN NEW.user_id IS NOT NULL BEGIN
  UPDATE job_applications SET stage=COALESCE(NEW.stage,CASE NEW.status WHEN 'draft' THEN 'preparing' WHEN 'tailored' THEN 'ready' WHEN 'interview' THEN 'screening' ELSE NEW.status END) WHERE id=NEW.id;
  INSERT INTO application_create_requests(user_id,request_id,job_id,request_hash) SELECT NEW.user_id,NEW.create_key,NEW.id,NEW.create_hash WHERE NEW.create_key IS NOT NULL;
  INSERT INTO application_events(id,user_id,job_id,revision,status,source,note)
    SELECT lower(hex(randomblob(16))),user_id,id,revision,stage,event_source,event_note FROM job_applications WHERE id=NEW.id;
END;
CREATE TRIGGER tracker_legacy_edit AFTER UPDATE OF status,url,company,role,jd_text,jd_raw,notes,follow_up_at,interview_date,salary_min,salary_max,salary_currency,offer_amount,rejection_reason,resume_id ON job_applications
WHEN NEW.user_id IS NOT NULL AND NEW.revision=OLD.revision BEGIN
  UPDATE job_applications SET revision=OLD.revision+1,event_source='existing_workflow',event_note=NULL,event_key=NULL,event_material_versions='[]',
    normalized_url=CASE WHEN NEW.url IS OLD.url THEN NEW.normalized_url ELSE NULL END,
    stage=CASE WHEN NEW.status IS OLD.status THEN OLD.stage ELSE CASE NEW.status WHEN 'draft' THEN 'preparing' WHEN 'tailored' THEN 'ready' WHEN 'interview' THEN 'screening' ELSE NEW.status END END
    WHERE id=NEW.id;
END;
CREATE TRIGGER tracker_intake_request AFTER UPDATE OF create_key ON job_applications
WHEN NEW.create_key IS NOT NULL AND NEW.create_key IS NOT OLD.create_key BEGIN
  INSERT INTO application_create_requests(user_id,request_id,job_id,request_hash) VALUES(NEW.user_id,NEW.create_key,NEW.id,NEW.create_hash);
END;
CREATE TRIGGER tracker_event AFTER UPDATE OF revision ON job_applications
WHEN NEW.user_id IS NOT NULL AND NEW.revision>OLD.revision AND (NEW.stage IS NOT OLD.stage OR (NEW.event_key IS NOT NULL AND NEW.event_key IS NOT OLD.event_key)) BEGIN
  INSERT INTO application_events(id,user_id,job_id,revision,status,prior_status,source,note,request_key,material_versions)
    VALUES(lower(hex(randomblob(16))),NEW.user_id,NEW.id,NEW.revision,NEW.stage,OLD.stage,NEW.event_source,NEW.event_note,NEW.event_key,
      NEW.event_material_versions);
END;
INSERT INTO application_events(id,user_id,job_id,revision,status,source,created_at)
SELECT lower(hex(randomblob(16))),user_id,id,revision,stage,'migration_snapshot',updated_at FROM job_applications WHERE user_id IS NOT NULL;
