/**
 * Centralized copy strings for consistent messaging across the application
 */

import { FREE_ROLES_PER_SEND } from "./productMetrics";

// Time savings (consistent across all copy)
export const TIME_SAVED_PER_WEEK = 10;
export const TIME_SAVED_PER_MONTH = TIME_SAVED_PER_WEEK * 4;
export const TIME_SAVED_DESCRIPTION = `Save ${TIME_SAVED_PER_WEEK} hours per week job searching`;

export const CTA_FREE = `Get ${FREE_ROLES_PER_SEND} matches Free`;
export const CTA_PREMIUM = "Upgrade to Premium";
export const VP_TAGLINE =
	"Stop searching. Start applying.\nNo logins. Zero scrolling. Jobs in your inbox.";

// Standardized CTA text (used across multiple components)
export const CTA_GET_MY_5_FREE_MATCHES = "Get My 5 Free Matches";
export const CTA_GET_MY_5_FREE_MATCHES_ARIA = "Get my 5 free matches";

// Standardized trust/reassurance text
export const TRUST_TEXT_INSTANT_SETUP =
	"⚡ Instant matches • No credit card • 2-minute setup";
export const TRUST_TEXT_NO_CARD_SETUP = "No credit card • 2-minute setup";

// Hero section
export const HERO_TITLE = "JobPing";
export const HERO_HEADLINE =
	"Get hand-picked early-career jobs across Europe without wasting hours searching";
export const HERO_SUBLINE =
	"We scan 4,000+ EU companies daily and send you only roles you're qualified for - filtered by location and experience.";
export const HERO_SUBLINE_MICRO =
	"No dashboards. No job boards. Just roles you can actually apply for.";
export const HERO_CTA = "Get my first 5 matches";
export const HERO_PRIMARY_CTA = "Start Free - See Your First 5 Matches";
export const HERO_SECONDARY_CTA = "View Instant Matches";
export const HERO_PILL = "For EU students & recent grads";
export const HERO_SOCIAL_PROOF = "Trusted by students in 7 countries";

// How it works
export const HOW_IT_WORKS_TITLE = "How it works";
export const HOW_IT_WORKS_SUMMARY = "We do the searching. You do the applying.";
export const HOW_IT_WORKS_STEPS = [
	{
		title: "1. Tell us your preferences",
		description:
			"Tell us your target cities and career interests. We instantly filter 4,000+ European companies to find roles you're qualified for - saving you 10 hours per week of manual searching.",
	},
	{
		title: "2. We search 4,000+ companies daily",
		description:
			"We scan 4,000+ company career pages daily across 22 EU cities - more than any job board. Our AI ranks every role against your exact profile, so you only see roles worth applying for.",
	},
	{
		title: "3. Get matched roles instantly (Free) or weekly (Premium)",
		description:
			"Free: Get 5 hand-picked matches instantly (one-time preview). Premium: Receive 15 fresh matches per week (5 each Mon/Wed/Fri) from companies actively hiring - never miss a deadline again.",
	},
];

// What Happens Next section
export const WHAT_HAPPENS_NEXT_TITLE = "What Happens Next";
export const WHAT_HAPPENS_NEXT_STEPS = [
	{
		title: "Tell us your preferences",
		time: "2 minutes",
		description: "Choose your cities, career path, and visa status.",
	},
	{
		title: "We hand-pick jobs for you",
		time: "Daily",
		description:
			"Our AI scans 4,000+ companies and matches roles to your profile.",
	},
	{
		title: "Get matches instantly (Free) or weekly (Premium)",
		time: "Instant / Mon/Wed/Fri",
		description:
			"Free: See 5 matches right away (one-time). Premium: 5 fresh matches every Monday, Wednesday, and Friday (15 per week).",
	},
];

// Built for students
export const BUILT_FOR_STUDENTS_TITLE = "Why Students Choose JobPing";
export const BUILT_FOR_STUDENTS_SUBTITLE =
	"We help first-time jobseekers land early-career roles they actually qualify for.";
export const BUILT_FOR_STUDENTS_KICKER = "For early-career jobseekers";
export const BUILT_FOR_STUDENTS_FEATURES = [
	{
		num: 1,
		title: "Only junior-friendly roles",
		body: "Internships, graduate programmes, and working student roles. Nothing senior.",
		meta: "No bait-and-switch senior jobs.",
	},
	{
		num: 2,
		title: "Useful context in every email",
		body: "Every match shows: estimated salary range, visa sponsorship status, company size, and why our AI thinks it's a good fit - so you can decide in 30 seconds.",
		meta: "Everything you need to decide in seconds.",
	},
	{
		num: 3,
		title: "Inbox-first experience",
		body: "No dashboards. Open the email and apply when you like a role.",
		meta: "No login. Just open your email and apply.",
	},
];

// Pricing
export const PRICING_TITLE = "Choose Your Plan";
export const PRICING_SUBTITLE = "Save 40+ hours per month. Stop scrolling LinkedIn.";
export const PRICING_BADGE = "Simple pricing • Cancel anytime";
export const PRICING_BETA_WARNING = "🔥 Beta pricing—after Feb 28, premium will be €9/month";
export const PRICING_BETA_END_DATE = "2026-02-28";

// Value comparison
export const PRICING_VALUE_CALLOUT = "40+ hours/month wasted job hunting?";
export const PRICING_TIME_VALUE = "That's €400+ of your time at minimum wage.";
export const PRICING_COMPETITOR_LINKEDIN = "€30/month";
export const PRICING_COMPETITOR_GENERIC = "€0-20";

// Free plan
export const FREE_PLAN_TITLE = "Free";
export const FREE_PLAN_SUBTITLE = "5 instant matches";
export const FREE_PLAN_FEATURES = [
	`Get 5 instant matches`,
	"View matches on website",
	"No credit card required",
	"Takes under 2 minutes",
	"One-time preview",
];
export const FREE_PLAN_DESCRIPTION = `See your first 5 matches on your personalized dashboard. This is a one-time preview to see how JobPing works. No credit card required.`;

// Premium plan
// Time-to-apply stats (estimated until real data available)
export const PREMIUM_TIME_TO_APPLY_HOURS = 12;
export const FREE_TIME_TO_APPLY_HOURS = 72;

export const PREMIUM_PLAN_TITLE = "Premium";
export const PREMIUM_PLAN_SUBTITLE = `15 jobs/week • 3× delivery`;
export const PREMIUM_PLAN_VALUE = "€0.08 per job match";
export const PREMIUM_PLAN_PRICE = "€5";
export const PREMIUM_PLAN_PRICE_UNIT = "/mo";
export const PREMIUM_PLAN_ANNUAL = "€20 for 3 months (save €1)";
export const PREMIUM_PLAN_DESCRIPTION = `5 fresh matches 3× per week (Mon/Wed/Fri) from companies actively hiring.`;
export const PREMIUM_PLAN_GUARANTEE = "💸 If you don't apply to 3+ jobs in 30 days, we'll refund you.";
export const PREMIUM_SOCIAL_PROOF_PERCENT = "89";
export const PREMIUM_PLAN_FEATURES = [
	`✨ 15 fresh matches every week (Mon/Wed/Fri)`,
	`🎯 AI-powered visa sponsorship scoring`,
	`⚡ Jobs posted within 7 days (fresher roles)`,
	`🔄 AI learns from your feedback instantly`,
	`📧 Delivered to your inbox automatically`,
	`🚫 No scrolling, no dashboards, no BS`,
	`⏸️ Cancel anytime, no questions asked`,
];

// Reassurance
export const REASSURANCE_ITEMS = [
	"No CV required",
	"Cancel anytime",
	"Privacy-first",
];

// Email showcase
export const EMAIL_SHOWCASE_KICKER = "What your emails look like";
export const EMAIL_SHOWCASE_TITLE = "Your Matches, Delivered";
export const EMAIL_SHOWCASE_SUBTITLE =
	"Every role includes salary range, visa info, and why it's a match for you - so you can decide in seconds.";
export const EMAIL_SHOWCASE_POINTS = [
	`✓ 15 fresh matches in your inbox every week`,
	"✓ Complete salary & visa details upfront",
	"✓ AI learns from your feedback instantly",
];

// Weekly stats prefix for dynamic display
export const WEEKLY_STATS_PREFIX = "new early-career roles added this week";
export const ACTIVE_JOBS_PREFIX = "active opportunities right now";

// FAQ for inline display
export const INLINE_FAQ_ITEMS = [
	{
		icon: "❓",
		question: "Do you apply for me?",
		answer:
			"No. We send matches, you apply directly to companies via their portals.",
	},
	{
		icon: "🔍",
		question: "How do you find these jobs?",
		answer:
			"We scan company career pages and 7+ EU job boards daily, including Indeed, Adzuna, Reed, and more.",
	},
	{
		icon: "✖️",
		question: "Can I cancel anytime?",
		answer: "Yes. One click, no questions asked. Cancel from any email.",
	},
];
