import {
  AuditAction,
  AuditEntity,
  UserRole,
  toPaise,
  type CreateIncomeInput,
  type IncomeDto,
  type IncomeListQuery,
  type UpdateIncomeInput,
} from '@community-finance/shared';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../errors/app-error';
import type { IncomeEntity, IncomeRepository } from '../repositories/income.repository';
import type { ListResult } from '../repositories/base.repository';
import type { AuditService } from './audit.service';

export class IncomeService {
  constructor(
    private readonly incomes: IncomeRepository,
    private readonly audit: AuditService
  ) {}

  async list(communityId: string, query: IncomeListQuery): Promise<ListResult<IncomeDto>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.source) filter.source = query.source;
    if (query.eventId) filter.eventId = query.eventId;
    if (query.from || query.to) {
      filter.receivedAt = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    const { items, total } = await this.incomes.list(communityId, filter, {
      page: query.page,
      limit: query.limit,
      sort: { receivedAt: -1 },
      populate: 'eventId',
    });
    return { items: (items as IncomeEntity[]).map(toIncomeDto), total };
  }

  /** Manual income entry (donations, sponsorships, temple income, misc). */
  async create(
    communityId: string,
    input: CreateIncomeInput,
    createdBy: string
  ): Promise<IncomeDto> {
    const income = (await this.incomes.create(communityId, {
      source: input.source,
      amount: toPaise(input.amount),
      method: input.method,
      donorName: input.donorName,
      sponsorName: input.sponsorName,
      description: input.description,
      eventId: input.eventId,
      receivedAt: input.receivedAt ?? new Date(),
      createdBy,
    } as never)) as IncomeEntity;

    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.INCOME,
      entityId: String(income._id),
      after: { source: income.source, amount: income.amount, donor: income.donorName },
    });
    return toIncomeDto(income);
  }

  async update(communityId: string, id: string, input: UpdateIncomeInput): Promise<IncomeDto> {
    const existing = (await this.incomes.findById(communityId, id)) as IncomeEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Income record');
    if (existing.paymentId) {
      throw new BusinessRuleError(
        'Payment-linked income cannot be edited directly — refund the payment instead'
      );
    }

    const update: Record<string, unknown> = { ...input };
    if (input.amount !== undefined) update.amount = toPaise(input.amount);

    const updated = (await this.incomes.updateById(communityId, id, {
      $set: update,
    })) as IncomeEntity;
    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.INCOME,
      entityId: id,
      before: { amount: existing.amount },
      after: update,
    });
    return toIncomeDto(updated);
  }

  async remove(communityId: string, id: string, actorRole: UserRole): Promise<void> {
    if (actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only the super admin can delete income records');
    }
    const existing = (await this.incomes.findById(communityId, id)) as IncomeEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Income record');
    if (existing.paymentId) {
      throw new BusinessRuleError('Payment-linked income cannot be deleted — refund the payment instead');
    }

    await this.incomes.updateById(communityId, id, { $set: { deletedAt: new Date() } });
    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.INCOME,
      entityId: id,
      before: { source: existing.source, amount: existing.amount },
    });
  }
}

/* ---------------------------------------------------------------- */

function refName(ref: unknown): string | undefined {
  if (ref && typeof ref === 'object' && 'name' in ref) return String((ref as { name: unknown }).name);
  return undefined;
}
function refId(ref: unknown): string | undefined {
  if (!ref) return undefined;
  if (typeof ref === 'object' && '_id' in ref) return String((ref as { _id: unknown })._id);
  return String(ref);
}

export function toIncomeDto(income: IncomeEntity): IncomeDto {
  return {
    id: String(income._id),
    source: income.source as IncomeDto['source'],
    amount: income.amount,
    method: income.method as IncomeDto['method'],
    donorName: income.donorName ?? undefined,
    sponsorName: income.sponsorName ?? undefined,
    description: income.description ?? undefined,
    eventId: refId(income.eventId),
    eventName: refName(income.eventId),
    paymentId: income.paymentId ? String(income.paymentId) : undefined,
    receivedAt: income.receivedAt?.toISOString() ?? '',
    createdAt: income.createdAt?.toISOString() ?? '',
  };
}
