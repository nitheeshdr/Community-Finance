import { z } from 'zod';
import { EventCategory, EventFundingMode, EventStatus } from '../enums';
import {
  amountRupeesSchema,
  objectIdSchema,
  paginationQuerySchema,
} from './common';

export const createEventSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  category: z.nativeEnum(EventCategory).default(EventCategory.OTHER),
  date: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  budget: amountRupeesSchema,
  /** BALANCE = funded from community balance; SPLIT = members contribute. */
  fundingMode: z.nativeEnum(EventFundingMode).default(EventFundingMode.SPLIT),
  /**
   * SPLIT mode: which members share the budget. Empty/omitted = all
   * active members. Admin can deselect members in the create dialog.
   */
  participantIds: z.array(objectIdSchema).max(1000).optional(),
  organizerId: objectIdSchema.optional(),
  images: z.array(z.string().url()).max(10).default([]),
  /** Super-admin flag: allow budget above available community balance. */
  budgetOverride: z.boolean().default(false),
});

export const updateEventSchema = createEventSchema.partial();

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
