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
