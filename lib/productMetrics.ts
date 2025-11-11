export const SIGNUP_INITIAL_ROLES = 10;

export const FREE_ROLES_PER_SEND = 5;
export const FREE_SEND_DAYS = ['Thursday'] as const;
export const FREE_SEND_DAY_LABEL = FREE_SEND_DAYS.join(' & ');

export const PREMIUM_ROLES_PER_SEND = 5;
export const PREMIUM_SENDS_PER_WEEK = 3;
export const PREMIUM_SEND_DAYS = ['Mon', 'Wed', 'Fri'] as const;
export const PREMIUM_SEND_DAYS_LABEL = PREMIUM_SEND_DAYS.join(' / ');

export const PREMIUM_ROLES_PER_WEEK = PREMIUM_ROLES_PER_SEND * PREMIUM_SENDS_PER_WEEK;
export const WEEKS_PER_MONTH = 4;
export const PREMIUM_ROLES_PER_MONTH = PREMIUM_ROLES_PER_WEEK * WEEKS_PER_MONTH;
export const PREMIUM_ROLES_PER_YEAR = PREMIUM_ROLES_PER_MONTH * 12;

