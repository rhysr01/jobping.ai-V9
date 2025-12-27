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
export const HERO_HEADLINE = "Get hand-picked early-career jobs across Europe without wasting hours searching";
export const HERO_SUBLINE = "We filter jobs by visa, location, and experience so you only apply where you actually qualify.";
export const HERO_SUBLINE_MICRO = "No dashboards. No job boards. Just roles you can actually apply for.";
export const HERO_SUBTITLE = "";
export const HERO_CTA = "Get my first 5 matches";
export const HERO_PRIMARY_CTA = "Start Free - See Your First 5 Matches";
export const HERO_SECONDARY_CTA = "View Example Matches";
export const HERO_PILL = "For EU students & recent grads";
export const HERO_SOCIAL_PROOF = "Trusted by students in 7 countries";

// How it works
export const HOW_IT_WORKS_TITLE = "How it works";
export const HOW_IT_WORKS_SUMMARY = "We do the searching. You do the applying.";
export const HOW_IT_WORKS_STEPS = [
  { title: "1. Tell us your preferences", description: "Choose your cities, career path, and visa status. We'll only show roles you qualify for - no time wasters." },
  { title: "2. We search 1,000+ companies daily", description: "Our AI scans job boards and career pages across Europe - you get the best matches in your inbox." },
  { title: "3. Get matched roles in your inbox", description: "Every Monday, Wednesday, and Friday, we send you 5 fresh roles that fit your profile." },
];

// What Happens Next section
export const WHAT_HAPPENS_NEXT_TITLE = "What Happens Next";
export const WHAT_HAPPENS_NEXT_STEPS = [
  { title: "Tell us your preferences", time: "2 minutes", description: "Choose your cities, career path, and visa status." },
  { title: "We hand-pick jobs for you", time: "Daily", description: "Our AI scans 1,000+ companies and matches roles to your profile." },
  { title: "You get them in your inbox weekly", time: "Mon/Wed/Fri", description: "5 fresh matches delivered every Monday, Wednesday, and Friday." },
];

// Built for students
export const BUILT_FOR_STUDENTS_TITLE = "Why Students Choose JobPing";
export const BUILT_FOR_STUDENTS_SUBTITLE = "We help first-time jobseekers land early-career roles they actually qualify for.";
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
export const PRICING_TITLE = "Choose Your Plan";
export const PRICING_SUBTITLE = `Graduate roles and internships across Europe. Cancel anytime.`;
export const PRICING_BADGE = "Simple pricing • Cancel anytime";

// Free plan
export const FREE_PLAN_TITLE = "Free";
export const FREE_PLAN_SUBTITLE = "Try it out";
export const FREE_PLAN_FEATURES = [
  `See 5 example matches to try it out`,
  "View matches on website",
  "No credit card required",
  "Takes under 2 minutes"
];
export const FREE_PLAN_DESCRIPTION = `See your first 5 matches on your personalized dashboard. This is a one-time preview to see how JobPing works. No credit card required.`;

// Premium plan
// Time-to-apply stats (estimated until real data available)
export const PREMIUM_TIME_TO_APPLY_HOURS = 12;
export const FREE_TIME_TO_APPLY_HOURS = 72;

export const PREMIUM_PLAN_TITLE = "Premium";
export const PREMIUM_PLAN_SUBTITLE = `${PREMIUM_SENDS_PER_WEEK}× weekly`;
export const PREMIUM_PLAN_PRICE = "€5";
export const PREMIUM_PLAN_PRICE_UNIT = "/mo";
export const PREMIUM_PLAN_ANNUAL = "€20 for 3 months (save €1)";
export const PREMIUM_PLAN_DESCRIPTION = `Matches delivered to your inbox every Monday, Wednesday, and Friday - so you never miss an opportunity.`;
export const PREMIUM_PLAN_FEATURES = [
  `15 curated roles per week (3 emails: Mon / Wed / Fri)`,
  "Priority support",
  "Cancel anytime"
];

// Reassurance
export const REASSURANCE_ITEMS = [
  "No CV required",
  "Cancel anytime",
  "GDPR compliant"
];

// Email showcase
export const EMAIL_SHOWCASE_KICKER = "What your emails look like";
export const EMAIL_SHOWCASE_TITLE = "Your Matches, Delivered";
export const EMAIL_SHOWCASE_SUBTITLE = "Every role includes salary range, visa info, and why it's a match for you - so you can decide in seconds.";
export const EMAIL_SHOWCASE_POINTS = [
  `✓ 5 roles you actually qualify for (filtered by visa, location, experience)`,
  "✓ Salary range and visa status upfront - no surprises",
  "✓ One-click feedback to improve future matches"
];

// Weekly stats prefix for dynamic display
export const WEEKLY_STATS_PREFIX = 'new early-career roles added this week';
export const ACTIVE_JOBS_PREFIX = 'active opportunities right now';

// FAQ for inline display
export const INLINE_FAQ_ITEMS = [
  {
    icon: '❓',
    question: 'Do you apply for me?',
    answer: 'No. We send matches, you apply directly to companies via their portals.'
  },
  {
    icon: '🔍',
    question: 'How do you find these jobs?',
    answer: 'We scan LinkedIn, company career pages, and 50+ EU job boards daily.'
  },
  {
    icon: '✖️',
    question: 'Can I cancel anytime?',
    answer: 'Yes. One click, no questions asked. Cancel from any email.'
  }
];
