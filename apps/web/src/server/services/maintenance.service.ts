import { Types } from 'mongoose';
import { AuditAction, AuditEntity, UserRole } from '@community-finance/shared';
import { AdjustmentModel } from '../models/adjustment.model';
import { DocumentModel } from '../models/document.model';
import { EventModel } from '../models/event.model';
import { EventSplitHistoryModel, EventSplitModel } from '../models/event-split.model';
import { ExpenseModel } from '../models/expense.model';
import { IncomeModel } from '../models/income.model';
import { NotificationModel } from '../models/notification.model';
import { PaymentModel } from '../models/payment.model';
import { RazorpaySubscriptionModel } from '../models/razorpay-subscription.model';
import { UserModel } from '../models/user.model';
import type { AuditService } from './audit.service';

export const CLEARABLE_SECTIONS = [
  'PAYMENTS',
  'EXPENSES',
  'INCOME',
  'EVENTS',
  'DOCUMENTS',
  'NOTIFICATIONS',
  'SUBSCRIPTIONS',
  'MEMBERS',
  'ALL',
] as const;

export type ClearSection = (typeof CLEARABLE_SECTIONS)[number];

const SECTION_ENTITY: Record<ClearSection, AuditEntity> = {
  PAYMENTS: AuditEntity.PAYMENT,
  EXPENSES: AuditEntity.EXPENSE,
  INCOME: AuditEntity.INCOME,
  EVENTS: AuditEntity.EVENT,
  DOCUMENTS: AuditEntity.DOCUMENT,
  NOTIFICATIONS: AuditEntity.NOTIFICATION,
  SUBSCRIPTIONS: AuditEntity.SUBSCRIPTION,
  MEMBERS: AuditEntity.USER,
  ALL: AuditEntity.COMMUNITY,
};

/**
 * Destructive data maintenance — the admin "danger zone". Super-admin only.
 * Everything is tenant-scoped to the caller's community. Audit logs and
 * closed-period snapshots are intentionally NOT clearable (immutable by
 * design); the community, its settings, and fee config are preserved.
 */
export class MaintenanceService {
  constructor(private readonly audit: AuditService) {}

  async clearSection(
    communityId: string,
    section: ClearSection,
    actorId: string
  ): Promise<Record<string, number>> {
    const cid = new Types.ObjectId(communityId);
    const counts: Record<string, number> = {};

    const del = async (label: string, model: { deleteMany: (f: object) => Promise<{ deletedCount?: number }> }, filter: object = {}) => {
      const res = await model.deleteMany({ communityId: cid, ...filter });
      counts[label] = res.deletedCount ?? 0;
    };

    const clearPayments = () => del('payments', PaymentModel);
    const clearExpenses = () => del('expenses', ExpenseModel);
    const clearIncome = () => del('income', IncomeModel);
    const clearEvents = async () => {
      await del('events', EventModel);
      await del('eventSplits', EventSplitModel);
      await del('splitHistory', EventSplitHistoryModel);
    };
    const clearDocuments = () => del('documents', DocumentModel);
    const clearNotifications = () => del('notifications', NotificationModel);
    const clearSubscriptions = () => del('subscriptions', RazorpaySubscriptionModel);
    const clearAdjustments = () => del('adjustments', AdjustmentModel);

    switch (section) {
      case 'PAYMENTS':
        await clearPayments();
        break;
      case 'EXPENSES':
        await clearExpenses();
        break;
      case 'INCOME':
        await clearIncome();
        break;
      case 'EVENTS':
        await clearEvents();
        break;
      case 'DOCUMENTS':
        await clearDocuments();
        break;
      case 'NOTIFICATIONS':
        await clearNotifications();
        break;
      case 'SUBSCRIPTIONS':
        await clearSubscriptions();
        break;
      case 'MEMBERS':
        // Remove members and admins (never the acting super admin) plus the
        // transactional records that reference them.
        await del('members', UserModel, {
          role: { $in: [UserRole.MEMBER, UserRole.ADMIN] },
          _id: { $ne: new Types.ObjectId(actorId) },
        });
        await clearPayments();
        await del('eventSplits', EventSplitModel);
        await clearSubscriptions();
        break;
      case 'ALL':
        await clearPayments();
        await clearExpenses();
        await clearIncome();
        await clearEvents();
        await clearDocuments();
        await clearNotifications();
        await clearSubscriptions();
        await clearAdjustments();
        break;
    }

    await this.audit.record({
      action: AuditAction.DELETE,
      entity: SECTION_ENTITY[section],
      after: { cleared: section, counts, clearedBy: actorId },
    });

    return counts;
  }
}
