import { z } from 'zod';
import { EventCategory, EventFundingMode, EventStatus } from '../enums';
import {
  amountRupeesSchema,
  objectIdSchema,
  paginationQuerySchema,
} from './common';

export const createEventSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    description: z.string().trim().max(2000).optional(),
    category: z.nativeEnum(EventCategory).default(EventCategory.OTHER),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    /**
     * Total budget. Required for BALANCE and SPLIT. For COLLECT it is
     * derived (amount per member × participants) and may be omitted.
     */
    budget: amountRupeesSchema.optional(),
    /**
     * BALANCE = from community balance; SPLIT = split a budget equally;
     * COLLECT = collect a fixed assigned amount from each member.
     */
    fundingMode: z.nativeEnum(EventFundingMode).default(EventFundingMode.SPLIT),
    /**
     * SPLIT: members who share the budget (empty = all active members).
     * COLLECT: the exact members to collect from (required).
     */
    participantIds: z.array(objectIdSchema).max(1000).optional(),
    /** COLLECT mode: the fixed amount each selected member pays. */
    collectAmountPerMember: amountRupeesSchema.optional(),
    organizerId: objectIdSchema.optional(),
    images: z.array(z.string().url()).max(10).default([]),
    /** Super-admin flag: allow budget above available community balance. */
    budgetOverride: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.fundingMode === EventFundingMode.COLLECT) {
      if (!v.collectAmountPerMember) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['collectAmountPerMember'],
          message: 'Enter the amount each member should pay',
        });
      }
      if (!v.participantIds || v.participantIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['participantIds'],
          message: 'Select at least one member to collect from',
        });
      }
    } else if (!v.budget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budget'],
        message: 'Enter a budget',
      });
    }
  });

/** Partial update — all fields optional; no cross-field requirement. */
export const updateEventSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z.nativeEnum(EventCategory).optional(),
  date: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  budget: amountRupeesSchema.optional(),
  fundingMode: z.nativeEnum(EventFundingMode).optional(),
  participantIds: z.array(objectIdSchema).max(1000).optional(),
  collectAmountPerMember: amountRupeesSchema.optional(),
  organizerId: objectIdSchema.optional(),
  images: z.array(z.string().url()).max(10).optional(),
  budgetOverride: z.boolean().optional(),
});

export const changeEventStatusSchema = z.object({
  status: z.nativeEnum(EventStatus),
  reason: z.string().trim().max(500).optional(),
});

export const eventListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  category: z.nativeEnum(EventCategory).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ChangeEventStatusInput = z.infer<typeof changeEventStatusSchema>;
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
