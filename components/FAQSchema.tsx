import {
  FREE_ROLES_PER_SEND,
  FREE_SEND_DAY_LABEL,
  SIGNUP_INITIAL_ROLES,
  PREMIUM_ROLES_PER_WEEK,
  PREMIUM_SENDS_PER_WEEK,
  PREMIUM_SEND_DAYS_LABEL,
} from "@/lib/productMetrics";

export default function FAQSchema() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does JobPing work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `JobPing sends you ${FREE_ROLES_PER_SEND} hand-picked early-career job opportunities every ${FREE_SEND_DAY_LABEL}. Premium members receive ${PREMIUM_ROLES_PER_WEEK} roles across ${PREMIUM_SENDS_PER_WEEK} drops (${PREMIUM_SEND_DAYS_LABEL}).`
        }
      },
      {
        "@type": "Question",
        "name": "Is JobPing free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Yes! JobPing offers a free tier with ${SIGNUP_INITIAL_ROLES} jobs on signup and ${FREE_ROLES_PER_SEND} jobs every ${FREE_SEND_DAY_LABEL}. Our Premium plan adds ${PREMIUM_ROLES_PER_WEEK} jobs each week (${PREMIUM_SENDS_PER_WEEK} drops on ${PREMIUM_SEND_DAYS_LABEL}) plus extra perks.`
        }
      },
      {
        "@type": "Question",
        "name": "What types of jobs does JobPing find?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "JobPing specializes in early-career opportunities including internships, graduate schemes, trainee programs, and entry-level positions across Europe."
        }
      },
      {
        "@type": "Question",
        "name": "Can I unsubscribe anytime?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely! You can unsubscribe at any time with one click. No questions asked, no hassle."
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
    />
  );
}
