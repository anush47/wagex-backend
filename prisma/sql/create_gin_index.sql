-- GIN index for fast API key lookups via JSONB containment (@>) operator
-- This covers the exact expression used in verifyApiKey:
-- WHERE (p.settings -> 'attendance' -> 'apiKeys') @> $1::jsonb
CREATE INDEX CONCURRENTLY IF NOT EXISTS policies_gin_attendance_api_keys
ON public.policies
USING gin ((settings -> 'attendance' -> 'apiKeys'));
