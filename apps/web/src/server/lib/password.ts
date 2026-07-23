import bcrypt from 'bcryptjs';
import { AUTH } from '@community-finance/shared';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, AUTH.BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
