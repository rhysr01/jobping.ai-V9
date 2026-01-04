// PRODUCTION-READY EMAIL TEMPLATES (Premium Design)
// Safe for major clients: Gmail, Outlook, Apple Mail

import {
	FREE_ROLES_PER_SEND,
	PREMIUM_ROLES_PER_MONTH,
	PREMIUM_ROLES_PER_WEEK,
} from "../../lib/productMetrics";
import {
	calculateVisaConfidence,
	getVisaConfidenceLabel,
	// getVisaConfidenceStyle, // Kept for future use
} from "../../Utils/matching/visa-confidence";
import { issueSecureToken } from "../auth/secureTokens";
import { buildPreferencesLink } from "../preferences/links";
import { getBaseUrl } from "../url-helpers";
import type { EmailJobCard } from "./types";

// Inline constants and functions to avoid Turbopack module resolution issues
// These are copied from Utils/matching/categoryMapper.ts to avoid import problems
const CAREER_PATH_LABELS: Record<string, string> = {
	strategy: "Strategy & Business Design",
	data: "Data & Analytics",
	sales: "Sales & Client Success",
	marketing: "Marketing & Growth",
	finance: "Finance & Investment",
	operations: "Operations & Supply Chain",
	product: "Product & Innovation",
	tech: "Tech & Transformation",
	sustainability: "Sustainability & ESG",
	unsure: "Not Sure Yet / General",
};

const DATABASE_TO_FORM_MAPPING: Record<string, string> = {
	"strategy-business-design": "strategy",
	"finance-investment": "finance",
	"sales-client-success": "sales",
	"marketing-growth": "marketing",
	"data-analytics": "data",
	"operations-supply-chain": "operations",
	"product-innovation": "product",
	"tech-transformation": "tech",
	"sustainability-esg": "sustainability",
	"retail-luxury": "retail-luxury",
	entrepreneurship: "entrepreneurship",
	technology: "tech",
};

// Helper function to get career path label
const getCareerPathLabel = (value: string): string => {
	return CAREER_PATH_LABELS[value] || value;
};

// Helper function to map database category to form value
const mapDatabaseToForm = (databaseCategory: string): string => {
	return DATABASE_TO_FORM_MAPPING[databaseCategory] || databaseCategory;
};

const COLORS = {
	bg: "#0a0a0a",
	panel: "#000000",
	white: "#ffffff",
	gray100: "#f4f4f5",
	gray200: "#e4e4e7",
	gray300: "#d4d4d8",
	gray400: "#a1a1aa",
	gray500: "#71717a",
	gray600: "#52525b",
	purple: "#5B21B6", // brand-600 - darker purple
	indigo: "#5B21B6", // brand-600 - darker purple (consistent with brand)
	emerald: "#10b981",
	// Better contrast colors for text on dark backgrounds
	textPrimary: "#e4e4e7", // gray200 - WCAG AA compliant for main text
	textSecondary: "#d4d4d8", // gray300 - acceptable for secondary text
	textMuted: "#a1a1aa", // gray400 - only for very subtle elements
};

// Premium VML button for Outlook
function vmlButton(
	href: string,
	label: string,
	gradientFrom: string,
	gradientTo: string,
) {
	return `
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:50px;v-text-anchor:middle;width:300px;" arcsize="10%" fillcolor="${gradientFrom}" strokecolor="${gradientFrom}">
    <w:anchorlock/>
    <center style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:600;letter-spacing:0.2px;">${label}</center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-- -->
  <a href="${href}" target="_blank" rel="noopener noreferrer" class="gmail-button" style="display:inline-block !important;background:linear-gradient(135deg,${gradientFrom},${gradientTo}) !important;color:#ffffff !important;padding:16px 36px !important;border-radius:10px !important;text-decoration:none !important;font-weight:600 !important;font-size:16px !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif !important;box-shadow:0 4px 16px rgba(91,33,182,0.4) !important;margin-top:20px !important;letter-spacing:0.2px !important;-webkit-text-size-adjust:none !important;mso-hide:all;min-width:200px;text-align:center;">
${label}
  </a>
  <!--<![endif]-->
  `;
}

// Premium feedback button
// Kept for future use - exported to avoid unused function warning
export function _vmlFeedbackButton(
	href: string,
	label: string,
	gradientFrom: string,
	gradientTo: string,
) {
	return `
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:150px;" arcsize="12%" fillcolor="${gradientFrom}" strokecolor="${gradientFrom}">
    <w:anchorlock/>
    <center style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;">${label}</center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-- -->
  <a href="${href}" target="_blank" rel="noopener noreferrer" class="gmail-button" style="display:inline-block !important;background:linear-gradient(135deg,${gradientFrom},${gradientTo}) !important;color:#ffffff !important;padding:12px 24px !important;border-radius:8px !important;text-decoration:none !important;font-weight:600 !important;font-size:14px !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif !important;box-shadow:0 3px 12px rgba(91,33,182,0.3) !important;min-width:130px !important;text-align:center !important;-webkit-text-size-adjust:none !important;mso-hide:all;">
${label}
  </a>
  <!--<![endif]-->
  `;
}

// Per-job feedback buttons (thumbs up/down)
function vmlJobFeedbackButtons(
	jobHash: string,
	email: string,
	baseUrl: string,
	campaign: string,
) {
	if (!jobHash) return "";

	const feedbackBase = `${baseUrl}/api/feedback/enhanced`;
	const feedbackParams = `utm_source=jobping&utm_medium=email&utm_campaign=${campaign}&utm_content=job_feedback`;

	// Create POST request URLs - these will need to be handled via a redirect page or API
	// For email compatibility, we'll use GET with a redirect handler
	const thumbsUpUrl = `${feedbackBase}?jobHash=${encodeURIComponent(jobHash)}&email=${encodeURIComponent(email)}&feedbackType=thumbs_up&source=email&${feedbackParams}`;
	const thumbsDownUrl = `${feedbackBase}?jobHash=${encodeURIComponent(jobHash)}&email=${encodeURIComponent(email)}&feedbackType=thumbs_down&source=email&${feedbackParams}`;

	return `
  <div class="feedback-buttons-mobile">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0 0; width:100%;">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto; width:100%; max-width:400px;">
            <tr>
              <td align="center" style="padding:0 6px 0 0;">
                <a href="${thumbsUpUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block !important;background:rgba(16,185,129,0.15) !important;border:1px solid rgba(16,185,129,0.4) !important;color:#10b981 !important;padding:12px 24px !important;border-radius:8px !important;text-decoration:none !important;font-weight:600 !important;font-size:13px !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif !important;-webkit-text-size-adjust:none !important;mso-hide:all;transition:all 0.2s ease;">
                  👍 Good match
                </a>
              </td>
              <td align="center" style="padding:0 0 0 6px;">
                <a href="${thumbsDownUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block !important;background:rgba(239,68,68,0.15) !important;border:1px solid rgba(239,68,68,0.4) !important;color:#ef4444 !important;padding:12px 24px !important;border-radius:8px !important;text-decoration:none !important;font-weight:600 !important;font-size:13px !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif !important;-webkit-text-size-adjust:none !important;mso-hide:all;transition:all 0.2s ease;">
                  👎 Not for me
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
}

// Premium wrapper with enhanced styling
function formatSource(source?: string): string | undefined {
	if (!source) return undefined;
	const cleaned = String(source).replace(/[_-]/g, " ");
	return cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1);
}

function formatSalary(job: Record<string, any>): string | undefined {
	const min =
		job.salary_min ?? job.salaryMin ?? job.salary ?? job.compensation_min;
	const max = job.salary_max ?? job.salaryMax ?? job.compensation_max;
	const currency = job.salary_currency ?? job.currency ?? "€";
	if (!min && !max) return undefined;
	const formatNumber = (raw: number) => {
		if (raw === null || raw === undefined) return undefined;
		const value = Number(raw);
		if (!Number.isFinite(value)) return undefined;
		if (value >= 1000) return `${Math.round(value / 1000)}k`;
		if (value % 1 === 0) return value.toString();
		return value.toFixed(0);
	};
	const formattedMin = formatNumber(Number(min));
	const formattedMax = formatNumber(Number(max));
	if (formattedMin && formattedMax)
		return `${currency}${formattedMin}–${formattedMax}`;
	if (formattedMin) return `${currency}${formattedMin}+`;
	if (formattedMax) return `Up to ${currency}${formattedMax}`;
	return undefined;
}

function formatJobTags(job: Record<string, any>): string[] {
	const tags = new Set<string>();
	const addTag = (value?: string) => {
		if (!value) return;
		const trimmed = value.toString().trim();
		if (trimmed.length === 0) return;
		tags.add(trimmed);
	};

	// Helper function to convert database category to readable tag
	// Uses shared label mapping for consistency with rest of application
	const formatCategoryTag = (category: string): string => {
		if (!category) return "";
		// Skip non-career-path categories like "early-career", "internship"
		if (
			["early-career", "internship", "graduate", "experienced"].includes(
				category.toLowerCase(),
			)
		) {
			return "";
		}

		// Use shared label mapping for better-worded labels (e.g., "Tech & Transformation")
		// First try to get label for simple form value
		let label = getCareerPathLabel(category);
		if (label !== category) return label;

		// If not found, might be a database category (hyphenated) - convert to form value first
		const formValue = mapDatabaseToForm(category);
		label = getCareerPathLabel(formValue);
		if (label !== formValue) return label;

		// Fallback: if still not found, use simple capitalization
		return category.charAt(0).toUpperCase() + category.slice(1);
	};

	// Extract career path from multiple possible sources
	// Priority: career_path > careerPath > primary_category > categories array
	let careerPath = job.career_path ?? job.careerPath ?? job.primary_category;

	// If no direct career path, try to extract from categories array
	if (
		!careerPath &&
		Array.isArray(job.categories) &&
		job.categories.length > 0
	) {
		// Find first career-path category (skip "early-career", "internship", etc.)
		const categoryWithCareerPath = job.categories.find(
			(cat: string) =>
				cat?.includes("-") &&
				!["early-career", "internship", "graduate", "experienced"].includes(
					cat.toLowerCase(),
				),
		);
		if (categoryWithCareerPath) {
			careerPath = formatCategoryTag(categoryWithCareerPath);
		}
	}
	if (careerPath) {
		const formatted = formatCategoryTag(careerPath);
		if (formatted) addTag(formatted);
	}

	// Add additional career paths from array (limit to 1 more to keep tags concise)
	if (Array.isArray(job.career_paths)) {
		job.career_paths.slice(0, 1).forEach((path: string) => {
			const formatted = formatCategoryTag(path);
			if (formatted) addTag(formatted);
		});
	} else if (Array.isArray(job.categories) && careerPath) {
		// Add one more category if available (skip if already added)
		const additionalCategory = job.categories.find(
			(cat: string) =>
				cat?.includes("-") &&
				!["early-career", "internship", "graduate", "experienced"].includes(
					cat.toLowerCase(),
				) &&
				formatCategoryTag(cat) !== formatCategoryTag(careerPath),
		);
		if (additionalCategory) {
			const formatted = formatCategoryTag(additionalCategory);
			if (formatted) addTag(formatted);
		}
	}

	const workEnv = job.work_arrangement ?? job.work_environment ?? job.work_mode;
	if (workEnv) {
		addTag(
			workEnv
				.toString()
				.replace(/_/g, " ")
				.replace(/\b\w/g, (char: string) => char.toUpperCase()),
		);
	}

	const employment = job.employment_type ?? job.job_type ?? job.contract_type;
	if (employment) {
		addTag(
			employment
				.toString()
				.replace(/_/g, " ")
				.replace(/\b\w/g, (char: string) => char.toUpperCase()),
		);
	}

	const source = formatSource(job.source);
	if (source) addTag(`via ${source}`);

	const language =
		job.language_requirement ?? job.language ?? job.primary_language;
	if (language) addTag(`${language.toString()} role`);

	const salaryTag = formatSalary(job);
	if (salaryTag) addTag(salaryTag);

	return Array.from(tags).slice(0, 3);
}

function wrapEmail(title: string, body: string, footerEmail?: string): string {
	const baseUrl = getBaseUrl();
	const preferencesLink = buildPreferencesLink(footerEmail);
	return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${title}</title>
  <!-- Gmail preheader text - optimized for Gmail preview -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    Fresh job matches tailored just for you. Hand-picked opportunities waiting.
  </div>
  <!-- Gmail app preview text -->
  <span style="display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; font-size: 0; line-height: 0; max-height: 0; max-width: 0; mso-hide: all;">Fresh job matches tailored just for you. Hand-picked opportunities waiting.</span>
  <style>
    /* Client resets */
    html, body { margin:0; padding:0; }
    img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    table { border-collapse:collapse !important; }
    body, table, td, a { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
    * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

    /* Layout */
    .container { width:100%; background:${COLORS.bg}; padding:20px 0; }
    .shell { width:100%; max-width:600px; margin:0 auto; background:${COLORS.panel}; border-radius:12px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.4); }
    .header { background:linear-gradient(135deg,${COLORS.purple} 0%,#6D28D9 50%,${COLORS.purple} 100%); padding:48px 40px; text-align:center; position:relative; }
    .header::before { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background:radial-gradient(circle at 30% 20%,rgba(255,255,255,0.1),transparent 60%); pointer-events:none; }
    .logo { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-weight:700; font-size:38px; color:${COLORS.white}; letter-spacing:-0.8px; text-shadow:0 2px 12px rgba(0,0,0,0.3); margin:0 0 10px 0; position:relative; z-index:1; }
    .tag { color:${COLORS.white}; opacity:0.95; font-size:12px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; position:relative; z-index:1; }
    .content { padding:48px 40px; }
    .title { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:${COLORS.white}; font-size:28px; font-weight:700; letter-spacing:-0.5px; margin:0 0 24px 0; line-height:1.3; }
    .text { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:${COLORS.textPrimary}; font-size:16px; line-height:1.75; margin:0 0 28px 0; }
    
    /* Gmail-specific optimizations */
    .gmail-fix { min-width: 600px !important; }
    .gmail-spacing { mso-line-height-rule: exactly; line-height: 1.6 !important; }
    .gmail-table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    
    /* Gmail dark mode support */
    [data-ogsc] .header { background: linear-gradient(135deg,${COLORS.purple} 0%,#6D28D9 50%,${COLORS.purple} 100%) !important; }
    [data-ogsc] .card { background: #1a1a1a !important; border-color: rgba(91,33,182,0.25) !important; }
    [data-ogsc] .text { color: ${COLORS.textPrimary} !important; }
    
    /* Gmail mobile app fixes */
    u + .body .gmail-fix { min-width: 0 !important; }
    .mobile-hide { display: block !important; }
    @media only screen and (max-width: 600px) {
      .mobile-hide { display: none !important; }
      .gmail-fix { min-width: 100% !important; width: 100% !important; }
    }
    
    /* Gmail button rendering fix */
    .gmail-button { 
      display: inline-block !important;
      text-decoration: none !important;
      -webkit-text-size-adjust: none !important;
      mso-hide: all;
    }
    
    /* Prevent Gmail from auto-linking */
    .no-link { color: inherit !important; text-decoration: none !important; }
    .pill { display:inline-block; background:rgba(0,0,0,0.3); color:${COLORS.white}; border:1px solid rgba(255,255,255,0.2); padding:10px 22px; border-radius:999px; font-weight:600; font-size:14px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; box-shadow:0 4px 20px rgba(0,0,0,0.2); margin-bottom:28px; backdrop-filter:blur(10px); }

    /* Premium Card Design */
    .card { background:#1a1a1a; border:1px solid rgba(91,33,182,0.25); border-radius:16px; padding:32px; margin:0 0 32px 0; box-shadow:0 4px 24px rgba(0,0,0,0.3); transition:all 0.2s ease; }
    .card.hot { border:2px solid rgba(16,185,129,0.4); background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.08)); box-shadow:0 8px 40px rgba(16,185,129,0.25); }
    .badge { display:inline-block; background:linear-gradient(135deg,#10b981,#059669); color:#fff; padding:8px 18px; border-radius:8px; font-weight:600; font-size:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; margin-bottom:20px; letter-spacing:0.3px; text-transform:uppercase; box-shadow:0 2px 8px rgba(16,185,129,0.3); }
    .job { color:${COLORS.white}; font-weight:600; font-size:22px; margin:0 0 12px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; line-height:1.4; letter-spacing:-0.3px; }
    .company { color:${COLORS.textPrimary}; font-weight:500; font-size:16px; margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
    .loc { color:${COLORS.textSecondary}; font-size:14px; margin:0 0 20px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
    .desc { color:${COLORS.textSecondary}; font-size:15px; line-height:1.75; margin:20px 0 28px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
    .score { display:inline-block; background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; padding:7px 16px; border-radius:8px; font-weight:600; font-size:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; margin-bottom:18px; letter-spacing:0.3px; box-shadow:0 2px 8px rgba(59,130,246,0.3); }

    .footer { border-top:1px solid rgba(91,33,182,0.15); padding:40px 20px; text-align:center; background:#050505; }
    .footer-logo { color:${COLORS.purple}; font-weight:600; font-size:16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; margin-bottom:10px; }
    .footer-text { color:${COLORS.textSecondary}; font-size:13px; margin:8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
    .footer-link { color:#667eea; text-decoration:none; font-weight:600; }
    .footer-link:hover { color:#5B21B6; text-decoration:underline; }
    a { color:#5B21B6; text-decoration:none; }
    a:hover { color:#6D28D9; text-decoration:underline; }

    /* Gmail mobile optimizations */
    @media only screen and (max-width:600px) { 
      .container { padding:0 !important; }
      .shell { border-radius:0 !important; max-width: 100% !important; }
      .content { padding:32px 20px !important; } 
      .header { padding:40px 24px !important; }
      .logo { font-size:32px !important; }
      .tag { font-size:11px !important; }
      .title { font-size:24px !important; line-height: 1.3 !important; margin-bottom:16px !important; }
      .card { padding:24px 20px !important; margin-bottom: 24px !important; border-radius:12px !important; }
      .job { font-size:20px !important; line-height: 1.3 !important; }
      .text { font-size:15px !important; line-height: 1.7 !important; margin-bottom:24px !important; }
      .badge, .score { font-size:11px !important; padding:7px 14px !important; }
      .pill { font-size:13px !important; padding:10px 20px !important; margin-bottom:24px !important; }
      /* Force company name to wrap on mobile - use class-based approach */
      .company-name-mobile { text-align:left !important; display:block !important; width:100% !important; margin-top:10px !important; }
      /* Full-width buttons on mobile for better tap targets */
      .gmail-button { width:100% !important; display:block !important; padding:18px 24px !important; font-size:16px !important; margin-top:16px !important; }
      /* Better spacing for feedback buttons on mobile */
      .feedback-buttons-mobile table { width:100% !important; }
      .feedback-buttons-mobile td { display:block !important; width:100% !important; padding:0 0 8px 0 !important; }
      .feedback-buttons-mobile a { width:100% !important; display:block !important; padding:14px 20px !important; text-align:center !important; }
      /* Footer mobile adjustments */
      .footer { padding:32px 20px !important; }
    }
    
    /* Gmail desktop web client */
    @media screen and (min-width: 601px) {
      .gmail-fix { width: 600px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:${COLORS.bg}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <!-- Gmail wrapper fix -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    Fresh job matches tailored just for you. Hand-picked opportunities waiting.
  </div>
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${COLORS.bg};">
    <tr>
      <td>
  <![endif]-->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="container gmail-table" style="width:100%; background-color:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:20px 0; background-color:${COLORS.bg};">
        <!--[if mso]>
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color:${COLORS.panel};">
        <![endif]-->
        <!--[if !mso]><!-- -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="shell gmail-fix gmail-table" style="max-width:600px; background-color:${COLORS.panel};">
        <!--<![endif]-->
          <tr>
            <td class="header">
              <div class="logo">JobPing</div>
              <div class="tag">AI Powered Job Matching for Europe</div>
            </td>
          </tr>
          ${body}
          <tr>
            <td class="footer">
              <div class="footer-logo">JobPing</div>
              <div class="footer-text" style="color:${COLORS.textSecondary}; font-size:12px; margin-bottom:8px;">
                JobPing Ltd<br />
                77 Camden Street Lower, Dublin D02 XE80, Ireland
              </div>
              <div class="footer-text" style="color:${COLORS.textSecondary}; font-size:12px; margin-bottom:12px;">
                Questions? Email: <a class="footer-link" href="mailto:contact@getjobping.com" style="color:#5B21B6;">contact@getjobping.com</a>
              </div>
              <div class="footer-text">
                <a class="footer-link" href="${baseUrl}/legal/unsubscribe?utm_source=email&utm_medium=footer&utm_campaign=${footerEmail ? "user_email" : "anonymous"}">Unsubscribe</a> · 
                <a class="footer-link" href="${preferencesLink}" style="color:#5B21B6;">Update Preferences</a> · 
                <a class="footer-link" href="${baseUrl}/legal/privacy" style="color:#5B21B6;">Privacy Policy</a>
              </div>
              <div class="footer-text" style="color:${COLORS.textSecondary}; font-size:12px; margin-top:12px;">
                You're receiving this because you created a JobPing account. Prefer the browser? Copy &amp; paste <a class="footer-link" href="${baseUrl}">${baseUrl}</a>
              </div>
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
  <!--[if mso]>
  </td>
  </tr>
  </table>
  <![endif]-->
</body>
</html>
  `.trim();
}

export function createWelcomeEmail(
	userName?: string,
	matchCount: number = 5,
	userEmail?: string,
): string {
	const displayName = userName?.trim() ? userName.trim() : "there";
	const friendName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
	const matchesLabel = matchCount === 1 ? "match" : "matches";
	const body = `
  <tr>
    <td class="content" align="center">
      <div class="pill">${matchCount} new ${matchesLabel} already picked for you <span role="img" aria-label="target">🎯</span></div>
      <h1 class="title">Welcome, ${friendName}! <span role="img" aria-label="rocket">🚀</span></h1>
      <p class="text">We're here to get you into a high-quality EU early-career role - no job board scrolling, no generic blasts.</p>
      <p class="text">You'll receive your first ${matchesLabel} within the next 24 hours, then fresh, hand-curated drops every week. Each one is filtered against your preferences so you only see roles you can realistically land.</p>
      <p class="text">Quick start:</p>
      <ul style="color:${COLORS.textSecondary}; font-size:15px; line-height:1.7; text-align:left; margin:0 auto 28px auto; max-width:420px; padding:0 0 0 18px;">
        <li style="margin-bottom:8px;">Whitelist <strong style="color:${COLORS.white};">hello@getjobping.com</strong> so nothing hits spam</li>
        <li style="margin-bottom:8px;">Complete your preferences if anything has changed</li>
        <li>Reply to this email if you want us to refine your matches further</li>
      </ul>
      <p class="text" style="color:${COLORS.textSecondary}; font-size:13px; margin-top:20px;">Need help? <a href="${getBaseUrl()}" style="color:#5B21B6; text-decoration:underline;">Visit JobPing</a></p>
      <p class="text" style="color:${COLORS.textSecondary}; font-size:14px; margin-top:28px;">Need to tweak anything? <a href="${buildPreferencesLink(userEmail)}" style="color:#5B21B6; text-decoration:underline;">Update your preferences</a> any time - or reply to this email and we'll handle it for you.</p>
    </td>
  </tr>`;
	return wrapEmail("Welcome to JobPing", body, userEmail);
}

/**
 * Creates job matches email template
 * NOTE: This is PREMIUM-ONLY. Free users get instant matches on /matches page, not emails.
 *
 * @param jobCards - Array of job cards to display in the email
 * @param userName - Optional user name for personalization
 * @param subscriptionTier - User's subscription tier (default: 'premium')
 * @param isSignupEmail - Whether this is a signup email (default: false)
 * @param userEmail - Optional user email for links
 * @param userPreferences - Optional user preferences for profile section
 */
export function createJobMatchesEmail(
	jobCards: EmailJobCard[],
	userName?: string,
	subscriptionTier: "free" | "premium" = "premium", // Default to premium since free users don't get emails
	isSignupEmail: boolean = false,
	userEmail?: string,
	userPreferences?: {
		career_path?: string | string[];
		target_cities?: string[];
		visa_status?: string;
		entry_level_preference?: string;
		work_environment?: string | string[];
	},
): string {
	const matchesCount = jobCards.length;
	const title = isSignupEmail
		? `Your first ${matchesCount} matches just landed!`
		: `Your ${matchesCount} new ${matchesCount === 1 ? "match" : "matches"} are ready`;
	const campaign = `${subscriptionTier}-${isSignupEmail ? "signup" : "weekly"}-matches`;
	const baseUrl = getBaseUrl();
	// Build personalized profile section
	const buildProfileSection = (): string => {
		if (!userPreferences) return "";

		const profileItems: string[] = [];

		// Career path
		if (userPreferences.career_path) {
			const careerPaths = Array.isArray(userPreferences.career_path)
				? userPreferences.career_path
				: [userPreferences.career_path];
			const careerPathLabels = careerPaths
				.map((path) => getCareerPathLabel(path))
				.filter(Boolean);
			if (careerPathLabels.length > 0) {
				profileItems.push(
					`<strong>Career Path:</strong> ${careerPathLabels.join(", ")}`,
				);
			}
		}

		// Cities
		if (
			userPreferences.target_cities &&
			userPreferences.target_cities.length > 0
		) {
			const cities = userPreferences.target_cities.slice(0, 5).join(", ");
			const moreCities =
				userPreferences.target_cities.length > 5
					? ` + ${userPreferences.target_cities.length - 5} more`
					: "";
			profileItems.push(`<strong>Cities:</strong> ${cities}${moreCities}`);
		}

		// Visa status
		if (userPreferences.visa_status) {
			const visaLabels: Record<string, string> = {
				"eu-citizen": "EU Citizen",
				"non-eu-visa-required": "Visa Sponsorship Required",
				"non-eu-no-visa": "No Visa Required",
			};
			const visaLabel =
				visaLabels[userPreferences.visa_status] || userPreferences.visa_status;
			profileItems.push(`<strong>Visa:</strong> ${visaLabel}`);
		}

		// Entry level preference
		if (userPreferences.entry_level_preference) {
			const entryLabels: Record<string, string> = {
				internship: "Internships",
				graduate: "Graduate Programs",
				"entry-level": "Entry Level",
				junior: "Junior Roles",
			};
			const entryLabel =
				entryLabels[userPreferences.entry_level_preference] ||
				userPreferences.entry_level_preference;
			profileItems.push(`<strong>Level:</strong> ${entryLabel}`);
		}

		// Work environment
		if (userPreferences.work_environment) {
			const workEnvs = Array.isArray(userPreferences.work_environment)
				? userPreferences.work_environment
				: typeof userPreferences.work_environment === "string"
					? userPreferences.work_environment.split(",").map((e) => e.trim())
					: [];
			if (workEnvs.length > 0) {
				profileItems.push(
					`<strong>Work Style:</strong> ${workEnvs.join(", ")}`,
				);
			}
		}

		if (profileItems.length === 0) return "";

		return `
      <div style="background:rgba(91,33,182,0.15); border:1px solid rgba(91,33,182,0.35); border-radius:12px; padding:24px; margin:28px 0; font-size:14px; line-height:1.8;">
        <div style="color:${COLORS.textPrimary}; font-weight:600; margin-bottom:16px; font-size:15px; letter-spacing:0.2px;">📋 Your Profile</div>
        <div style="color:${COLORS.textSecondary}; line-height:1.9;">
          ${profileItems.join("<br style='margin-bottom:4px;' />")}
        </div>
      </div>
    `;
	};

	const header = `
  <tr>
    <td class="content" align="left">
      ${subscriptionTier === "premium" ? '<div class="badge" style="margin-bottom:28px;">⭐ Premium Member</div>' : ""}
      <h1 class="title">${title} <span role="img" aria-label="sparkles">✨</span></h1>
      <p class="text">${userName ? `${userName}, ` : ""}here's what our matcher surfaced for you today. Every role below cleared the filters you set - location, career path, visa, and early-career fit.</p>
      ${buildProfileSection()}
      <p class="text" style="color:${COLORS.textSecondary}; font-size:15px;">Review the highlights, tap through to apply, and let us know if anything feels off - your feedback powers the next batch.</p>
    </td>
  </tr>`;
	// const _formatTagsMarkup = (job: Record<string, any>) => {
	// 	const tags = formatJobTags(job);

	// 	// Add visa confidence tag if available
	// 	if (job.visa_confidence && job.visa_confidence !== "unknown") {
	// 		const visaLabel =
	// 			job.visa_confidence_label ||
	// 			getVisaConfidenceLabel(job.visa_confidence);
	// 		const style = getVisaConfidenceStyle(job.visa_confidence);

	// 		// Use hex codes directly for email compatibility
	// 		const visaTag = `<span style="display:inline-block; margin:0 8px 8px 0; padding:6px 12px; border-radius:999px; background-color:${style.emailBgColor}; color:${style.emailTextColor}; font-size:13px; font-weight:600; letter-spacing:0.2px; border:1px solid ${style.emailBorderColor};">${style.icon} ${visaLabel}</span>`;
	// 		tags.push(visaTag);
	// 	}

	// 	if (!tags.length) return "";
	// 	const tagItems = tags
	// 		.map(
	// 			(tag) =>
	// 				`<li style="display:inline-block; margin:0 8px 8px 0; padding:6px 12px; border-radius:999px; background:rgba(91,33,182,0.15); color:${COLORS.gray300}; font-size:13px; font-weight:600; letter-spacing:0.2px;">${tag}</li>`,
	// 		)
	// 		.join("");
	// 	return `<ul style="margin:16px 0 12px 0; padding:0; list-style:none;">${tagItems}</ul>`;
	// };

	// Function to generate unique match reason for each job - uses REAL user preferences
	const generateUniqueMatchReason = (
		job: Record<string, any>,
		matchResult: any,
		index: number,
	): string => {
		// Use database reasoning if available (from AI matching) - this is already personalized
		if (matchResult?.reasoning || matchResult?.match_reason) {
			return matchResult.reasoning || matchResult.match_reason;
		}

		// Generate unique reason based on job details AND user's actual preferences
		const company = job.company || "This company";
		const location = job.location
			? job.location.split(",")[0]
			: "your preferred location";
		const workEnv =
			job.work_arrangement || job.work_environment || job.work_mode || "hybrid";
		const isGraduate = job.is_graduate || job.isGraduate || false;
		// const _isInternship = job.is_internship || job.isInternship || false;

		// Get user's actual career path from preferences
		const userCareerPath = userPreferences?.career_path
			? Array.isArray(userPreferences.career_path)
				? userPreferences.career_path[0]
				: userPreferences.career_path
			: "Strategy"; // Fallback to Strategy if not provided

		const careerPathLabel =
			getCareerPathLabel(userCareerPath) || "your career path";

		// Get user's actual entry level preference
		const entryLevel = userPreferences?.entry_level_preference || "entry-level";
		const entryLevelText =
			entryLevel === "graduate"
				? "recent graduates"
				: entryLevel === "internship"
					? "interns"
					: "entry-level candidates";

		// Get user's actual visa status
		const visaStatus = userPreferences?.visa_status || "non-eu-visa-required";
		const visaText =
			visaStatus === "eu-citizen"
				? "EU citizen-friendly"
				: "visa sponsorship available";

		// Generate personalized reasons based on user's actual preferences
		const reasons = [
			`Perfect for your ${careerPathLabel} career path. ${company}'s practice focuses on projects that align with your interests. Located in ${location}, ${visaText}, and requires no prior experience - ideal for ${entryLevelText}.`,
			`Hot match! ${company}'s ${isGraduate ? "Graduate Programme" : "program"} is specifically designed for ${entryLevelText} like you. The ${workEnv.toLowerCase()} work arrangement fits your preferences, and the role is in ${location} with ${visaText}. Perfect entry point into ${careerPathLabel}.`,
			`${company}'s team specializes in work that matches your ${careerPathLabel} career path. The role is based in ${location} with ${visaText}, and the ${workEnv.toLowerCase()} setup aligns with your preferences. ${isGraduate ? "Graduate-friendly" : "Entry-level friendly"} with comprehensive training.`,
			`Great match for ${careerPathLabel}. ${company} offers structured training for ${entryLevelText}, located in ${location} with ${visaText}. The ${workEnv.toLowerCase()} arrangement provides flexibility, and the role focuses on projects you're interested in.`,
			`Strong alignment with your ${careerPathLabel} goals. ${company}'s team offers clear progression paths for ${entryLevelText}. Located in ${location} with ${visaText}, ${workEnv.toLowerCase()} work style, and ${isGraduate ? "graduate-friendly" : "entry-level friendly"} with excellent training support.`,
		];

		return (
			reasons[index % reasons.length] ||
			`Matches your preferences: ${location}, ${careerPathLabel} career path, ${visaText}, and ${isGraduate ? "graduate" : "entry-level"} friendly.`
		);
	};

	const items = jobCards
		.map((c, index) => {
			// Handle score as decimal (0.97) or percentage (97)
			const rawScore = c.matchResult?.match_score ?? 85;
			const score =
				rawScore < 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
			const hot = score >= 92;
			const currentJobHash = c.job.job_hash || "";
			const jobUrl = c.job.job_url || c.job.url || c.job.apply_url || "";

			// Generate evidence page link with JWT token (7-day expiry)
			let evidenceHref = "";
			if (currentJobHash && userEmail) {
				try {
					const token = issueSecureToken(userEmail, "match_evidence", {
						ttlMinutes: 7 * 24 * 60,
					}); // 7 days
					evidenceHref = `${baseUrl}/matches/${encodeURIComponent(currentJobHash)}?email=${encodeURIComponent(userEmail)}&token=${encodeURIComponent(token)}&utm_source=jobping&utm_medium=email&utm_campaign=${campaign}&utm_content=evidence_page`;
				} catch (error) {
					console.warn(
						"Failed to generate evidence token, falling back to direct link",
						error,
					);
					// Fallback to direct job URL if token generation fails
					evidenceHref = jobUrl
						? `${jobUrl}${jobUrl.includes("?") ? "&" : "?"}utm_source=jobping&utm_medium=email&utm_campaign=${campaign}&utm_content=apply_button`
						: "";
				}
			} else {
				// Fallback to direct job URL if no job hash
				evidenceHref = jobUrl
					? `${jobUrl}${jobUrl.includes("?") ? "&" : "?"}utm_source=jobping&utm_medium=email&utm_campaign=${campaign}&utm_content=apply_button`
					: "";
			}

			const apply = evidenceHref
				? vmlButton(
						evidenceHref,
						"View Match Evidence →",
						COLORS.indigo,
						COLORS.purple,
					)
				: "";
			const plainLink = evidenceHref
				? `<p class="text" style="color:${COLORS.textSecondary}; font-size:13px; margin-top:20px; line-height:1.6;">Button not working? Paste this link:<br /><a href="${evidenceHref}" style="color:#5B21B6; text-decoration:underline; word-break:break-all; font-size:12px;">${evidenceHref.substring(0, 80)}...</a></p>`
				: "";

			// Calculate visa confidence for this job (still need description for visa detection)
			const visaConfidence = calculateVisaConfidence({
				description: c.job.description || "",
				title: c.job.title,
				company: c.job.company,
				visa_friendly: c.job.visa_friendly,
				visa_sponsorship: c.job.visa_sponsorship,
			});

			// Add visa confidence to job object for formatTagsMarkup
			const jobWithVisaConfidence = {
				...c.job,
				visa_confidence: visaConfidence.confidence,
				visa_confidence_label: getVisaConfidenceLabel(
					visaConfidence.confidence,
				),
			};

			// Short description (max 120 chars)
			const shortDesc = c.job.description
				? c.job.description.length > 120
					? `${c.job.description.slice(0, 120)}…`
					: c.job.description
				: "";
			const descMarkup = shortDesc
				? `<div style="color:${COLORS.textSecondary}; font-size:15px; line-height:1.75; margin:16px 0 20px 0;">${shortDesc}</div>`
				: "";

			// Limit tags to 2 most important
			const tags = formatJobTags(jobWithVisaConfidence).slice(0, 2);
			const tagsMarkup =
				tags.length > 0
					? `<div style="margin:16px 0 20px 0;">
          ${tags.map((tag) => `<span style="display:inline-block; margin:0 8px 8px 0; padding:7px 14px; border-radius:6px; background:rgba(91,33,182,0.25); color:${COLORS.textPrimary}; font-size:12px; font-weight:600; border:1px solid rgba(91,33,182,0.3);">${tag}</span>`).join("")}
        </div>`
					: "";

			// Get job_hash and email for feedback buttons
			const jobHash = c.job.job_hash || c.job.jobHash || "";
			const emailForFeedback = userEmail || c.job.user_email || "";
			const feedbackButtons = jobHash
				? vmlJobFeedbackButtons(jobHash, emailForFeedback, baseUrl, campaign)
				: "";

			// Add tracking pixel for email impressions (shown signal)
			let trackingPixel = "";
			if (jobHash && emailForFeedback) {
				try {
					const token = issueSecureToken(emailForFeedback, "match_evidence", {
						ttlMinutes: 7 * 24 * 60,
					});
					trackingPixel = `<img src="${baseUrl}/api/tracking/pixel?jobHash=${encodeURIComponent(jobHash)}&email=${encodeURIComponent(emailForFeedback)}&token=${encodeURIComponent(token)}" width="1" height="1" style="display:none;" alt="" />`;
				} catch (_error) {
					// Fail silently - tracking pixel is optional
				}
			}

			return `
    <tr><td class="content">
      <div class="card${hot ? " hot" : ""}" style="background:${hot ? "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.08))" : "#1a1a1a"}; border:1px solid ${hot ? "rgba(16,185,129,0.4)" : "rgba(91,33,182,0.25)"}; border-radius:12px; padding:28px; margin-bottom:32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:16px;">
                <tr>
                  <td style="padding:0; vertical-align:top;">
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <span style="display:inline-block; padding:8px 16px; border-radius:8px; background:${hot ? "rgba(16,185,129,0.2)" : "rgba(91,33,182,0.2)"}; color:${hot ? COLORS.emerald : COLORS.purple}; font-size:13px; font-weight:700; border:1px solid ${hot ? "rgba(16,185,129,0.4)" : "rgba(91,33,182,0.35)"}; letter-spacing:0.3px;">
                    ${hot ? "🔥 " : ""}${score}% Match
                  </span>
                      ${(() => {
												const matchReason = generateUniqueMatchReason(
													c.job,
													c.matchResult,
													index,
												);
												if (matchReason) {
													// "Why this score?" link - shows personalization is happening
													// In email, this links to the match reason section below (which is always shown)
													// The match reason section makes it clear we're personalizing for them
													return `<a href="#match-reason-${index}" style="color:${COLORS.textSecondary}; font-size:11px; text-decoration:underline; text-decoration-style:dotted; text-underline-offset:3px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; white-space:nowrap;" title="See why this job matches your profile">Why this score?</a>`;
												}
												return "";
											})()}
                    </div>
                  </td>
                  <td class="company-name-mobile" style="padding:0; vertical-align:top; text-align:right;">
                    <div style="color:${COLORS.textPrimary}; font-size:15px; font-weight:600;">${c.job.company || "Company"}</div>
                  </td>
                </tr>
              </table>
              <div style="color:${COLORS.white}; font-size:21px; font-weight:700; margin-bottom:12px; line-height:1.4; letter-spacing:-0.2px;">${c.job.title || "Job Title"}</div>
              <div style="color:${COLORS.textSecondary}; font-size:14px; margin-bottom:16px; display:flex; align-items:center; gap:6px;">
                <span style="color:${COLORS.textSecondary}; font-size:14px;">📍</span>
                <span style="color:${COLORS.textSecondary}; font-size:14px;">${c.job.location || "Location"}</span>
              </div>
              ${(() => {
								// Display AI match reason prominently - CRITICAL: Shows personalization
								// Always show match reason to demonstrate we're personalizing for them
								const matchReason = generateUniqueMatchReason(
									c.job,
									c.matchResult,
									index,
								);
								if (matchReason) {
									// Format match reason - convert bullet points to proper list items
									const formattedReason = matchReason
										.split(/[•·]/)
										.map((item) => item.trim())
										.filter((item) => item.length > 0)
										.map(
											(item) =>
												`<div style="margin:4px 0; color:${COLORS.textPrimary}; font-size:14px; line-height:1.7;">✓ ${item}</div>`,
										)
										.join("");

									return `<div id="match-reason-${index}" style="background:rgba(91,33,182,0.2); border-left:4px solid ${COLORS.purple}; padding:18px 20px; margin:18px 0; border-radius:8px;">
                    <div style="color:${COLORS.purple}; font-size:12px; font-weight:600; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">🤖 Why This Matches</div>
                    <div style="color:${COLORS.textPrimary}; font-size:14px; line-height:1.75;">${formattedReason || matchReason}</div>
                  </div>`;
								}
								return "";
							})()}
              ${descMarkup}
        ${tagsMarkup}
        ${feedbackButtons}
        ${apply}
        ${plainLink}
        ${trackingPixel}
            </td>
          </tr>
        </table>
      </div>
    </td></tr>`;
		})
		.join("");

	// Premium upgrade CTA
	const upgradeUrl = `${baseUrl}/billing?utm_source=jobping&utm_medium=email&utm_campaign=${campaign}&utm_content=upgrade_cta`;
	const upgradeCta =
		subscriptionTier === "free"
			? `
  <tr>
    <td class="content" align="center" style="padding-top:32px;">
      <div style="background:linear-gradient(135deg,rgba(91,33,182,0.15),rgba(91,33,182,0.1)); border:2px solid rgba(91,33,182,0.3); border-radius:16px; padding:36px 28px; margin-top:12px;">
        <h3 style="color:${COLORS.white}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:24px; font-weight:700; margin:0 0 12px 0; letter-spacing:-0.3px;">
          Get More Matches for €5 Now
        </h3>
        <p class="text" style="margin-bottom:24px; color:${COLORS.textSecondary}; font-size:16px; line-height:1.7;">
          Upgrade to Premium and get <span style="color:#5B21B6; font-weight:600;">${PREMIUM_ROLES_PER_WEEK} jobs per week (~${PREMIUM_ROLES_PER_MONTH} per month)</span> instead of ${FREE_ROLES_PER_SEND}. Cancel anytime.
        </p>
        ${vmlButton(upgradeUrl, "Upgrade to Premium - €5/month", COLORS.purple, COLORS.indigo)}
        <p style="color:${COLORS.textSecondary}; font-size:12px; margin:16px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; line-height:1.5;">
          No commitment · Cancel anytime
        </p>
      </div>
    </td>
  </tr>`
			: "";

	return wrapEmail("Your Job Matches", header + items + upgradeCta, userEmail);
}

export function createVerificationEmail(
	verificationLink: string,
	userEmail?: string,
): string {
	const body = `
  <tr>
    <td class="content" align="center">
      <h1 class="title">Verify your email address <span role="img" aria-label="email">✉️</span></h1>
      <p class="text">Thanks for signing up! We need to verify your email address to activate your JobPing account.</p>
      <p class="text">Click the button below to confirm your email and start receiving personalized job matches.</p>
      ${vmlButton(verificationLink, "Verify Email Address", COLORS.indigo, COLORS.purple)}
      <p class="text" style="color:${COLORS.textSecondary}; font-size:13px; margin-top:24px;">
        Button not working? Copy and paste this link into your browser:<br>
        <a href="${verificationLink}" style="color:#5B21B6; word-break:break-all; font-size:12px;">${verificationLink}</a>
      </p>
      <p class="text" style="color:${COLORS.textSecondary}; font-size:13px; margin-top:20px;">
        This link expires in 24 hours. If you did not create a JobPing account, you can safely ignore this email.
      </p>
      <p class="text" style="color:${COLORS.textSecondary}; font-size:14px; margin-top:28px;">
        Need help? <a href="${getBaseUrl()}" style="color:#5B21B6; text-decoration:underline;">Visit JobPing</a> or reply to this email.
      </p>
    </td>
  </tr>`;
	return wrapEmail("Verify Your Email", body, userEmail);
}

export function createReEngagementEmailTemplate(
	userName: string,
	unsubscribeUrl: string,
	userEmail?: string,
): string {
	const name = userName || "there";
	const friendName = name.charAt(0).toUpperCase() + name.slice(1);
	const baseUrl = getBaseUrl();

	const body = `
  <tr>
    <td class="content" align="center">
      <h1 class="title">Hey ${friendName}! <span role="img" aria-label="wave">👋</span></h1>
      <p class="text">We've been thinking about you...</p>
      <p class="text">It's been a while since we last connected, and honestly, <span style="color:#5B21B6; font-weight:600;">we miss having you around!</span> We've been working on something exciting and we're <span style="color:#5B21B6; font-weight:600;">thrilled to share it with you</span>.</p>
      
      <p class="text">Since you last visited, we've:</p>
      <ul style="color:${COLORS.textSecondary}; font-size:15px; line-height:1.7; text-align:left; margin:0 auto 28px auto; max-width:420px; padding:0 0 0 20px;">
        <li style="margin-bottom:10px;">🎯 <span style="color:#5B21B6; font-weight:600;">Improved our AI matching</span> - even better job recommendations</li>
        <li style="margin-bottom:10px;">🚀 <span style="color:#5B21B6; font-weight:600;">Added 2,000+ new opportunities</span> across Europe</li>
        <li style="margin-bottom:10px;">⚡ <span style="color:#5B21B6; font-weight:600;">Made the experience faster</span> - 60-second job reviews</li>
        <li style="margin-bottom:10px;">💎 <span style="color:#5B21B6; font-weight:600;">Launched premium features</span> for serious job seekers</li>
      </ul>
      
      <p class="text">We're <span style="color:#5B21B6; font-weight:600;">excited to show you</span> what's new and help you find your next amazing role!</p>
      
      ${vmlButton(`${baseUrl}?utm_source=email&utm_medium=reengagement&utm_campaign=comeback`, "Show Me What's New! 🚀", COLORS.indigo, COLORS.purple)}
      
      <p class="text" style="color:${COLORS.textSecondary}; font-size:13px; margin-top:24px;">
        Or if you'd prefer, you can <a href="${unsubscribeUrl}" style="color:#5B21B6; text-decoration:underline;">unsubscribe here</a> - no hard feelings! 💙
      </p>
    </td>
  </tr>`;
	return wrapEmail("We Miss You - JobPing", body, userEmail);
}
