import { Types } from 'mongoose';
import {
  EventStatus,
  ExpenseStatus,
  PaymentStatus,
  PaymentType,
  UserRole,
  UserStatus,
  type DashboardStatsDto,
  type PeriodComparisonDto,
  type TrendPointDto,
} from '@community-finance/shared';
import { EventModel } from '../models/event.model';
import { ExpenseModel } from '../models/expense.model';
import { IncomeModel } from '../models/income.model';
import { PaymentModel } from '../models/payment.model';
import { UserModel } from '../models/user.model';
import type { EventEntity } from '../repositories/event.repository';
import type { FeeConfigRepository } from '../repositories/fee-config.repository';
import { toEventDto } from './event.service';
import type { BalanceService } from './balance.service';

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function changePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export class DashboardService {
  constructor(
    private readonly balance: BalanceService,
    private readonly feeConfigs: FeeConfigRepository
  ) {}

  async getStats(communityId: string): Promise<DashboardStatsDto> {
    const cid = new Types.ObjectId(communityId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      currentBalance,
      incomeByMonth,
      expenseByMonth,
      monthPayments,
      memberCounts,
      upcomingEventsRaw,
      topCategories,
      yearIncome,
      prevYearIncome,
      feeConfig,
    ] = await Promise.all([
      this.balance.getCurrentBalance(communityId),
      IncomeModel.aggregate<{ _id: { y: number; m: number }; total: number }>([
        { $match: { communityId: cid, deletedAt: null, receivedAt: { $gte: trendStart } } },
        {
          $group: {
            _id: { y: { $year: '$receivedAt' }, m: { $month: '$receivedAt' } },
            total: { $sum: '$amount' },
          },
        },
      ]),
      ExpenseModel.aggregate<{ _id: { y: number; m: number }; total: number }>([
        {
          $match: {
            communityId: cid,
            deletedAt: null,
            status: ExpenseStatus.APPROVED,
            expenseDate: { $gte: trendStart },
          },
        },
        {
          $group: {
            _id: { y: { $year: '$expenseDate' }, m: { $month: '$expenseDate' } },
            total: { $sum: '$amount' },
          },
        },
      ]),
      PaymentModel.aggregate<{ _id: string; count: number; total: number }>([
        {
          $match: {
            communityId: cid,
            type: PaymentType.SUBSCRIPTION,
            createdAt: { $gte: monthStart, $lt: nextMonthStart },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ]),
      UserModel.aggregate<{ _id: string; count: number }>([
        { $match: { communityId: cid, role: UserRole.MEMBER, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      EventModel.find({
        communityId: cid,
        status: { $in: [EventStatus.DRAFT, EventStatus.ACTIVE] },
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .limit(5)
        .lean<EventEntity[]>(),
      ExpenseModel.aggregate<{ _id: string; amount: number; count: number }>([
        {
          $match: {
            communityId: cid,
            deletedAt: null,
            status: ExpenseStatus.APPROVED,
            expenseDate: { $gte: yearStart },
          },
        },
        { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
        { $limit: 5 },
      ]),
      IncomeModel.aggregate<{ total: number }>([
        { $match: { communityId: cid, deletedAt: null, receivedAt: { $gte: yearStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      IncomeModel.aggregate<{ total: number }>([
        {
          $match: {
            communityId: cid,
            deletedAt: null,
            receivedAt: { $gte: prevYearStart, $lt: yearStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.feeConfigs.findActive(communityId),
    ]);

    // Build 12-month trend series with zero-filled gaps.
    const collectionTrend: TrendPointDto[] = [];
    const expenseTrend: TrendPointDto[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const inc = incomeByMonth.find((r) => r._id.y === d.getFullYear() && r._id.m === d.getMonth() + 1);
      const exp = expenseByMonth.find((r) => r._id.y === d.getFullYear() && r._id.m === d.getMonth() + 1);
      collectionTrend.push({ period: key, amount: inc?.total ?? 0 });
      expenseTrend.push({ period: key, amount: exp?.total ?? 0 });
    }

    const thisMonthIncome = collectionTrend[collectionTrend.length - 1]?.amount ?? 0;
    const prevMonthIncome = collectionTrend[collectionTrend.length - 2]?.amount ?? 0;
    const thisMonthExpenses = expenseTrend[expenseTrend.length - 1]?.amount ?? 0;

    const monthlyComparison: PeriodComparisonDto = {
      current: thisMonthIncome,
      previous: prevMonthIncome,
      changePercent: changePercent(thisMonthIncome, prevMonthIncome),
    };
    const yearlyComparison: PeriodComparisonDto = {
      current: yearIncome[0]?.total ?? 0,
      previous: prevYearIncome[0]?.total ?? 0,
      changePercent: changePercent(yearIncome[0]?.total ?? 0, prevYearIncome[0]?.total ?? 0),
    };

    const stat = (s: PaymentStatus) => monthPayments.find((p) => p._id === s);
    const activeMembers = memberCounts.find((m) => m._id === UserStatus.ACTIVE)?.count ?? 0;
    const totalMembers = memberCounts.reduce((sum, m) => sum + m.count, 0);
    const paidMembers = stat(PaymentStatus.PAID)?.count ?? 0;
    const expected = (feeConfig?.amount ?? 0) * activeMembers;
    const collectedThisMonth = stat(PaymentStatus.PAID)?.total ?? 0;

    void prevMonthStart; // reserved for future prev-month drill-down

    return {
      currentBalance,
      monthlyCollection: collectedThisMonth,
      monthlyExpenses: thisMonthExpenses,
      pendingCollection: Math.max(0, expected - collectedThisMonth),
      totalMembers,
      activeMembers,
      paidMembersThisMonth: paidMembers,
      pendingMembersThisMonth: Math.max(0, activeMembers - paidMembers),
      failedPaymentsThisMonth: stat(PaymentStatus.FAILED)?.count ?? 0,
      upcomingEvents: upcomingEventsRaw.map(toEventDto),
      collectionTrend,
      expenseTrend,
      topExpenseCategories: topCategories.map((c) => ({
        category: c._id,
        amount: c.amount,
        count: c.count,
      })),
      monthlyComparison,
      yearlyComparison,
    };
  }
}
