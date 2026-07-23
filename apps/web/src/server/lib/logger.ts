import pino from 'pino';

/**
 * Structured JSON logging. In production these lines are ingested by the
 * platform log drain (Vercel). Never log secrets, tokens, or password hashes.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: { app: 'community-finance' },
  redact: {
    paths: [
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'authorization',
      'cookie',
      'accessToken',
      'refreshToken',
      '*.accessToken',
      '*.refreshToken',
      'keySecret',
      '*.keySecret',
      'aadhaar',
      '*.aadhaar',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
