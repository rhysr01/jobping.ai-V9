/**
 * Centralized URL and Domain Helpers
 * Ensures consistent domain usage across the application
 */

/**
 * Get the base URL for the application
 * Priority: NEXT_PUBLIC_URL > NEXT_PUBLIC_DOMAIN > VERCEL_URL > fallback
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }
  if (process.env.NEXT_PUBLIC_DOMAIN) {
    return process.env.NEXT_PUBLIC_DOMAIN;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://getjobping.com';
}

/**
 * Get the email domain (always apex domain)
 */
export function getEmailDomain(): string {
  return (process.env.EMAIL_DOMAIN || 'getjobping.com').trim();
}

/**
 * Get the canonical domain (apex domain without www)
 */
export function getCanonicalDomain(): string {
  return 'getjobping.com';
}

/**
 * Get the unsubscribe email address
 */
export function getUnsubscribeEmail(): string {
  return `unsubscribe@${getEmailDomain()}`;
}

/**
 * Get the unsubscribe URL for a specific email
 */
export function getUnsubscribeUrl(email: string): string {
  return `${getBaseUrl()}/api/unsubscribe/one-click?email=${encodeURIComponent(email)}`;
}

/**
 * Get the List-Unsubscribe header value
 */
export function getListUnsubscribeHeader(): string {
  const baseUrl = getBaseUrl();
  const unsubscribeEmail = getUnsubscribeEmail();
  return `<${baseUrl}/api/email/unsubscribe?email={email}>, <mailto:${unsubscribeEmail}?subject=Unsubscribe>`;
}
