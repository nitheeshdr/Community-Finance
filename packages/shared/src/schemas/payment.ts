import { z } from 'zod';
import { PaymentMethod, PaymentStatus, PaymentType } from '../enums';
import {
  amountRupeesSchema,
  objectIdSchema,
  paginationQuerySchema,
  periodSchema,
} from './common';

/** Admin records a manual cash/UPI payment on behalf of a member. */
export const recordManualPaymentSchema = z
  .object({
    memberId: objectIdSchema,
    type: z.nativeEnum(PaymentType),
    method: z.enum([PaymentMethod.CASH, PaymentMethod.UPI]),
    amount: amountRupeesSchema,
    period: periodSchema.optional(), // required for SUBSCRIPTION
    eventId: objectIdSchema.optional(), // required for EVENT_CONTRIBUTION
    upiReference: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(500).optional(),
    paidAt: z.coerce.date().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === PaymentType.SUBSCRIPTION && !v.period) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['period'],
        message: 'Period is required for subscription payments',
      });
    }
    if (v.type === PaymentType.EVENT_CONTRIBUTION && !v.eventId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['eventId'],
        message: 'Event is required for event contributions',
      });
    }
    if (v.method === PaymentMethod.UPI && !v.upiReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['upiReference'],
        message: 'UPI reference is required for UPI payments',
      });
    }
  });

export const approvePaymentSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(500).optional(),
});

export const refundPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const paymentListQuerySchema = paginationQuerySchema.extend({
  memberId: objectIdSchema.optional(),
  eventId: objectIdSchema.optional(),
  type: z.nativeEnum(PaymentType).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  period: periodSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Client-side Razorpay checkout verification payload. */
export const verifyRazorpayPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;
