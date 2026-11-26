-- Existing Markdown remains the canonical master for every existing profile.
ALTER TABLE resumes ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE resumes ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resumes ADD COLUMN archived_at INTEGER;
ALTER TABLE resumes ADD COLUMN create_request_id TEXT;
ALTER TABLE resumes ADD COLUMN create_payload_hash TEXT;
CREATE UNIQUE INDEX resumes_create_request ON resumes(user_id,create_request_id);
CREATE UNIQUE INDEX resumes_default ON resumes(user_id) WHERE is_default = 1;

CREATE TRIGGER resumes_select_default BEFORE UPDATE OF is_default ON resumes
WHEN NEW.is_default = 1 AND OLD.is_default = 0 BEGIN
  UPDATE resumes SET is_default = 0 WHERE user_id = NEW.user_id AND is_default = 1;
END;
CREATE TRIGGER resumes_insert_default BEFORE INSERT ON resumes
WHEN NEW.is_default = 1 BEGIN
  UPDATE resumes SET is_default = 0 WHERE user_id = NEW.user_id AND is_default = 1;
END;
CREATE TRIGGER resumes_track_revision AFTER UPDATE OF source,name,is_default,archived_at ON resumes
WHEN NEW.source IS NOT OLD.source OR NEW.name IS NOT OLD.name
  OR NEW.is_default IS NOT OLD.is_default OR NEW.archived_at IS NOT OLD.archived_at BEGIN
  UPDATE resumes SET revision = revision + 1, updated_at = unixepoch() WHERE id = NEW.id;
END;
CREATE TABLE career_records (
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
CREATE INDEX career_record_kind ON career_records(user_id,profile_id,kind,id);
CREATE TRIGGER career_insert_revision AFTER INSERT ON career_records BEGIN
  UPDATE resumes SET revision=revision+1,updated_at=unixepoch() WHERE id=NEW.profile_id AND user_id=NEW.user_id;
END;
CREATE TRIGGER career_edit_revision AFTER UPDATE ON career_records BEGIN
  UPDATE resumes SET revision=revision+1,updated_at=unixepoch() WHERE id=NEW.profile_id AND user_id=NEW.user_id;
END;
CREATE TRIGGER career_delete_revision AFTER DELETE ON career_records BEGIN
  UPDATE resumes SET revision=revision+1,updated_at=unixepoch() WHERE id=OLD.profile_id AND user_id=OLD.user_id;
END;
CREATE TRIGGER career_records_validate_insert BEFORE INSERT ON career_records BEGIN
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
CREATE TRIGGER career_records_validate_change BEFORE UPDATE OF data_json ON career_records BEGIN
  SELECT CASE WHEN json_extract(NEW.data_json,'$.related_role_id') IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM career_records WHERE user_id=NEW.user_id AND profile_id=NEW.profile_id
       AND id=json_extract(NEW.data_json,'$.related_role_id') AND kind='employment' AND id<>NEW.id)
    THEN RAISE(ABORT,'invalid related role') END;
  SELECT CASE WHEN json_extract(NEW.data_json,'$.related_project_id') IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM career_records WHERE user_id=NEW.user_id AND profile_id=NEW.profile_id
       AND id=json_extract(NEW.data_json,'$.related_project_id') AND kind='project' AND id<>NEW.id)
    THEN RAISE(ABORT,'invalid related project') END;
END;
