/**
 * Centralized copy strings for consistent messaging across the application
 */

import {
  SIGNUP_INITIAL_ROLES,
  FREE_ROLES_PER_SEND,
  FREE_SEND_DAY_LABEL,
  PREMIUM_ROLES_PER_SEND,
  PREMIUM_SENDS_PER_WEEK,
  PREMIUM_SEND_DAYS_LABEL,
  PREMIUM_ROLES_PER_WEEK,
  PREMIUM_ROLES_PER_MONTH,
} from "./productMetrics";

export const CTA_FREE = `Get ${FREE_ROLES_PER_SEND} matches Free`;
export const CTA_PREMIUM = "Upgrade to Premium";
export const VP_TAGLINE = "Stop searching. Start applying.\nNo logins. Zero scrolling. Jobs in your inbox.";

// Hero section
export const HERO_TITLE = "JobPing";
export const HERO_HEADLINE = "EU graduate and internship roles, matched to you.";
export const HERO_SUBLINE = "Early-career roles across Europe, curated for you—no fluff.";
export const HERO_SUBLINE_MICRO = "No dashboards. No job boards. Just roles you can actually apply for.";
export const HERO_SUBTITLE = "";
export const HERO_CTA = "Get my first 5 matches";
export const HERO_PILL = "Graduate roles and internships across Europe";
export const HERO_SOCIAL_PROOF = "Join thousands of early-career jobseekers across Europe.";

// How it works
export const HOW_IT_WORKS_TITLE = "How it works";
export const HOW_IT_WORKS_SUMMARY = "JobPing searches the EU market and sends you only the roles worth applying for.";
export const HOW_IT_WORKS_STEPS = [
  { title: "Tell us your targets", description: "Pick your cities, skills, and visa reality. We only show roles you can actually apply for." },
  { title: "We search daily", description: "JobPing scans European boards and company pages. No dashboards, no spam—just matches." },
  { title: "Matches arrive weekly", description: `${FREE_ROLES_PER_SEND} curated roles each week. Premium unlocks ${PREMIUM_ROLES_PER_WEEK} roles per week.` },
];

// Built for students
export const BUILT_FOR_STUDENTS_TITLE = "Built for early-career jobseekers";
export const BUILT_FOR_STUDENTS_SUBTITLE = "We help first-time applicants land early-career roles they can actually get.";
export const BUILT_FOR_STUDENTS_KICKER = "For early-career jobseekers";
export const BUILT_FOR_STUDENTS_FEATURES = [
  {
    num: 1,
    title: "Only junior-friendly roles",
    body: "Internships, graduate programmes, and working student roles. Nothing senior.",
    meta: "No bait-and-switch senior jobs."
  },
  {
    num: 2,
    title: "Useful context in every email",
    body: "Every email includes salary hints, visa notes, and why the role fits you.",
    meta: "Everything you need to decide in seconds."
  },
  {
    num: 3,
    title: "Inbox-first experience",
    body: "No dashboards. Open the email and apply when you like a role.",
    meta: "No login. Just open your email and apply."
  }
];

// Pricing
export const PRICING_TITLE = "Start free. Unlock 15 curated roles per week with Premium.";
export const PRICING_SUBTITLE = `Graduate roles and internships across Europe. Cancel anytime.`;
export const PRICING_BADGE = "Simple pricing • Cancel anytime";

// Free plan
export const FREE_PLAN_TITLE = "Free";
export const FREE_PLAN_SUBTITLE = "weekly digest";
export const FREE_PLAN_FEATURES = [
  `${FREE_ROLES_PER_SEND} curated roles every ${FREE_SEND_DAY_LABEL}`,
  "Salary hints and visa context in every email",
  "Pause or cancel in one click"
];
export const FREE_PLAN_DESCRIPTION = `${FREE_ROLES_PER_SEND} curated roles per email.`;

// Premium plan
export const PREMIUM_PLAN_TITLE = "Premium";
export const PREMIUM_PLAN_SUBTITLE = `${PREMIUM_SENDS_PER_WEEK}× weekly`;
export const PREMIUM_PLAN_PRICE = "€5";
export const PREMIUM_PLAN_PRICE_UNIT = "/mo";
export const PREMIUM_PLAN_ANNUAL = "€20 for 3 months (save €1)";
export const PREMIUM_PLAN_FEATURES = [
  `${PREMIUM_ROLES_PER_WEEK} curated roles per week (${PREMIUM_SENDS_PER_WEEK} emails: ${PREMIUM_SEND_DAYS_LABEL})`,
  "24-hour early access to fresh postings",
  "Hot-match alerts for urgent openings",
  "Priority tweaks and intro support"
];
export const PREMIUM_PLAN_DESCRIPTION = `${PREMIUM_ROLES_PER_WEEK} curated roles per week.`;

// Reassurance
export const REASSURANCE_ITEMS = [
  "No CV required",
  "Cancel anytime",
  "GDPR compliant"
];

// Email showcase
export const EMAIL_SHOWCASE_KICKER = "What your emails look like";
export const EMAIL_SHOWCASE_TITLE = "Emails built to help you apply faster";
export const EMAIL_SHOWCASE_SUBTITLE = "Each email includes salary hints, visa notes, and a short 'why you' summary.";
export const EMAIL_SHOWCASE_POINTS = [
  `${FREE_ROLES_PER_SEND} curated roles per email`,
  "Fast summaries with salary hints and visa notes",
  "Direct apply buttons plus one-click feedback if we miss the mark"
];
