// Retry with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;    // default 3
    baseDelayMs?: number;   // default 1000
    maxDelayMs?: number;    // default 10000
    retryableErrors?: string[]; // error messages/patterns that should trigger retry
  } = {}
): Promise<{ success: boolean; result?: T; error?: string; attempts: number }> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options;

  // Default retryable errors: network failures, timeouts, 5xx
  const retryablePatterns = options.retryableErrors || [
    'fetch failed',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'socket hang up',
    'network',
    '502', '503', '504',
    'rate limit',
    '429',
  ];

  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, result, attempts: attempt };
    } catch (err: any) {
      lastError = err.message || String(err);

      // Check if error is retryable
      const isRetryable = retryablePatterns.some(p =>
        lastError.toLowerCase().includes(p.toLowerCase())
      );

      // Don't retry non-retryable errors (4xx validation errors)
      if (!isRetryable) {
        return { success: false, error: lastError, attempts: attempt };
      }

      // Don't wait after last attempt
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return { success: false, error: lastError, attempts: maxRetries };
}

// Check if an error is a Shopify validation error (should NOT be retried)
export function isShopifyValidationError(error: string): boolean {
  return error.includes('422') || error.includes('400') || error.includes('is invalid');
}
