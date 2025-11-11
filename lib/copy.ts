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
export const HERO_HEADLINE = "Stop scrolling job boards.";
export const HERO_SUBLINE = "Tell us your cities and we’ll send internships and grad roles within 48 hours—curated by humans, not feeds.";
export const HERO_SUBTITLE = VP_TAGLINE;
export const HERO_CTA = "Get EU jobs in my inbox for free";
export const HERO_PILL = "Curated Europe-wide internships & grad roles";
export const HERO_FEATURES = [
  "Humans double-check every shortlist before it sends",
  "We filter by city, visa, and experience so you only see roles you can take",
  `${FREE_ROLES_PER_SEND} roles per drop · Premium unlocks ${PREMIUM_ROLES_PER_WEEK} each week (~${PREMIUM_ROLES_PER_MONTH} monthly)`
];
export const HERO_SOCIAL_PROOF = "Trusted by students across 20+ European cities.";
export const HERO_FINE_PRINT = `Free forever • Cancel anytime • Premium unlocks ${PREMIUM_ROLES_PER_WEEK} roles/week (~${PREMIUM_ROLES_PER_MONTH}/month)`;

// How it works
export const HOW_IT_WORKS_TITLE = "How it works";
export const HOW_IT_WORKS_SUMMARY = "Share your preferences and we’ll surface early-career roles for you.";
export const HOW_IT_WORKS_STEPS = [
  { title: "Share your preferences", description: "Pick cities, work rights, and roles in under two minutes." },
  { title: "We search every day", description: "JobPing scans European boards and company pages and filters the noise." },
  { title: "Shortlist arrives by email", description: `You get ${FREE_ROLES_PER_SEND} roles per send; Premium adds ${PREMIUM_SENDS_PER_WEEK} drops totaling ${PREMIUM_ROLES_PER_WEEK} each week.` },
];

// Built for students
export const BUILT_FOR_STUDENTS_TITLE = "Built for students and recent grads";
export const BUILT_FOR_STUDENTS_SUBTITLE = "JobPing helps first-time applicants land early-career roles they can actually secure.";
export const BUILT_FOR_STUDENTS_KICKER = "For students and grads";
export const BUILT_FOR_STUDENTS_FEATURES = [
  {
    num: 1,
    title: "Only junior-friendly roles",
    body: "Internships, graduate programmes, and working student roles. Nothing senior."
  },
  {
    num: 2,
    title: "Useful context in every send",
    body: "Each email highlights salary clues, visa notes, and why the role suits you."
  },
  {
    num: 3,
    title: "Inbox first experience",
    body: "No dashboards. Open the email and apply when you like a role."
  }
];

// Pricing
export const PRICING_TITLE = "Start free. Upgrade when you need more.";
export const PRICING_SUBTITLE = `EU early-career jobs delivered to your inbox. Premium unlocks ${PREMIUM_ROLES_PER_WEEK} roles/week (~${PREMIUM_ROLES_PER_MONTH}/month). Cancel anytime.`;
export const PRICING_BADGE = "Simple pricing • Cancel anytime";

// Free plan
export const FREE_PLAN_TITLE = "Free";
export const FREE_PLAN_SUBTITLE = "Weekly digest";
export const FREE_PLAN_FEATURES = [
  `${FREE_ROLES_PER_SEND} curated roles every ${FREE_SEND_DAY_LABEL}`,
  "Salary hints and visa context in every drop",
  "Pause or cancel in one click"
];
export const FREE_PLAN_DESCRIPTION = `${SIGNUP_INITIAL_ROLES} jobs on signup, then ${FREE_ROLES_PER_SEND} curated roles every ${FREE_SEND_DAY_LABEL}.`;

// Premium plan
export const PREMIUM_PLAN_TITLE = "Premium";
export const PREMIUM_PLAN_SUBTITLE = `${PREMIUM_SENDS_PER_WEEK}× weekly`;
export const PREMIUM_PLAN_PRICE = "€5";
export const PREMIUM_PLAN_PRICE_UNIT = "/mo";
export const PREMIUM_PLAN_ANNUAL = "€20 for 3 months (save €1)";
export const PREMIUM_PLAN_FEATURES = [
  `${PREMIUM_ROLES_PER_WEEK} roles each week (${PREMIUM_SENDS_PER_WEEK} drops: ${PREMIUM_SEND_DAYS_LABEL})`,
  "24-hour early access to fresh postings",
  "Hot-match alerts for urgent openings",
  "Priority tweaks and intro support"
];
export const PREMIUM_PLAN_DESCRIPTION = `${SIGNUP_INITIAL_ROLES} jobs on signup plus ${PREMIUM_ROLES_PER_WEEK} new roles each week (${PREMIUM_SENDS_PER_WEEK} drops on ${PREMIUM_SEND_DAYS_LABEL}).`;

// Reassurance
export const REASSURANCE_ITEMS = [
  "No CV required",
  "Cancel anytime",
  "GDPR compliant"
];

// Email showcase
export const EMAIL_SHOWCASE_KICKER = "What the drop looks like";
export const EMAIL_SHOWCASE_TITLE = "Emails built to help you apply faster";
export const EMAIL_SHOWCASE_SUBTITLE = "Every send includes the context you need—visa notes, salary clues, and why it fits you.";
export const EMAIL_SHOWCASE_POINTS = [
  `${FREE_ROLES_PER_SEND} curated roles per email, focused on internships and grad programmes`,
  "Clear summaries with salary cues, visa notes, and why we chose the role",
  "Direct apply buttons plus quick feedback links if we miss the mark"
];
