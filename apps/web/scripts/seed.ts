/**
 * Production bootstrap — creates the initial community, its super admin,
 * default fee configuration, and settings. NO demo/fake data.
 *
 * Configuration via environment variables (or .env):
 *   SEED_COMMUNITY_NAME   e.g. "My Village Community"   (required)
 *   SEED_COMMUNITY_TYPE   VILLAGE | APARTMENT | SOCIETY | CLUB | TEMPLE | INSTITUTION | TRUST (default VILLAGE)
 *   SEED_ADMIN_NAME       e.g. "Admin Name"             (required)
 *   SEED_ADMIN_PHONE      10-digit mobile               (required)
 *   SEED_ADMIN_PASSWORD   min 8 chars, letter + number  (required)
 *   SEED_MONTHLY_FEE      rupees, default 300
 *
 * Idempotent: exits without changes if the community already exists.
 *
 * Run: npm run seed
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local'), override: true });

import mongoose from 'mongoose';
import {
  AUTH,
  CommunityType,
  DEFAULTS,
  PHONE_REGEX,
  UserRole,
  UserStatus,
  toPaise,
} from '@community-finance/shared';
import { hashPassword } from '../src/server/lib/password';
import { CommunityModel } from '../src/server/models/community.model';
import { FeeConfigModel } from '../src/server/models/fee-config.model';
import { SettingsModel } from '../src/server/models/settings.model';
import { UserModel } from '../src/server/models/user.model';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error('See the header of scripts/seed.ts for the full list.');
    process.exit(1);
  }
  return value;
}

async function main() {
  const uri = requireEnv('MONGODB_URI');
  const communityName = requireEnv('SEED_COMMUNITY_NAME');
  const adminName = requireEnv('SEED_ADMIN_NAME');
  const adminPhone = requireEnv('SEED_ADMIN_PHONE');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');

  const communityType = (process.env.SEED_COMMUNITY_TYPE ?? CommunityType.VILLAGE) as CommunityType;
  if (!Object.values(CommunityType).includes(communityType)) {
    console.error(`Invalid SEED_COMMUNITY_TYPE: ${communityType}`);
    process.exit(1);
  }
  if (!PHONE_REGEX.test(adminPhone)) {
    console.error('SEED_ADMIN_PHONE must be a valid 10-digit Indian mobile number');
    process.exit(1);
  }
  if (
    adminPassword.length < AUTH.MIN_PASSWORD_LENGTH ||
    !/[a-zA-Z]/.test(adminPassword) ||
    !/\d/.test(adminPassword)
  ) {
    console.error(
      `SEED_ADMIN_PASSWORD must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters and contain a letter and a number`
    );
    process.exit(1);
  }
  const monthlyFeeRupees = Number(process.env.SEED_MONTHLY_FEE ?? DEFAULTS.MONTHLY_FEE);
  if (!Number.isFinite(monthlyFeeRupees) || monthlyFeeRupees < 0) {
    console.error('SEED_MONTHLY_FEE must be a non-negative number (rupees)');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const existing = await CommunityModel.findOne({ name: communityName });
  if (existing) {
    console.log(`Community "${communityName}" already exists — nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const community = await CommunityModel.create({
    name: communityName,
    type: communityType,
  });
  const communityId = community._id;

  await UserModel.create({
    communityId,
    name: adminName,
    phone: adminPhone,
    passwordHash: await hashPassword(adminPassword),
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    memberSince: new Date(),
  });

  await FeeConfigModel.create({
    communityId,
    amount: toPaise(monthlyFeeRupees),
    gracePeriodDays: DEFAULTS.GRACE_PERIOD_DAYS,
    dueDay: DEFAULTS.DUE_DAY_OF_MONTH,
    lateFee: toPaise(DEFAULTS.LATE_FEE),
    effectiveFrom: new Date(),
  });
  await SettingsModel.create({ communityId });

  console.log('\n──────────────────────────────────────────');
  console.log('Bootstrap complete.');
  console.log(`  Community    : ${communityName} (${communityType})`);
  console.log(`  Super Admin  : ${adminName} — ${adminPhone}`);
  console.log(`  Monthly fee  : ₹${monthlyFeeRupees}`);
  console.log('Log in with the phone number and password you configured.');
  console.log('──────────────────────────────────────────');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
