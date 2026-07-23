import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { getEnv } from '../config/env';

/**
 * AES-256-GCM field-level encryption for sensitive values that must be
 * recoverable (Aadhaar, per-community Razorpay secrets). Format:
 * `v1:<iv-hex>:<tag-hex>:<ciphertext-hex>`.
 */
const VERSION = 'v1';

function key(): Buffer {
  return Buffer.from(getEnv().FIELD_ENCRYPTION_KEY, 'hex');
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptField(payload: string): string {
  const [version, ivHex, tagHex, dataHex] = payload.split(':');
  if (version !== VERSION || !ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted field');
  }
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

/** SHA-256 hash for refresh-token storage (never store raw tokens). */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function newTokenId(): string {
  return randomUUID();
}

export function maskAadhaar(aadhaar: string): string {
  return `XXXX-XXXX-${aadhaar.slice(-4)}`;
}
