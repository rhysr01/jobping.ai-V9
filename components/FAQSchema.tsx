import {
  FREE_ROLES_PER_SEND,
  PREMIUM_ROLES_PER_WEEK,
  PREMIUM_SEND_DAYS_LABEL,
  PREMIUM_SENDS_PER_WEEK,
} from "@/lib/productMetrics";

export default function FAQSchema() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does JobPing work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Free users get ${FREE_ROLES_PER_SEND} hand-picked early-career job opportunities (one-time, no emails). Premium members receive ${PREMIUM_ROLES_PER_WEEK} roles per week across ${PREMIUM_SENDS_PER_WEEK} drops (${PREMIUM_SEND_DAYS_LABEL}) - that's ${PREMIUM_ROLES_PER_WEEK - FREE_ROLES_PER_SEND} more than free.`,
        },
      },
      {
        "@type": "Question",
        name: "Is JobPing free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes! JobPing offers a free tier with ${FREE_ROLES_PER_SEND} jobs on signup (one-time, no emails). Our Premium plan provides ${PREMIUM_ROLES_PER_WEEK} jobs each week (${PREMIUM_SENDS_PER_WEEK} drops on ${PREMIUM_SEND_DAYS_LABEL}) - that's ${PREMIUM_ROLES_PER_WEEK - FREE_ROLES_PER_SEND} more than free - plus extra perks.`,
        },
      },
      {
        "@type": "Question",
        name: "What types of jobs does JobPing find?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "JobPing specializes in early-career opportunities including internships, graduate schemes, trainee programs, and entry-level positions across Europe.",
        },
      },
      {
        "@type": "Question",
        name: "Can I unsubscribe anytime?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely! You can unsubscribe at any time with one click. No questions asked, no hassle.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Valid use case for JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
    />
  );
}
