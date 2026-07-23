import { z } from 'zod';
import { AUTH } from '../constants';
import { phoneSchema } from './common';

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(
        AUTH.MIN_PASSWORD_LENGTH,
        `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`
      )
      .max(128)
      .regex(/[a-zA-Z]/, 'Password must contain a letter')
      .regex(/\d/, 'Password must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(AUTH.MIN_PASSWORD_LENGTH)
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
