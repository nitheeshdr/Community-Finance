import { Types } from 'mongoose';
import {
  AuditAction,
  AuditEntity,
  EventStatus,
  ExpenseStatus,
  UserRole,
  formatINR,
  toPaise,
  type CreateExpenseInput,
  type ExpenseDto,
  type ExpenseListQuery,
  type ReviewExpenseInput,
  type UpdateExpenseInput,
} from '@community-finance/shared';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/app-error';
import { ExpenseModel, type ExpenseDoc } from '../models/expense.model';
import { SettingsModel } from '../models/settings.model';
import type { EventEntity, EventRepository } from '../repositories/event.repository';
import type { ListResult } from '../repositories/base.repository';
import { BaseRepository } from '../repositories/base.repository';
import type { AuditService } from './audit.service';

export type ExpenseEntity = ExpenseDoc & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export class ExpenseRepository extends BaseRepository<ExpenseDoc> {
  constructor() {
    super(ExpenseModel);
  }
}

export class ExpenseService {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly events: EventRepository,
    private readonly audit: AuditService
  ) {}

  async list(communityId: string, query: ExpenseListQuery): Promise<ListResult<ExpenseDto>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.eventId) filter.eventId = query.eventId;
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.name = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (query.from || query.to) {
      filter.expenseDate = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    const { items, total } = await this.expenses.list(communityId, filter, {
      page: query.page,
      limit: query.limit,
      sort: { expenseDate: -1 },
      populate: ['eventId', 'createdBy', 'approvedBy'],
    });
    return { items: (items as ExpenseEntity[]).map(toExpenseDto), total };
  }

  async create(
    communityId: string,
    input: CreateExpenseInput,
    createdBy: string
  ): Promise<ExpenseDto> {
    // Business rule: every expense belongs to an event.
    const event = (await this.events.findById(communityId, input.eventId)) as EventEntity | null;
    if (!event) throw new NotFoundError('Event');
    if (event.status === EventStatus.CLOSED || event.status === EventStatus.CANCELLED) {
      throw new BusinessRuleError('Expenses cannot be added to closed or cancelled events');
    }

    const amountPaise = toPaise(input.amount);

    // Business rule: bill mandatory above the configured threshold.
    const settings = await SettingsModel.findOne({ communityId }).lean();
    const threshold = settings?.billMandatoryThreshold ?? 0;
    if (threshold > 0 && amountPaise >= threshold && input.bills.length === 0) {
      throw new ValidationError(
        `Bill upload is mandatory for expenses of ${formatINR(threshold)} or more`
      );
    }

    const expense = (await this.expenses.create(communityId, {
      eventId: input.eventId,
      name: input.name,
      category: input.category,
      amount: amountPaise,
      vendor: input.vendor,
      description: input.description,
      paymentMode: input.paymentMode,
      bills: input.bills,
      expenseDate: input.expenseDate ?? new Date(),
      status: ExpenseStatus.PENDING,
      createdBy,
    } as never)) as ExpenseEntity;

    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.EXPENSE,
      entityId: String(expense._id),
      after: { name: expense.name, amount: expense.amount, event: event.name },
    });
    return toExpenseDto(expense);
  }

  async update(
    communityId: string,
    id: string,
    input: UpdateExpenseInput
  ): Promise<ExpenseDto> {
    const existing = (await this.expenses.findById(communityId, id)) as ExpenseEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Expense');
    if (existing.status === ExpenseStatus.APPROVED) {
      throw new BusinessRuleError(
        'Approved expenses cannot be edited — record an adjustment instead'
      );
    }

    const update: Record<string, unknown> = { ...input };
    if (input.amount !== undefined) update.amount = toPaise(input.amount);

    const updated = (await this.expenses.updateById(communityId, id, {
      $set: { ...update, status: ExpenseStatus.PENDING }, // edits re-enter approval
    })) as ExpenseEntity;

    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.EXPENSE,
      entityId: id,
      before: { name: existing.name, amount: existing.amount },
      after: update,
    });
    return toExpenseDto(updated);
  }

  async review(
    communityId: string,
    id: string,
    input: ReviewExpenseInput,
    reviewerId: string,
    reviewerRole: UserRole
  ): Promise<ExpenseDto> {
    const existing = (await this.expenses.findById(communityId, id)) as ExpenseEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Expense');
    if (existing.status !== ExpenseStatus.PENDING) {
      throw new BusinessRuleError('Only pending expenses can be reviewed');
    }
    if (String(existing.createdBy) === reviewerId && reviewerRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('You cannot approve your own expense');
    }

    if (input.action === 'REJECT') {
      const updated = (await this.expenses.updateById(communityId, id, {
        $set: {
          status: ExpenseStatus.REJECTED,
          approvedBy: reviewerId,
          approvedAt: new Date(),
          rejectionReason: input.reason,
        },
      })) as ExpenseEntity;
      await this.audit.record({
        action: AuditAction.REJECT,
        entity: AuditEntity.EXPENSE,
        entityId: id,
        after: { reason: input.reason },
      });
      return toExpenseDto(updated);
    }

    const updated = (await this.expenses.updateById(communityId, id, {
      $set: { status: ExpenseStatus.APPROVED, approvedBy: reviewerId, approvedAt: new Date() },
    })) as ExpenseEntity;

    // Approved expenses immediately update the event's spent total (and
    // therefore the community balance, which derives from approved expenses).
    await this.events.incrementSpent(communityId, String(existing.eventId), existing.amount);

    await this.audit.record({
      action: AuditAction.APPROVE,
      entity: AuditEntity.EXPENSE,
      entityId: id,
      after: { amount: existing.amount },
    });
    return toExpenseDto(updated);
  }

  async remove(communityId: string, id: string, actorRole: UserRole): Promise<void> {
    const existing = (await this.expenses.findById(communityId, id)) as ExpenseEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Expense');
    if (existing.status === ExpenseStatus.APPROVED && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only the super admin can delete approved expenses');
    }

    await this.expenses.updateById(communityId, id, { $set: { deletedAt: new Date() } });
    // Reverse the spend if it had been approved.
    if (existing.status === ExpenseStatus.APPROVED) {
      await this.events.incrementSpent(communityId, String(existing.eventId), -existing.amount);
    }
    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.EXPENSE,
      entityId: id,
      before: { name: existing.name, amount: existing.amount, status: existing.status },
    });
  }
}

/* ---------------------------------------------------------------- */

function refName(ref: unknown): string | undefined {
  if (ref && typeof ref === 'object' && 'name' in ref) return String((ref as { name: unknown }).name);
  return undefined;
}
function refId(ref: unknown): string {
  if (ref && typeof ref === 'object' && '_id' in ref) return String((ref as { _id: unknown })._id);
  return String(ref ?? '');
}

export function toExpenseDto(expense: ExpenseEntity): ExpenseDto {
  return {
    id: String(expense._id),
    eventId: refId(expense.eventId),
    eventName: refName(expense.eventId),
    name: expense.name,
    category: expense.category,
    amount: expense.amount,
    vendor: expense.vendor ?? undefined,
    description: expense.description ?? undefined,
    paymentMode: expense.paymentMode as ExpenseDto['paymentMode'],
    status: expense.status as ExpenseDto['status'],
    bills: expense.bills ?? [],
    expenseDate: expense.expenseDate?.toISOString(),
    createdBy: refId(expense.createdBy),
    createdByName: refName(expense.createdBy),
    approvedBy: expense.approvedBy ? refId(expense.approvedBy) : undefined,
    approvedByName: refName(expense.approvedBy),
    rejectionReason: expense.rejectionReason ?? undefined,
    createdAt: expense.createdAt?.toISOString() ?? '',
    updatedAt: expense.updatedAt?.toISOString() ?? '',
  };
}
