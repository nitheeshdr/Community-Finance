import { Types } from 'mongoose';
import { FeeConfigModel, type FeeConfigDoc } from '../models/fee-config.model';
import { BaseRepository } from './base.repository';

export type FeeConfigEntity = FeeConfigDoc & { _id: Types.ObjectId; createdAt?: Date };

export class FeeConfigRepository extends BaseRepository<FeeConfigDoc> {
  constructor() {
    super(FeeConfigModel);
  }

  /** The config in force right now (latest effectiveFrom ≤ now). */
  async findActive(communityId: string): Promise<FeeConfigEntity | null> {
    return FeeConfigModel.findOne({
      communityId: new Types.ObjectId(communityId),
      effectiveFrom: { $lte: new Date() },
    })
      .sort({ effectiveFrom: -1 })
      .lean<FeeConfigEntity>();
  }

  async history(communityId: string): Promise<FeeConfigEntity[]> {
    return FeeConfigModel.find({ communityId: new Types.ObjectId(communityId) })
      .sort({ effectiveFrom: -1 })
      .lean<FeeConfigEntity[]>();
  }
}
