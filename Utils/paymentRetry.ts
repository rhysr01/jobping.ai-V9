interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt + 1
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (isNonRetryableError(lastError)) {
        return {
          success: false,
          error: lastError.message,
          attempts: attempt + 1
        };
      }

      // Don't delay after the last attempt
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    attempts: config.maxRetries + 1
  };
}

function isNonRetryableError(error: Error): boolean {
  const nonRetryableMessages = [
    'Invalid price ID',
    'User not found or email not verified',
    'Missing required fields',
    'Invalid email format',
    'Payment configuration error'
  ];

  return nonRetryableMessages.some(message => 
    error.message.toLowerCase().includes(message.toLowerCase())
  );
}

export async function createCheckoutSessionWithRetry(
  email: string,
  priceId: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const result = await retryWithBackoff(async () => {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, priceId, userId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.url) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    return data;
  });

  if (result.success && result.data) {
    return {
      success: true,
      url: result.data.url
    };
  }

  return {
    success: false,
    error: result.error || 'Payment setup failed after multiple attempts'
  };
}
