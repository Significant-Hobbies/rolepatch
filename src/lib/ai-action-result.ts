import { AIServiceError } from '@/lib/ai';

export type AIActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; retryable: boolean };

/** Preserve approved product errors; unexpected errors stay server-side. */
export function aiActionFailure(
  error: unknown
): Extract<AIActionResult<never>, { success: false }> {
  if (error instanceof AIServiceError) {
    return { success: false, error: error.message, retryable: error.retryable };
  }
  if (
    error instanceof Error &&
    [
      'No tokens remaining. Purchase more to continue.',
      'Authentication required to generate.',
      'Job or resume not found',
    ].includes(error.message)
  ) {
    return { success: false, error: error.message, retryable: false };
  }
  throw error;
}
