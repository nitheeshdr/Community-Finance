/** Shared constants for API and clients. */

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

/** Pagination defaults enforced server-side. */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/** Auth/session tuning. */
export const AUTH = {
  ACCESS_TOKEN_TTL_SECONDS: 15 * 60, // 15 minutes
  REFRESH_TOKEN_TTL_SECONDS: 30 * 24 * 60 * 60, // 30 days
  BCRYPT_ROUNDS: 12,
  MIN_PASSWORD_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MINUTES: 15,
  LOCKOUT_MINUTES: 30,
  REFRESH_COOKIE_NAME: 'cf_refresh',
} as const;

/** Default community settings applied at community creation. */
export const DEFAULTS = {
  MONTHLY_FEE: 300,
  GRACE_PERIOD_DAYS: 5,
  DUE_DAY_OF_MONTH: 1,
  LATE_FEE: 0,
  BILL_MANDATORY_THRESHOLD: 1000,
  CURRENCY: 'INR',
  EXPENSE_CATEGORIES: [
    'Food & Catering',
    'Decoration',
    'Sound & Lighting',
    'Priest & Rituals',
    'Transport',
    'Printing & Stationery',
    'Maintenance',
    'Charity',
    'Miscellaneous',
  ],
} as const;

/** Cloudinary upload constraints, validated server-side. */
export const UPLOAD = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
} as const;

/** Pusher channel/event naming. Channels are private per community. */
export const REALTIME = {
  communityChannel: (communityId: string) => `private-community-${communityId}`,
  EVENTS: {
    NOTIFICATION: 'notification',
    PAYMENT_UPDATED: 'payment-updated',
    DASHBOARD_REFRESH: 'dashboard-refresh',
  },
} as const;

/** Indian mobile number: 10 digits starting 6-9. */
export const PHONE_REGEX = /^[6-9]\d{9}$/;

/** Money is stored in paise (integer) to avoid floating point drift. */
export const toPaise = (rupees: number): number => Math.round(rupees * 100);
export const toRupees = (paise: number): number => paise / 100;
export const formatINR = (paise: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
