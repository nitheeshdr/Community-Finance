import { Types } from 'mongoose';
import { IncomeModel, type IncomeDoc } from '../models/income.model';
import { BaseRepository } from './base.repository';

export type IncomeEntity = IncomeDoc & {
  _id: Types.ObjectId;
  createdAt?: Date;
};

export class IncomeRepository extends BaseRepository<IncomeDoc> {
  constructor() {
    super(IncomeModel);
  }

  async totalBetween(communityId: string, from: Date, to: Date): Promise<number> {
    const rows = await this.aggregate<{ total: number }>(communityId, [
      { $match: { deletedAt: null, receivedAt: { $gte: from, $lt: to } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return rows[0]?.total ?? 0;
  }
}
