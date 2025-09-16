import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
};

export function getRequestId(req: NextRequest): string {
  const headerVal = req.headers.get('x-request-id');
  return headerVal && headerVal.length > 0 ? headerVal : cryptoRandomId();
}

export function errorJson(
  req: NextRequest,
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
) {
  const requestId = getRequestId(req);
  const body: ApiErrorBody = { code, message, details, requestId };
  const res = NextResponse.json(body, { status });
  res.headers.set('x-request-id', requestId);
  return res;
}

function cryptoRandomId(): string {
  // Use native crypto if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomUUID ? nodeCrypto.randomUUID() : nodeCrypto.randomBytes(16).toString('hex');
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}


