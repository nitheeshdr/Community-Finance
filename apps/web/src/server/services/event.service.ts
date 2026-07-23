import {
  AuditAction,
  AuditEntity,
  EventStatus,
  ExpenseStatus,
  NotificationType,
  PaymentStatus,
  UserRole,
  formatINR,
  toPaise,
  type ChangeEventStatusInput,
  type CreateEventInput,
  type EventDto,
  type EventListQuery,
  type EventSplitDto,
  type EventSplitHistoryDto,
  type UpdateEventInput,
} from '@community-finance/shared';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '../errors/app-error';
import { ExpenseModel } from '../models/expense.model';
import { Types } from 'mongoose';
import type { EventEntity, EventRepository } from '../repositories/event.repository';
import type {
  EventSplitEntity,
  EventSplitRepository,
} from '../repositories/event-split.repository';
import type { UserEntity, UserRepository } from '../repositories/user.repository';
import type { ListResult } from '../repositories/base.repository';
import type { AuditService } from './audit.service';
import type { BalanceService } from './balance.service';
import type { BudgetSplitService } from './budget-split.service';
import type { NotificationService } from './notification.service';

export class EventService {
  constructor(
    private readonly events: EventRepository,
    private readonly splits: EventSplitRepository,
    private readonly users: UserRepository,
    private readonly balance: BalanceService,
    private readonly budgetSplit: BudgetSplitService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService
  ) {}

  async list(communityId: string, query: EventListQuery): Promise<ListResult<EventDto>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.search) {
      filter.name = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (query.year) {
      const from = new Date(query.year, (query.month ?? 1) - 1, 1);
      const to = query.month
        ? new Date(query.year, query.month, 1)
        : new Date(query.year + 1, 0, 1);
      filter.date = { $gte: from, $lt: to };
    }
    const { items, total } = await this.events.list(communityId, filter, {
      page: query.page,
      limit: query.limit,
      sort: { date: -1 },
      populate: 'organizerId',
    });
    return { items: (items as EventEntity[]).map(toEventDto), total };
  }

  async getById(communityId: string, id: string): Promise<EventDto> {
    const event = (await this.events.findById(communityId, id)) as EventEntity | null;
    if (!event) throw new NotFoundError('Event');
    return toEventDto(event);
  }

  async create(
    communityId: string,
    input: CreateEventInput,
    createdBy: string,
    actorRole: UserRole
  ): Promise<EventDto> {
    const budgetPaise = toPaise(input.budget);

    // Business rule: budget cannot exceed available balance unless the
    // super admin explicitly overrides.
    const balance = await this.balance.getCurrentBalance(communityId);
    if (budgetPaise > balance) {
      if (!input.budgetOverride) {
        throw new BusinessRuleError(
          `Budget ${formatINR(budgetPaise)} exceeds available balance ${formatINR(balance)}. ` +
            'A super admin can override this.'
        );
      }
      if (actorRole !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenError('Only the super admin can override the budget limit');
      }
    }

    const event = (await this.events.create(communityId, {
      name: input.name,
      description: input.description,
      category: input.category,
      status: EventStatus.ACTIVE,
      date: input.date,
      endDate: input.endDate,
      budget: budgetPaise,
      organizerId: input.organizerId,
      images: input.images,
      budgetOverride: input.budgetOverride,
      createdBy,
    } as never)) as EventEntity;

    await this.budgetSplit.recalculate(communityId, event, `Event created: ${event.name}`);
    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.EVENT,
      entityId: String(event._id),
      after: { name: event.name, budget: event.budget, date: event.date },
    });
    await this.notifications.send({
      communityId,
      type: NotificationType.EVENT_CREATED,
      title: `New event: ${event.name}`,
      body: `Budget ${formatINR(event.budget)}. Your contribution share will appear in the event page.`,
      data: { eventId: String(event._id) },
    });

    const fresh = (await this.events.findById(communityId, String(event._id))) as EventEntity;
    return toEventDto(fresh);
  }

  async update(
    communityId: string,
    id: string,
    input: UpdateEventInput,
    actorRole: UserRole
  ): Promise<EventDto> {
    const existing = (await this.events.findById(communityId, id)) as EventEntity | null;
    if (!existing) throw new NotFoundError('Event');
    if (existing.status === EventStatus.CLOSED) {
      throw new BusinessRuleError('Closed events cannot be edited');
    }

    const update: Record<string, unknown> = { ...input };
    let budgetChanged = false;

    if (input.budget !== undefined) {
      const budgetPaise = toPaise(input.budget);
      if (budgetPaise !== existing.budget) {
        const balance = await this.balance.getCurrentBalance(communityId);
        if (budgetPaise > balance && !(input.budgetOverride ?? existing.budgetOverride)) {
          throw new BusinessRuleError(
            `Budget ${formatINR(budgetPaise)} exceeds available balance ${formatINR(balance)}.`
          );
        }
        if (budgetPaise > balance && actorRole !== UserRole.SUPER_ADMIN) {
          throw new ForbiddenError('Only the super admin can override the budget limit');
        }
        budgetChanged = true;
      }
      update.budget = budgetPaise;
    }

    const updated = (await this.events.updateById(communityId, id, {
      $set: update,
    })) as EventEntity;

    if (budgetChanged) {
      await this.budgetSplit.recalculate(
        communityId,
        updated,
        `Budget changed to ${formatINR(updated.budget)}`
      );
    }
    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.EVENT,
      entityId: id,
      before: { name: existing.name, budget: existing.budget },
      after: update,
    });
    const fresh = (await this.events.findById(communityId, id)) as EventEntity;
    return toEventDto(fresh);
  }

  async changeStatus(
    communityId: string,
    id: string,
    input: ChangeEventStatusInput
  ): Promise<EventDto> {
    const existing = (await this.events.findById(communityId, id)) as EventEntity | null;
    if (!existing) throw new NotFoundError('Event');
    if (existing.status === input.status) return toEventDto(existing);

    // Business rule: an event closes only when every expense is reconciled
    // (none pending).
    if (input.status === EventStatus.CLOSED) {
      const pendingExpenses = await ExpenseModel.countDocuments({
        communityId: new Types.ObjectId(communityId),
        eventId: existing._id,
        status: ExpenseStatus.PENDING,
        deletedAt: null,
      });
      if (pendingExpenses > 0) {
        throw new BusinessRuleError(
          `Cannot close: ${pendingExpenses} expense(s) still awaiting approval`
        );
      }
    }

    const updated = (await this.events.updateById(communityId, id, {
      $set: {
        status: input.status,
        ...(input.status === EventStatus.CLOSED ? { closedAt: new Date() } : {}),
      },
    })) as EventEntity;

    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.EVENT,
      entityId: id,
      before: { status: existing.status },
      after: { status: input.status, reason: input.reason },
    });
    return toEventDto(updated);
  }

  async remove(communityId: string, id: string): Promise<void> {
    const existing = (await this.events.findById(communityId, id)) as EventEntity | null;
    if (!existing) throw new NotFoundError('Event');

    const expenseCount = await ExpenseModel.countDocuments({
      communityId: new Types.ObjectId(communityId),
      eventId: existing._id,
      deletedAt: null,
    });
    if (expenseCount > 0 || existing.collectedAmount > 0) {
      throw new BusinessRuleError(
        'Events with recorded expenses or collections cannot be deleted — cancel the event instead'
      );
    }

    await this.events.deleteById(communityId, id);
    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.EVENT,
      entityId: id,
      before: { name: existing.name, budget: existing.budget },
    });
  }

  async getSplits(communityId: string, eventId: string): Promise<EventSplitDto[]> {
    const event = await this.events.findById(communityId, eventId);
    if (!event) throw new NotFoundError('Event');

    const splits = (await this.splits.findForEvent(communityId, eventId)) as EventSplitEntity[];
    const memberIds = splits.map((s) => String(s.memberId));
    const members = (await this.users.findMany(communityId, {
      _id: { $in: memberIds },
    })) as UserEntity[];
    const nameById = new Map(members.map((m) => [String(m._id), m.name]));

    return splits
      .filter((s) => !s.inactive || s.paidAmount > 0)
      .map((s) => ({
        id: String(s._id),
        eventId,
        memberId: String(s.memberId),
        memberName: nameById.get(String(s.memberId)) ?? 'Former member',
        splitAmount: s.splitAmount,
        paidAmount: s.paidAmount,
        status: s.status as PaymentStatus,
        updatedAt: s.updatedAt?.toISOString() ?? '',
      }))
      .sort((a, b) => (a.memberName ?? '').localeCompare(b.memberName ?? ''));
  }

  async getSplitHistory(communityId: string, eventId: string): Promise<EventSplitHistoryDto[]> {
    const history = await this.splits.historyForEvent(communityId, eventId);
    return history.map((h) => ({
      id: String(h._id),
      eventId,
      activeMemberCount: h.activeMemberCount,
      perHeadAmount: h.perHeadAmount,
      budget: h.budget,
      trigger: h.trigger,
      createdAt: h.createdAt?.toISOString() ?? '',
    }));
  }
}

/* ---------------------------------------------------------------- */

function refName(ref: unknown): string | undefined {
  if (ref && typeof ref === 'object' && 'name' in ref) {
    return String((ref as { name: unknown }).name);
  }
  return undefined;
}

function refId(ref: unknown): string | undefined {
  if (!ref) return undefined;
  if (typeof ref === 'object' && '_id' in ref) return String((ref as { _id: unknown })._id);
  return String(ref);
}

export function toEventDto(event: EventEntity): EventDto {
  return {
    id: String(event._id),
    name: event.name,
    description: event.description ?? undefined,
    category: event.category as EventDto['category'],
    status: event.status as EventDto['status'],
    date: event.date.toISOString(),
    endDate: event.endDate?.toISOString(),
    budget: event.budget,
    perHeadAmount: event.perHeadAmount ?? 0,
    collectedAmount: event.collectedAmount ?? 0,
    spentAmount: event.spentAmount ?? 0,
    organizerId: refId(event.organizerId),
    organizerName: refName(event.organizerId),
    images: event.images ?? [],
    budgetOverride: event.budgetOverride ?? false,
    createdAt: event.createdAt?.toISOString() ?? '',
  };
}
