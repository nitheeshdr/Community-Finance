import { z } from 'zod';
import { amountRupeesSchema } from './common';

export const updateFeeConfigSchema = z.object({
  amount: amountRupeesSchema,
  gracePeriodDays: z.number().int().min(0).max(28),
  dueDay: z.number().int().min(1).max(28),
  lateFee: z.number().min(0).max(10000),
  effectiveFrom: z.coerce.date().optional(),
});

export const updateSettingsSchema = z.object({
  expenseCategories: z
    .array(z.string().trim().min(1).max(100))
    .min(1)
    .max(50)
    .optional(),
  billMandatoryThreshold: z.number().min(0).optional(),
  notificationPrefs: z
    .object({
      paymentReminders: z.boolean().optional(),
      paymentUpdates: z.boolean().optional(),
      eventUpdates: z.boolean().optional(),
      reports: z.boolean().optional(),
      announcements: z.boolean().optional(),
    })
    .optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.enum(['en', 'ta', 'hi']).optional(),
});

/** Razorpay keys are write-only: never echoed back in full. */
export const updateRazorpayConfigSchema = z.object({
  keyId: z.string().trim().min(10).max(100),
  keySecret: z.string().trim().min(10).max(100),
  webhookSecret: z.string().trim().min(6).max(100),
});

export type UpdateFeeConfigInput = z.infer<typeof updateFeeConfigSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateRazorpayConfigInput = z.infer<typeof updateRazorpayConfigSchema>;
