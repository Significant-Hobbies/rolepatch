-- Every edit has its own ID so submitted materials can pin immutable text.
CREATE TABLE career_resume_versions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES job_applications(id) ON DELETE SET NULL,
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
CREATE INDEX career_resume_history ON career_resume_versions(user_id, profile_id, saved, created_at, id);

-- A legacy version can have a JD that has since changed. Leave historic source
-- facts unknown rather than backfilling the current job or master as evidence.
INSERT INTO career_resume_versions
  (id,user_id,profile_id,application_id,series_id,revision,markdown,snapshot_json,saved,approved,request_id,request_hash,created_at)
SELECT t.id,t.user_id,t.resume_id,t.job_id,t.id,1,t.source,'{"legacy":true}',1,t.accepted,'legacy:' || t.id,'',t.created_at
FROM tailored_resumes t
JOIN resumes r ON r.id=t.resume_id AND r.user_id=t.user_id
JOIN users u ON u.id=t.user_id
JOIN job_applications j ON j.id=t.job_id AND j.user_id=t.user_id;

CREATE TRIGGER career_resume_legacy_history AFTER INSERT ON tailored_resumes
WHEN NEW.user_id IS NOT NULL
BEGIN
  INSERT INTO career_resume_versions
    (id,user_id,profile_id,application_id,series_id,revision,markdown,snapshot_json,saved,approved,request_id,request_hash,created_at)
  SELECT NEW.id,NEW.user_id,r.id,j.id,NEW.id,1,NEW.source,
    json_object('legacy',json('true'),'jd_text',j.jd_text),1,NEW.accepted,'legacy:' || NEW.id,'',NEW.created_at
  FROM resumes r JOIN job_applications j ON j.id=NEW.job_id AND j.user_id=NEW.user_id
  JOIN users u ON u.id=NEW.user_id
  WHERE r.id=NEW.resume_id AND r.user_id=NEW.user_id;
END;

-- Prevent concurrent retries from dispatching the same billed rewrite to the gateway.
CREATE TABLE career_resume_requests (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  lease_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,request_id)
);
