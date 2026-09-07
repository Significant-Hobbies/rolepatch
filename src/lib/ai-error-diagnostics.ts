const KNOWN_ERROR_NAMES = new Set([
  'Error',
  'TypeError',
  'AiError',
  'InferenceUpstreamError',
  'AI_APICallError',
  'AI_NoObjectGeneratedError',
  'AI_JSONParseError',
  'AI_TypeValidationError',
  'AI_UnsupportedFunctionalityError',
  'AI_InvalidArgumentError',
  'AI_RetryError',
]);

/** Bounded metadata only. Never include messages, URLs, bodies, headers, or stacks. */
export function getAIErrorDiagnostics(error: unknown): {
  type: string;
  statusCode: number | null;
  code: number | null;
  causeType: string | null;
} {
  const value = error !== null && typeof error === 'object' ? error : {};
  const record = value as {
    name?: unknown;
    statusCode?: unknown;
    code?: unknown;
    cause?: unknown;
    data?: { workersAIErrorCode?: unknown };
  };
  const cause = record.cause as { name?: unknown } | undefined;
  const safeName = (name: unknown) =>
    typeof name === 'string' && KNOWN_ERROR_NAMES.has(name) ? name : 'unknown';
  const safeNumber = (number: unknown) =>
    typeof number === 'number' && Number.isSafeInteger(number) && number >= 0 && number <= 999_999
      ? number
      : null;
  return {
    type: safeName(record.name),
    statusCode: safeNumber(record.statusCode),
    code: safeNumber(record.code) ?? safeNumber(record.data?.workersAIErrorCode),
    causeType: cause ? safeName(cause.name) : null,
  };
}
