import { z } from 'zod';
import { AUTH } from '../constants';
import { CommunityStatus, CommunityType } from '../enums';
import { paginationQuerySchema, phoneSchema } from './common';

export const createCommunitySchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.nativeEnum(CommunityType),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(500).optional(),
  logo: z.string().url().optional(),
  // Bootstrap super admin for the new community
  adminName: z.string().trim().min(2).max(100),
  adminPhone: phoneSchema,
  adminPassword: z
    .string()
    .min(AUTH.MIN_PASSWORD_LENGTH)
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export const updateCommunitySchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  type: z.nativeEnum(CommunityType).optional(),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(500).optional(),
  logo: z.string().url().optional(),
  status: z.nativeEnum(CommunityStatus).optional(),
});

export const communityListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  type: z.nativeEnum(CommunityType).optional(),
  status: z.nativeEnum(CommunityStatus).optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type CommunityListQuery = z.infer<typeof communityListQuerySchema>;
