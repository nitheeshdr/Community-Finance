import { Types } from 'mongoose';
import {
  AuditAction,
  AuditEntity,
  EventStatus,
  ExpenseStatus,
  IncomeSource,
  NotificationType,
  PaymentStatus,
  PaymentType,
  ReportPeriod,
  UserRole,
  UserStatus,
  type CategoryTotalDto,
  type CreateAdjustmentInput,
  type FinancialReportDto,
} from '@community-finance/shared';
import { BusinessRuleError, ConflictError } from '../errors/app-error';
import { AdjustmentModel } from '../models/adjustment.model';
import { EventModel } from '../models/event.model';
import { ExpenseModel } from '../models/expense.model';
import { IncomeModel } from '../models/income.model';
import { PaymentModel } from '../models/payment.model';
import { ReportSnapshotModel } from '../models/report-snapshot.model';
import { UserModel } from '../models/user.model';
import type { FeeConfigRepository } from '../repositories/fee-config.repository';
import type { AuditService } from './audit.service';
import type { NotificationService } from './notification.service';

interface DateRange {
  from: Date;
  to: Date; // exclusive
  label: string;
}

export function resolveDateRange(period: ReportPeriod, anchor: Date): DateRange {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();
  switch (period) {
    case ReportPeriod.DAILY:
      return {
        from: new Date(y, m, d),
        to: new Date(y, m, d + 1),
        label: anchor.toISOString().slice(0, 10),
      };
    case ReportPeriod.WEEKLY: {
      const day = anchor.getDay() || 7; // Monday-based week
      const from = new Date(y, m, d - day + 1);
      const to = new Date(y, m, d - day + 8);
      return { from, to, label: `Week of ${from.toISOString().slice(0, 10)}` };
    }
    case ReportPeriod.MONTHLY:
      return {
        from: new Date(y, m, 1),
        to: new Date(y, m + 1, 1),
        label: `${y}-${String(m + 1).padStart(2, '0')}`,
      };
    case ReportPeriod.QUARTERLY: {
      const q = Math.floor(m / 3);
      return {
        from: new Date(y, q * 3, 1),
        to: new Date(y, q * 3 + 3, 1),
        label: `Q${q + 1} ${y}`,
      };
    }
    case ReportPeriod.YEARLY:
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1), label: String(y) };
  }
}

export class ReportService {
  constructor(
    private readonly feeConfigs: FeeConfigRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService
  ) {}

  /**
   * Live financial report for a period. For closed monthly periods the
   * immutable snapshot is authoritative and returned instead.
   */
  async generate(
    communityId: string,
    period: ReportPeriod,
    anchor: Date = new Date()
  ): Promise<FinancialReportDto> {
    const range = resolveDateRange(period, anchor);

    if (period === ReportPeriod.MONTHLY) {
      const snapshot = await ReportSnapshotModel.findOne({
        communityId: new Types.ObjectId(communityId),
        period: range.label,
      }).lean();
      if (snapshot) return snapshotToDto(snapshot, range);
    }

    return this.computeLive(communityId, range);
  }

  private async computeLive(communityId: string, range: DateRange): Promise<FinancialReportDto> {
    const cid = new Types.ObjectId(communityId);
    const inRange = { $gte: range.from, $lt: range.to };

    const [
      incomeBySource,
      expensesByCategory,
      incomeBeforeTotal,
      expensesBeforeTotal,
      adjustments,
      paymentStats,
      memberCounts,
      eventStats,
      donationAgg,
      feeConfig,
      activeMemberCount,
    ] = await Promise.all([
      IncomeModel.aggregate<CategoryTotalDto & { _id: string }>([
        { $match: { communityId: cid, deletedAt: null, receivedAt: inRange } },
        { $group: { _id: '$source', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $project: { category: '$_id', amount: 1, count: 1 } },
        { $sort: { amount: -1 } },
      ]),
      ExpenseModel.aggregate<CategoryTotalDto & { _id: string }>([
        {
          $match: {
            communityId: cid,
            deletedAt: null,
            status: ExpenseStatus.APPROVED,
            expenseDate: inRange,
          },
        },
        { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $project: { category: '$_id', amount: 1, count: 1 } },
        { $sort: { amount: -1 } },
      ]),
      IncomeModel.aggregate<{ total: number }>([
        { $match: { communityId: cid, deletedAt: null, receivedAt: { $lt: range.from } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      ExpenseModel.aggregate<{ total: number }>([
        {
          $match: {
            communityId: cid,
            deletedAt: null,
            status: ExpenseStatus.APPROVED,
            expenseDate: { $lt: range.from },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      AdjustmentModel.aggregate<{ _id: string; total: number }>([
        { $match: { communityId: cid, createdAt: { $lt: range.to } } },
        { $group: { _id: '$entity', total: { $sum: '$amount' } } },
      ]),
      PaymentModel.aggregate<{ _id: string; total: number; count: number }>([
        {
          $match: {
            communityId: cid,
            type: PaymentType.SUBSCRIPTION,
            createdAt: inRange,
          },
        },
        { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      UserModel.aggregate<{ _id: string; count: number }>([
        { $match: { communityId: cid, role: { $ne: UserRole.SUPER_ADMIN }, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      EventModel.aggregate<{ _id: string; count: number; budget: number }>([
        { $match: { communityId: cid } },
        { $group: { _id: '$status', count: { $sum: 1 }, budget: { $sum: '$budget' } } },
      ]),
      IncomeModel.aggregate<{ total: number; count: number }>([
        {
          $match: {
            communityId: cid,
            deletedAt: null,
            source: IncomeSource.DONATION,
            receivedAt: inRange,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.feeConfigs.findActive(communityId),
      UserModel.countDocuments({
        communityId: cid,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      }),
    ]);

    const incomeTotal = incomeBySource.reduce((sum, r) => sum + r.amount, 0);
    const expenseTotal = expensesByCategory.reduce((sum, r) => sum + r.amount, 0);
    const incomeAdj = adjustments.find((a) => a._id === 'INCOME')?.total ?? 0;
    const expenseAdj = adjustments.find((a) => a._id === 'EXPENSE')?.total ?? 0;

    const openingBalance =
      (incomeBeforeTotal[0]?.total ?? 0) - (expensesBeforeTotal[0]?.total ?? 0);
    const closingBalance =
      openingBalance + incomeTotal + incomeAdj - expenseTotal - expenseAdj;

    const stat = (status: PaymentStatus) => paymentStats.find((s) => s._id === status);
    const collected = stat(PaymentStatus.PAID)?.total ?? 0;
    const paidCount = stat(PaymentStatus.PAID)?.count ?? 0;
    const pendingCount =
      (stat(PaymentStatus.PENDING)?.count ?? 0) + (stat(PaymentStatus.OVERDUE)?.count ?? 0);
    const failedCount = stat(PaymentStatus.FAILED)?.count ?? 0;

    // Expected = monthly fee × active members (monthly-equivalent view).
    const expected = (feeConfig?.amount ?? 0) * activeMemberCount;

    const memberCount = (status: UserStatus) =>
      memberCounts.find((m) => m._id === status)?.count ?? 0;

    const openEventStatuses: string[] = [EventStatus.DRAFT, EventStatus.ACTIVE];
    const closedStatuses: string[] = [EventStatus.CLOSED, EventStatus.COMPLETED];

    return {
      period: range.label,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      income: {
        total: incomeTotal,
        bySource: incomeBySource.map(({ category, amount, count }) => ({ category, amount, count })),
      },
      expenses: {
        total: expenseTotal,
        byCategory: expensesByCategory.map(({ category, amount, count }) => ({
          category,
          amount,
          count,
        })),
      },
      openingBalance,
      closingBalance,
      collection: {
        expected,
        collected,
        pending: Math.max(0, expected - collected),
        paidCount,
        pendingCount,
        failedCount,
      },
      memberStats: {
        total:
          memberCount(UserStatus.ACTIVE) +
          memberCount(UserStatus.INACTIVE) +
          memberCount(UserStatus.SUSPENDED),
        active: memberCount(UserStatus.ACTIVE),
        inactive: memberCount(UserStatus.INACTIVE),
        suspended: memberCount(UserStatus.SUSPENDED),
      },
      eventStats: {
        total: eventStats.reduce((s, e) => s + e.count, 0),
        active: eventStats
          .filter((e) => openEventStatuses.includes(e._id))
          .reduce((s, e) => s + e.count, 0),
        closed: eventStats
          .filter((e) => closedStatuses.includes(e._id))
          .reduce((s, e) => s + e.count, 0),
        totalBudget: eventStats.reduce((s, e) => s + e.budget, 0),
      },
      donations: {
        total: donationAgg[0]?.total ?? 0,
        count: donationAgg[0]?.count ?? 0,
      },
      generatedAt: new Date().toISOString(),
      snapshot: false,
    };
  }

  /** Close a month: freeze an immutable snapshot. Fails if already closed. */
  async closePeriod(communityId: string, period: string, closedBy?: string): Promise<void> {
    const [yearStr, monthStr] = period.split('-');
    const anchor = new Date(Number(yearStr), Number(monthStr) - 1, 15);
    const range = resolveDateRange(ReportPeriod.MONTHLY, anchor);

    if (range.to > new Date()) {
      throw new BusinessRuleError('Cannot close a period that has not ended yet');
    }
    const existing = await ReportSnapshotModel.findOne({
      communityId: new Types.ObjectId(communityId),
      period,
    }).lean();
    if (existing) throw new ConflictError(`Period ${period} is already closed`);

    const report = await this.computeLive(communityId, range);

    await ReportSnapshotModel.create({
      communityId,
      period,
      totals: {
        income: report.income.total,
        expenses: report.expenses.total,
        openingBalance: report.openingBalance,
        closingBalance: report.closingBalance,
        collectionExpected: report.collection.expected,
        collectionReceived: report.collection.collected,
        collectionPending: report.collection.pending,
        paidCount: report.collection.paidCount,
        pendingCount: report.collection.pendingCount,
        failedCount: report.collection.failedCount,
        donationTotal: report.donations.total,
        donationCount: report.donations.count,
      },
      incomeBySource: report.income.bySource,
      expensesByCategory: report.expenses.byCategory,
      memberStats: report.memberStats,
      eventStats: report.eventStats,
      closedBy,
    });

    await this.audit.record({
      action: AuditAction.PERIOD_CLOSED,
      entity: AuditEntity.REPORT,
      after: { period, closingBalance: report.closingBalance },
    });
    await this.notifications.send({
      communityId,
      type: NotificationType.REPORT_READY,
      title: `Monthly report ready: ${period}`,
      body: 'The monthly financial report has been finalized and is available in Reports.',
    });
  }

  /** List closed-period snapshots. */
  async listSnapshots(communityId: string): Promise<Array<{ period: string; closedAt: string }>> {
    const snapshots = await ReportSnapshotModel.find({
      communityId: new Types.ObjectId(communityId),
    })
      .sort({ period: -1 })
      .select('period closedAt')
      .lean();
    return snapshots.map((s) => ({
      period: s.period,
      closedAt: s.closedAt?.toISOString() ?? '',
    }));
  }

  /**
   * Correction entry — the only way to amend closed-period figures.
   * Never mutates or deletes source records.
   */
  async createAdjustment(
    communityId: string,
    input: CreateAdjustmentInput,
    createdBy: string
  ): Promise<void> {
    await AdjustmentModel.create({
      communityId,
      entity: input.entity,
      amount: Math.round(input.amount * 100), // rupees → paise
      reason: input.reason,
      targetId: input.targetId,
      eventId: input.eventId,
      createdBy,
    });
    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.ADJUSTMENT,
      after: { entity: input.entity, amount: input.amount, reason: input.reason },
    });
  }
}

/* ---------------------------------------------------------------- */

interface SnapshotLean {
  totals?: {
    income?: number | null;
    expenses?: number | null;
    openingBalance?: number | null;
    closingBalance?: number | null;
    collectionExpected?: number | null;
    collectionReceived?: number | null;
    collectionPending?: number | null;
    paidCount?: number | null;
    pendingCount?: number | null;
    failedCount?: number | null;
    donationTotal?: number | null;
    donationCount?: number | null;
  } | null;
  incomeBySource?: Array<{ category?: string | null; amount?: number | null; count?: number | null }> | null;
  expensesByCategory?: Array<{ category?: string | null; amount?: number | null; count?: number | null }> | null;
  memberStats?: { total?: number | null; active?: number | null; inactive?: number | null; suspended?: number | null } | null;
  eventStats?: { total?: number | null; active?: number | null; closed?: number | null; totalBudget?: number | null } | null;
  closedAt?: Date | null;
}

function snapshotToDto(snapshot: SnapshotLean, range: DateRange): FinancialReportDto {
  const t = snapshot.totals ?? {};
  const mapCat = (
    rows: SnapshotLean['incomeBySource']
  ): CategoryTotalDto[] =>
    (rows ?? []).map((r) => ({
      category: r.category ?? '',
      amount: r.amount ?? 0,
      count: r.count ?? 0,
    }));

  return {
    period: range.label,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    income: { total: t.income ?? 0, bySource: mapCat(snapshot.incomeBySource) },
    expenses: { total: t.expenses ?? 0, byCategory: mapCat(snapshot.expensesByCategory) },
    openingBalance: t.openingBalance ?? 0,
    closingBalance: t.closingBalance ?? 0,
    collection: {
      expected: t.collectionExpected ?? 0,
      collected: t.collectionReceived ?? 0,
      pending: t.collectionPending ?? 0,
      paidCount: t.paidCount ?? 0,
      pendingCount: t.pendingCount ?? 0,
      failedCount: t.failedCount ?? 0,
    },
    memberStats: {
      total: snapshot.memberStats?.total ?? 0,
      active: snapshot.memberStats?.active ?? 0,
      inactive: snapshot.memberStats?.inactive ?? 0,
      suspended: snapshot.memberStats?.suspended ?? 0,
    },
    eventStats: {
      total: snapshot.eventStats?.total ?? 0,
      active: snapshot.eventStats?.active ?? 0,
      closed: snapshot.eventStats?.closed ?? 0,
      totalBudget: snapshot.eventStats?.totalBudget ?? 0,
    },
    donations: { total: t.donationTotal ?? 0, count: t.donationCount ?? 0 },
    generatedAt: snapshot.closedAt?.toISOString() ?? new Date().toISOString(),
    snapshot: true,
  };
}
