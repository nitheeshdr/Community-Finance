/**
 * Core business rule tests: event budgets split equally across ACTIVE
 * members and recalculate on membership changes, preserving payments.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CommunityType,
  EventStatus,
  PaymentStatus,
  UserRole,
  UserStatus,
  toPaise,
} from '@community-finance/shared';
import { clearCollections, setupTestDb, teardownTestDb } from './helpers/db';
import { CommunityModel } from '@/server/models/community.model';
import { EventModel } from '@/server/models/event.model';
import { EventSplitModel } from '@/server/models/event-split.model';
import { UserModel } from '@/server/models/user.model';
import { EventRepository, type EventEntity } from '@/server/repositories/event.repository';
import { EventSplitRepository } from '@/server/repositories/event-split.repository';
import { UserRepository } from '@/server/repositories/user.repository';
import { BudgetSplitService } from '@/server/services/budget-split.service';
import type { NotificationService } from '@/server/services/notification.service';

const noopNotifications = {
  send: async () => undefined,
} as unknown as NotificationService;

describe('BudgetSplitService', () => {
  let service: BudgetSplitService;
  let communityId: string;

  beforeAll(async () => {
    await setupTestDb();
    service = new BudgetSplitService(
      new EventRepository(),
      new EventSplitRepository(),
      new UserRepository(),
      noopNotifications
    );
  });
  afterAll(teardownTestDb);

  beforeEach(async () => {
    await clearCollections();
    const community = await CommunityModel.create({
      name: 'Test Village',
      type: CommunityType.VILLAGE,
    });
    communityId = String(community._id);
  });

  async function createMembers(count: number): Promise<string[]> {
    const members = await UserModel.create(
      Array.from({ length: count }, (_, i) => ({
        communityId,
        name: `Member ${i}`,
        phone: `98765${String(10000 + i).slice(-5)}`,
        passwordHash: 'hash',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
      }))
    );
    return members.map((m) => String(m._id));
  }

  async function createEvent(budgetRupees: number): Promise<EventEntity> {
    const admin = await UserModel.create({
      communityId,
      name: 'Admin',
      phone: '9000000001',
      passwordHash: 'hash',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    const event = await EventModel.create({
      communityId,
      name: 'Temple Festival',
      status: EventStatus.ACTIVE,
      date: new Date(),
      budget: toPaise(budgetRupees),
      createdBy: admin._id,
    });
    return event.toObject() as EventEntity;
  }

  it('splits ₹60,000 across 60 members as ₹1,000 each', async () => {
    await createMembers(60);
    const event = await createEvent(60_000);

    const result = await service.recalculate(communityId, event, 'Event created');

    expect(result).not.toBeNull();
    expect(result!.activeCount).toBe(60);
    expect(result!.perHead).toBe(toPaise(1000));

    const splits = await EventSplitModel.find({ eventId: event._id });
    expect(splits).toHaveLength(60);
    expect(splits.every((s) => s.splitAmount === toPaise(1000))).toBe(true);
  });

  it('recalculates to ₹1,200 when members drop from 60 to 50', async () => {
    const memberIds = await createMembers(60);
    const event = await createEvent(60_000);
    await service.recalculate(communityId, event, 'Event created');

    // Suspend 10 members.
    await UserModel.updateMany(
      { _id: { $in: memberIds.slice(0, 10) } },
      { status: UserStatus.SUSPENDED }
    );
    const result = await service.recalculate(communityId, event, 'Members suspended');

    expect(result!.activeCount).toBe(50);
    expect(result!.perHead).toBe(toPaise(1200));

    const activeSplits = await EventSplitModel.find({ eventId: event._id, inactive: false });
    expect(activeSplits).toHaveLength(50);
    expect(activeSplits.every((s) => s.splitAmount === toPaise(1200))).toBe(true);

    // Suspended members' rows survive, flagged inactive.
    const inactiveSplits = await EventSplitModel.find({ eventId: event._id, inactive: true });
    expect(inactiveSplits).toHaveLength(10);
  });

  it('preserves paidAmount across recalculation and re-derives status', async () => {
    const memberIds = await createMembers(4);
    const event = await createEvent(4_000); // ₹1,000 each
    await service.recalculate(communityId, event, 'Event created');

    // Member 0 pays their full share.
    await new EventSplitRepository().applyPayment(
      communityId,
      String(event._id),
      memberIds[0]!,
      toPaise(1000)
    );

    // A member is removed → per head rises to ceil(4000/3) = ₹1,333.34
    await UserModel.updateOne({ _id: memberIds[3] }, { status: UserStatus.INACTIVE });
    await service.recalculate(communityId, event, 'Member removed');

    const paidSplit = await EventSplitModel.findOne({
      eventId: event._id,
      memberId: memberIds[0],
    });
    expect(paidSplit!.paidAmount).toBe(toPaise(1000)); // survived
    expect(paidSplit!.status).toBe(PaymentStatus.PENDING); // now short of the new share
    expect(paidSplit!.splitAmount).toBe(Math.ceil(toPaise(4000) / 3));
  });

  it('records split history for every recalculation', async () => {
    await createMembers(10);
    const event = await createEvent(10_000);
    await service.recalculate(communityId, event, 'Event created');

    await UserModel.updateOne(
      { communityId, role: UserRole.MEMBER, status: UserStatus.ACTIVE },
      { status: UserStatus.SUSPENDED }
    );
    await service.recalculate(communityId, event, 'Member suspended');

    const history = await new EventSplitRepository().historyForEvent(
      communityId,
      String(event._id)
    );
    expect(history).toHaveLength(2);
    expect(history[0]!.activeMemberCount).toBe(9);
    expect(history[1]!.activeMemberCount).toBe(10);
  });

  it('is a no-op when nothing changed', async () => {
    await createMembers(10);
    const event = await createEvent(10_000);
    await service.recalculate(communityId, event, 'Event created');
    const second = await service.recalculate(communityId, event, 'No change');
    expect(second).toBeNull();
  });
});
