import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { getEnv } from '../config/env';
import { BusinessRuleError } from '../errors/app-error';
import { decryptField } from './crypto';
import { SettingsModel } from '../models/settings.model';

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

/**
 * Resolve Razorpay credentials for a community. Per-community keys (stored
 * encrypted in Settings) win; platform env keys are the fallback so a
 * single-community deployment works with just .env.
 */
export async function getRazorpayCredentials(
  communityId: string
): Promise<RazorpayCredentials> {
  const settings = await SettingsModel.findOne({ communityId })
    .select('+razorpay.keySecretEncrypted +razorpay.webhookSecretEncrypted')
    .lean();

  if (settings?.razorpay?.configured && settings.razorpay.keyId) {
    return {
      keyId: settings.razorpay.keyId,
      keySecret: decryptField(settings.razorpay.keySecretEncrypted!),
      webhookSecret: decryptField(settings.razorpay.webhookSecretEncrypted!),
    };
  }

  const env = getEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new BusinessRuleError(
      'Razorpay is not configured. Add keys in Settings → Payments.'
    );
  }
  return {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  };
}

export async function getRazorpayClient(communityId: string): Promise<Razorpay> {
  const creds = await getRazorpayCredentials(communityId);
  return new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
}

/** Constant-time HMAC-SHA256 signature check. */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout callback verification: `${payment_id}|${subscription_id}`. */
export function verifySubscriptionPaymentSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
  keySecret: string;
}): boolean {
  return verifyHmacSignature(
    `${input.paymentId}|${input.subscriptionId}`,
    input.signature,
    input.keySecret
  );
}
