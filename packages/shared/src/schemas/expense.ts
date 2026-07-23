import { z } from 'zod';
import { ExpenseStatus, PaymentMethod } from '../enums';
import {
  amountRupeesSchema,
  objectIdSchema,
  paginationQuerySchema,
} from './common';

export const createExpenseSchema = z.object({
  eventId: objectIdSchema,
  name: z.string().trim().min(2).max(150),
  category: z.string().trim().min(1).max(100),
  amount: amountRupeesSchema,
  vendor: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  paymentMode: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  /** Cloudinary URLs of uploaded bills/invoices. */
  bills: z.array(z.string().url()).max(10).default([]),
  expenseDate: z.coerce.date().optional(),
});

export const updateExpenseSchema = createExpenseSchema
  .omit({ eventId: true })
  .partial();

export const reviewExpenseSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(500).optional(),
});

export const expenseListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  eventId: objectIdSchema.optional(),
  category: z.string().trim().max(100).optional(),
  status: z.nativeEnum(ExpenseStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ReviewExpenseInput = z.infer<typeof reviewExpenseSchema>;
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;
