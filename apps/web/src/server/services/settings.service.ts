import { Types } from 'mongoose';
import {
  AuditAction,
  AuditEntity,
  toPaise,
  type FeeConfigDto,
  type UpdateFeeConfigInput,
  type UpdateRazorpayConfigInput,
  type UpdateSettingsInput,
} from '@community-finance/shared';
import { encryptField } from '../lib/crypto';
import { SettingsModel } from '../models/settings.model';
import type { FeeConfigEntity, FeeConfigRepository } from '../repositories/fee-config.repository';
import type { AuditService } from './audit.service';

export interface SettingsDto {
  expenseCategories: string[];
  billMandatoryThreshold: number;
  notificationPrefs: Record<string, boolean>;
  razorpayConfigured: boolean;
  razorpayKeyIdMasked?: string;
  theme: string;
  language: string;
}

export class SettingsService {
  constructor(
    private readonly feeConfigs: FeeConfigRepository,
    private readonly audit: AuditService
  ) {}

  async get(communityId: string): Promise<SettingsDto> {
    let settings = await SettingsModel.findOne({ communityId }).lean();
    if (!settings) {
      settings = (await SettingsModel.create({ communityId })).toObject();
    }
    const keyId = settings.razorpay?.keyId;
    return {
      expenseCategories: settings.expenseCategories ?? [],
      billMandatoryThreshold: settings.billMandatoryThreshold ?? 0,
      notificationPrefs: (settings.notificationPrefs ?? {}) as Record<string, boolean>,
      razorpayConfigured: settings.razorpay?.configured ?? false,
      razorpayKeyIdMasked: keyId ? `${keyId.slice(0, 12)}…` : undefined,
      theme: settings.theme ?? 'system',
      language: settings.language ?? 'en',
    };
  }

  async update(communityId: string, input: UpdateSettingsInput): Promise<SettingsDto> {
    const update: Record<string, unknown> = {};
    if (input.expenseCategories) update.expenseCategories = input.expenseCategories;
    if (input.billMandatoryThreshold !== undefined) {
      update.billMandatoryThreshold = toPaise(input.billMandatoryThreshold);
    }
    if (input.theme) update.theme = input.theme;
    if (input.language) update.language = input.language;
    if (input.notificationPrefs) {
      for (const [key, value] of Object.entries(input.notificationPrefs)) {
        if (value !== undefined) update[`notificationPrefs.${key}`] = value;
      }
    }

    await SettingsModel.updateOne(
      { communityId: new Types.ObjectId(communityId) },
      { $set: update },
      { upsert: true }
    );
    await this.audit.record({
      action: AuditAction.SETTINGS_UPDATED,
      entity: AuditEntity.SETTINGS,
      after: input,
    });
    return this.get(communityId);
  }

  /** Store per-community Razorpay credentials (encrypted, write-only). */
  async updateRazorpayConfig(
    communityId: string,
    input: UpdateRazorpayConfigInput
  ): Promise<void> {
    await SettingsModel.updateOne(
      { communityId: new Types.ObjectId(communityId) },
      {
        $set: {
          'razorpay.keyId': input.keyId,
          'razorpay.keySecretEncrypted': encryptField(input.keySecret),
          'razorpay.webhookSecretEncrypted': encryptField(input.webhookSecret),
          'razorpay.configured': true,
        },
      },
      { upsert: true }
    );
    await this.audit.record({
      action: AuditAction.SETTINGS_UPDATED,
      entity: AuditEntity.SETTINGS,
      after: { razorpay: 'credentials updated' },
    });
  }

  async getFeeConfig(communityId: string): Promise<FeeConfigDto | null> {
    const config = await this.feeConfigs.findActive(communityId);
    return config ? toFeeConfigDto(config) : null;
  }

  async getFeeHistory(communityId: string): Promise<FeeConfigDto[]> {
    const history = await this.feeConfigs.history(communityId);
    return history.map(toFeeConfigDto);
  }

  /** Fee changes create a new versioned config — history is preserved. */
  async updateFeeConfig(
    communityId: string,
    input: UpdateFeeConfigInput,
    createdBy: string
  ): Promise<FeeConfigDto> {
    const previous = await this.feeConfigs.findActive(communityId);
    const created = (await this.feeConfigs.create(communityId, {
      amount: toPaise(input.amount),
      gracePeriodDays: input.gracePeriodDays,
      dueDay: input.dueDay,
      lateFee: toPaise(input.lateFee),
      effectiveFrom: input.effectiveFrom ?? new Date(),
      createdBy,
    } as never)) as FeeConfigEntity;

    await this.audit.record({
      action: AuditAction.SETTINGS_UPDATED,
      entity: AuditEntity.FEE_CONFIG,
      entityId: String(created._id),
      before: previous ? { amount: previous.amount } : undefined,
      after: { amount: created.amount, dueDay: created.dueDay },
    });
    return toFeeConfigDto(created);
  }
}

function toFeeConfigDto(config: FeeConfigEntity): FeeConfigDto {
  return {
    id: String(config._id),
    amount: config.amount,
    gracePeriodDays: config.gracePeriodDays,
    dueDay: config.dueDay,
    lateFee: config.lateFee,
    effectiveFrom: config.effectiveFrom.toISOString(),
    createdAt: config.createdAt?.toISOString() ?? '',
  };
}
