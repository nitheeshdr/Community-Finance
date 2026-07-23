import { z } from 'zod';
import { AUTH } from '../constants';
import { UserRole, UserStatus } from '../enums';
import { objectIdSchema, paginationQuerySchema, phoneSchema } from './common';

const familyMemberSchema = z.object({
  name: z.string().trim().min(1).max(100),
  relation: z.string().trim().min(1).max(50),
  age: z.number().int().min(0).max(120).optional(),
});

export const createMemberSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  phone: phoneSchema,
  password: z
    .string()
    .min(AUTH.MIN_PASSWORD_LENGTH)
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
  role: z.enum([UserRole.ADMIN, UserRole.MEMBER]).default(UserRole.MEMBER),
  address: z.string().trim().max(500).optional(),
  family: z.array(familyMemberSchema).max(20).default([]),
  aadhaar: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits')
    .optional(),
  memberSince: z.coerce.date().optional(),
  profileImage: z.string().url().optional(),
});

export const updateMemberSchema = createMemberSchema
  .omit({ password: true })
  .partial();

export const changeMemberStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
  reason: z.string().trim().max(500).optional(),
});

export const memberListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const memberIdParamSchema = z.object({ id: objectIdSchema });

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ChangeMemberStatusInput = z.infer<typeof changeMemberStatusSchema>;
export type MemberListQuery = z.infer<typeof memberListQuerySchema>;
