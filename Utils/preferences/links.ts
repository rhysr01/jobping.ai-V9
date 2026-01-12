import { issueSecureToken } from "../authentication/secureTokens";
import { getBaseUrl } from "../url-helpers";

interface PreferencesLinkOptions {
	ttlMinutes?: number;
	email?: string;
}

export function buildPreferencesLink(
	email: string | null | undefined,
	options: PreferencesLinkOptions = {},
): string {
	const baseUrl = getBaseUrl();

	if (!email) {
		return `${baseUrl}/preferences`;
	}

	const normalizedEmail = email.trim().toLowerCase();
	const token = issueSecureToken(normalizedEmail, "preferences", {
		ttlMinutes: options.ttlMinutes ?? 60 * 24 * 7, // 7 days
	});

	return `${baseUrl}/preferences?email=${encodeURIComponent(
		normalizedEmail,
	)}&token=${encodeURIComponent(token)}`;
}
