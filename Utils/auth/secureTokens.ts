import crypto from 'crypto';

type TokenPurpose = 'preferences' | 'email_verification';

interface IssueTokenOptions {
  ttlMinutes?: number;
}

interface VerificationResult {
  valid: boolean;
  expiresAt?: number;
  reason?: string;
}

const PURPOSE_SECRETS: Record<TokenPurpose, string | undefined> = {
  preferences: process.env.PREFERENCES_SECRET,
  email_verification: process.env.EMAIL_VERIFICATION_SECRET,
};

function resolveSecret(purpose: TokenPurpose): string {
  const envSecret = PURPOSE_SECRETS[purpose];
  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }

  const fallback = process.env.INTERNAL_API_HMAC_SECRET;
  if (fallback && fallback.length >= 32) {
    return fallback;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'jobping-nonprod-secret-key';
  }

  throw new Error(`Missing secret for ${purpose} token generation`);
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url<T>(value: string): T {
  const json = Buffer.from(value, 'base64url').toString('utf8');
  return JSON.parse(json) as T;
}

function timingSafeEqual(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function issueSecureToken(
  email: string,
  purpose: TokenPurpose,
  options: IssueTokenOptions = {}
): string {
  const ttlMinutes = options.ttlMinutes ?? 60;
  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + ttlMinutes * 60_000;
  const secret = resolveSecret(purpose);
  const payload = `${purpose}:${normalizedEmail}:${expiresAt}`;

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const tokenPayload = {
    expiresAt,
    signature,
    purpose,
  };

  return toBase64Url(JSON.stringify(tokenPayload));
}

export function verifySecureToken(
  email: string,
  token: string | null | undefined,
  purpose: TokenPurpose
): VerificationResult {
  if (!token) {
    return { valid: false, reason: 'Token missing' };
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const payload = fromBase64Url<{ expiresAt: number; signature: string; purpose: string }>(token);

    if (payload.purpose !== purpose) {
      return { valid: false, reason: 'Token purpose mismatch' };
    }

    if (typeof payload.expiresAt !== 'number' || typeof payload.signature !== 'string') {
      return { valid: false, reason: 'Malformed token payload' };
    }

    if (payload.expiresAt < Date.now()) {
      return { valid: false, reason: 'Token expired' };
    }

    const secret = resolveSecret(purpose);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${purpose}:${normalizedEmail}:${payload.expiresAt}`)
      .digest('hex');

    const signatureMatches = timingSafeEqual(expectedSignature, payload.signature);

    if (!signatureMatches) {
      return { valid: false, reason: 'Invalid signature' };
    }

    return {
      valid: true,
      expiresAt: payload.expiresAt,
    };
  } catch (error) {
    return { valid: false, reason: 'Invalid token encoding' };
  }
}

export function describeTokenPurpose(purpose: TokenPurpose): string {
  switch (purpose) {
    case 'preferences':
      return 'preferences';
    case 'email_verification':
      return 'email verification';
    default:
      return purpose;
  }
}

