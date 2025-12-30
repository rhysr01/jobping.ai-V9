export type PromoValidation = {
	isValid: boolean;
	reason?: string;
};

/**
 * Validates a promo code against environment configuration.
 * - PROMO_CODE: the single accepted code (defaults to 'rhys')
 * - PROMO_EMAIL_ALLOWLIST (optional): regex to restrict eligible emails
 */
export function validatePromoCode(
	code: string | undefined | null,
	email: string,
): PromoValidation {
	const configured = (process.env.PROMO_CODE || "rhys").toLowerCase();
	const provided = (code || "").toLowerCase().trim();

	if (!provided) return { isValid: false, reason: "missing_code" };
	if (provided !== configured)
		return { isValid: false, reason: "invalid_code" };

	const allowRegex = process.env.PROMO_EMAIL_ALLOWLIST;
	if (allowRegex) {
		try {
			const re = new RegExp(allowRegex);
			if (!re.test(email))
				return { isValid: false, reason: "email_not_allowed" };
		} catch {
			// If regex is bad, fail closed
			return { isValid: false, reason: "invalid_allowlist_regex" };
		}
	}

	return { isValid: true };
}
