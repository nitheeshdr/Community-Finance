import { z } from 'zod';
import { objectIdSchema } from './common';

export const createSubscriptionSchema = z.object({
  memberId: objectIdSchema,
});

export const cancelSubscriptionSchema = z.object({
  /** Cancel at end of current billing cycle instead of immediately. */
  cancelAtCycleEnd: z.boolean().default(false),
  reason: z.string().trim().max(500).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
