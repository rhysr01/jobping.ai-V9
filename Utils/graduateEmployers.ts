// Curated Graduate Employers by ATS Platform
// Only companies that ACTUALLY have graduate programs

export interface GraduateEmployer {
  name: string;
  url: string;
  platform: 'greenhouse' | 'lever' | 'workday' | 'smartrecruiters';
  graduatePrograms: string[];
  locations: string[];
  visaSponsorship: boolean;
  applicationDeadlines: string[];
  programDuration: string;
  salary?: string;
}

export const GRADUATE_EMPLOYERS: GraduateEmployer[] = [
  // Greenhouse Employers (Major Tech & Consulting)
  {
    name: 'Google',
    url: 'https://careers.google.com',
    platform: 'greenhouse',
    graduatePrograms: ['Google Graduate Program', 'Google STEP Internship', 'Google Engineering Residency'],
    locations: ['London', 'Dublin', 'Zurich', 'Munich', 'Paris', 'Amsterdam'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November', 'December'],
    programDuration: '2-3 years',
    salary: '£45,000-£65,000'
  },
  {
    name: 'Stripe',
    url: 'https://boards.greenhouse.io/stripe',
    platform: 'greenhouse',
    graduatePrograms: ['Stripe Graduate Program', 'Stripe Engineering Residency'],
    locations: ['London', 'Dublin', 'Amsterdam', 'Berlin'],
    visaSponsorship: true,
    applicationDeadlines: ['September', 'October'],
    programDuration: '2 years'
  },
  {
    name: 'Airbnb',
    url: 'https://boards.greenhouse.io/airbnb',
    platform: 'greenhouse',
    graduatePrograms: ['Airbnb Graduate Program', 'Airbnb Engineering Residency'],
    locations: ['London', 'Dublin', 'Amsterdam'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2 years'
  },
  {
    name: 'Shopify',
    url: 'https://boards.greenhouse.io/shopify',
    platform: 'greenhouse',
    graduatePrograms: ['Shopify Graduate Program', 'Shopify Engineering Residency'],
    locations: ['London', 'Amsterdam', 'Berlin'],
    visaSponsorship: true,
    applicationDeadlines: ['September', 'October'],
    programDuration: '2 years'
  },

  // Lever Employers (Startups & Scale-ups)
  {
    name: 'Spotify',
    url: 'https://jobs.lever.co/spotify',
    platform: 'lever',
    graduatePrograms: ['Spotify Graduate Program', 'Spotify Engineering Residency'],
    locations: ['London', 'Stockholm', 'Berlin', 'Amsterdam'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2 years'
  },
  {
    name: 'Discord',
    url: 'https://jobs.lever.co/discord',
    platform: 'lever',
    graduatePrograms: ['Discord Graduate Program'],
    locations: ['London', 'Amsterdam'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2 years'
  },
  {
    name: 'Reddit',
    url: 'https://jobs.lever.co/reddit',
    platform: 'lever',
    graduatePrograms: ['Reddit Graduate Program'],
    locations: ['London', 'Dublin'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2 years'
  },

  // Workday Employers (Enterprise & Finance)
  {
    name: 'Coinbase',
    url: 'https://coinbase.wd12.myworkdayjobs.com/External',
    platform: 'workday',
    graduatePrograms: ['Coinbase Graduate Program', 'Coinbase Engineering Residency'],
    locations: ['London', 'Dublin', 'Amsterdam'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2 years'
  },
  {
    name: 'Tesla',
    url: 'https://tesla.wd12.myworkdayjobs.com/External',
    platform: 'workday',
    graduatePrograms: ['Tesla Graduate Program', 'Tesla Engineering Residency'],
    locations: ['Berlin', 'Amsterdam', 'London'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2 years'
  },

  // SmartRecruiters Employers (Traditional Companies)
  {
    name: 'BMW',
    url: 'https://www.bmwgroup.com/careers',
    platform: 'smartrecruiters',
    graduatePrograms: ['BMW Graduate Program', 'BMW Engineering Residency'],
    locations: ['Munich', 'Berlin', 'London'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2-3 years'
  },
  {
    name: 'Volkswagen',
    url: 'https://www.volkswagen.com/careers',
    platform: 'smartrecruiters',
    graduatePrograms: ['Volkswagen Graduate Program'],
    locations: ['Wolfsburg', 'Berlin', 'London'],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2-3 years'
  }
];

// Get employers by platform
export function getGraduateEmployersByPlatform(platform: string): GraduateEmployer[] {
  return GRADUATE_EMPLOYERS.filter(employer => employer.platform === platform);
}

// Get all graduate employers
export function getAllGraduateEmployers(): GraduateEmployer[] {
  return GRADUATE_EMPLOYERS;
}

// Get employers by location
export function getGraduateEmployersByLocation(location: string): GraduateEmployer[] {
  return GRADUATE_EMPLOYERS.filter(employer => 
    employer.locations.some(loc => 
      loc.toLowerCase().includes(location.toLowerCase())
    )
  );
}

// Get employers with visa sponsorship
export function getGraduateEmployersWithVisaSponsorship(): GraduateEmployer[] {
  return GRADUATE_EMPLOYERS.filter(employer => employer.visaSponsorship);
}

// Get application deadlines by month
export function getGraduateEmployersByDeadline(month: string): GraduateEmployer[] {
  return GRADUATE_EMPLOYERS.filter(employer => 
    employer.applicationDeadlines.some(deadline => 
      deadline.toLowerCase().includes(month.toLowerCase())
    )
  );
}
