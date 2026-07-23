import { z } from 'zod';
import { ExportFormat, ReportPeriod } from '../enums';
import { amountRupeesSchema, objectIdSchema, periodSchema } from './common';

export const reportQuerySchema = z.object({
  period: z.nativeEnum(ReportPeriod).default(ReportPeriod.MONTHLY),
  /** Anchor date within the requested period; defaults to now. */
  date: z.coerce.date().optional(),
});

export const reportExportQuerySchema = reportQuerySchema.extend({
  format: z.nativeEnum(ExportFormat),
});

/** What an advanced export contains. */
export enum ExportType {
  SUMMARY = 'SUMMARY',
  PAYMENTS = 'PAYMENTS',
  EXPENSES = 'EXPENSES',
  INCOME = 'INCOME',
  MEMBERS = 'MEMBERS',
}

/**
 * Advanced export: pick the data set, a custom date range, and filters.
 * Filters apply only where meaningful for the chosen type.
 */
export const advancedExportQuerySchema = z
  .object({
    type: z.nativeEnum(ExportType),
    format: z.nativeEnum(ExportFormat),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    eventId: objectIdSchema.optional(),
    memberId: objectIdSchema.optional(),
    status: z.string().trim().max(30).optional(),
    category: z.string().trim().max(100).optional(),
    source: z.string().trim().max(30).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.from && v.to && v.from > v.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'End date must be after the start date',
      });
    }
  });

export type AdvancedExportQuery = z.infer<typeof advancedExportQuerySchema>;

export const closePeriodSchema = z.object({
  period: periodSchema,
});

export const createAdjustmentSchema = z.object({
  entity: z.enum(['INCOME', 'EXPENSE']),
  /** Positive adds to the entity total, negative reduces it. */
  amount: z
    .number()
    .refine((v) => v !== 0, 'Adjustment cannot be zero')
    .refine((v) => Math.abs(v) <= 10_00_00_000, 'Amount too large'),
  reason: z.string().trim().min(5).max(500),
  targetId: objectIdSchema.optional(),
  eventId: objectIdSchema.optional(),
});

export const donationAmountSchema = amountRupeesSchema;

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>;
export type ClosePeriodInput = z.infer<typeof closePeriodSchema>;
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
