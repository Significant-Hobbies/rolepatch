-- Make current MCP permissions requestable by the legacy public ChatGPT registration.
-- The provider still checks each authorization against owner consent and token claims.
UPDATE oauthClient
SET scopes = '["offline_access","resume","profile:read","profile:write","answers:sensitive","applications:read","applications:write","materials:read","materials:write","resume:generate"]'
WHERE scopes = '["offline_access","resume"]'
  AND redirectUris = '["https://chatgpt.com/connector_platform_oauth_redirect"]'
  AND applicationType = 'web'
  AND tokenEndpointAuthMethod = 'none'
  AND clientSecret IS NULL
  AND COALESCE(skipConsent, 0) = 0
  AND disabled = 0
  AND grantTypes = '["authorization_code","refresh_token"]';

-- Better Auth's accepted, signed consent sets both resources and scopes. Keep the
-- approved scope history for that owner and MCP resource when linking another tool.
-- The owner's update-consent endpoint updates scopes only; delete-consent deletes.
CREATE TRIGGER IF NOT EXISTS chatgpt_mcp_incremental_consent
AFTER UPDATE OF resources ON oauthConsent
WHEN OLD.id = NEW.id AND OLD.clientId = NEW.clientId AND OLD.userId = NEW.userId
  AND OLD.referenceId IS NEW.referenceId
  AND OLD.resources = NEW.resources AND json_array_length(NEW.resources) = 1
  AND substr(json_extract(NEW.resources, '$[0]'), -8) = '/api/mcp'
  AND EXISTS (
    SELECT 1 FROM oauthClient WHERE clientId = NEW.clientId
      AND redirectUris = '["https://chatgpt.com/connector_platform_oauth_redirect"]'
      AND tokenEndpointAuthMethod = 'none' AND clientSecret IS NULL
      AND COALESCE(skipConsent, 0) = 0 AND COALESCE(disabled, 0) = 0
  )
BEGIN
  UPDATE oauthConsent SET scopes = (
    SELECT json_group_array(value) FROM (
      SELECT value FROM json_each(OLD.scopes)
      UNION
      SELECT value FROM json_each(NEW.scopes)
    )
  ) WHERE id = NEW.id;
END;
