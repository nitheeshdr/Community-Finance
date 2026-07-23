import { z } from 'zod';
import { PAGINATION, PHONE_REGEX } from '../constants';

/** 24-char hex MongoDB ObjectId. */
export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number');

/** Amount in rupees from clients; converted to paise at the service boundary. */
export const amountRupeesSchema = z
  .number()
  .positive('Amount must be greater than zero')
  .max(10_00_00_000, 'Amount too large')
  .multipleOf(0.01, 'Amount can have at most 2 decimal places');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** `YYYY-MM` period key used by reports and subscription payments. */
export const periodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be YYYY-MM');

export const isoDateSchema = z.coerce.date();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
