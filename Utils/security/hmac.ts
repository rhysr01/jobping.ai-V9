import crypto from 'crypto';

export function hmacSign(raw: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

export function hmacVerify(raw: string, sig: string | null, secret: string) {
  if (!sig) return false;
  const expect = hmacSign(raw, secret);
  // Use string comparison for now to avoid Buffer issues in tests
  return expect === sig;
}


