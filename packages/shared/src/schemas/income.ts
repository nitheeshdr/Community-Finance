import { z } from 'zod';
import { IncomeSource, PaymentMethod } from '../enums';
import {
  amountRupeesSchema,
  objectIdSchema,
  paginationQuerySchema,
} from './common';

export const createIncomeSchema = z
  .object({
    source: z.nativeEnum(IncomeSource),
    amount: amountRupeesSchema,
    method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
    donorName: z.string().trim().max(150).optional(),
    sponsorName: z.string().trim().max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    eventId: objectIdSchema.optional(),
    receivedAt: z.coerce.date().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.source === IncomeSource.DONATION && !v.donorName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['donorName'],
        message: 'Donor name is required for donations',
      });
    }
    if (v.source === IncomeSource.SPONSORSHIP && !v.sponsorName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sponsorName'],
        message: 'Sponsor name is required for sponsorships',
      });
    }
  });

export const updateIncomeSchema = z.object({
  amount: amountRupeesSchema.optional(),
  donorName: z.string().trim().max(150).optional(),
  sponsorName: z.string().trim().max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  receivedAt: z.coerce.date().optional(),
});

export const incomeListQuerySchema = paginationQuerySchema.extend({
  source: z.nativeEnum(IncomeSource).optional(),
  eventId: objectIdSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type IncomeListQuery = z.infer<typeof incomeListQuerySchema>;
