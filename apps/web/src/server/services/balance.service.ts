import { Types } from 'mongoose';
import { ExpenseStatus } from '@community-finance/shared';
import { AdjustmentModel } from '../models/adjustment.model';
import { ExpenseModel } from '../models/expense.model';
import { IncomeModel } from '../models/income.model';

/**
 * Community balance = Σ income − Σ approved expenses ± adjustments.
 * Computed live from source records — never stored — so it is always
 * consistent with the ledger. Immutable monthly snapshots freeze the
 * closed-period view separately.
 */
export class BalanceService {
  async getCurrentBalance(communityId: string): Promise<number> {
    const cid = new Types.ObjectId(communityId);
    const [income, expenses, adjustments] = await Promise.all([
      IncomeModel.aggregate<{ total: number }>([
        { $match: { communityId: cid, deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      ExpenseModel.aggregate<{ total: number }>([
        { $match: { communityId: cid, status: ExpenseStatus.APPROVED, deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      AdjustmentModel.aggregate<{ _id: string; total: number }>([
        { $match: { communityId: cid } },
        { $group: { _id: '$entity', total: { $sum: '$amount' } } },
      ]),
    ]);

    const incomeTotal = income[0]?.total ?? 0;
    const expenseTotal = expenses[0]?.total ?? 0;
    const incomeAdj = adjustments.find((a) => a._id === 'INCOME')?.total ?? 0;
    const expenseAdj = adjustments.find((a) => a._id === 'EXPENSE')?.total ?? 0;

    return incomeTotal + incomeAdj - (expenseTotal + expenseAdj);
  }
}
