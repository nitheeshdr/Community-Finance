import { Types } from 'mongoose';
import {
  RefreshTokenModel,
  type RefreshTokenDoc,
} from '../models/refresh-token.model';

export type RefreshTokenEntity = RefreshTokenDoc & { _id: Types.ObjectId };

/**
 * Refresh-token persistence. Not tenant-scoped through BaseRepository
 * because token verification happens before tenant context exists.
 */
export class RefreshTokenRepository {
  async create(data: Partial<RefreshTokenDoc>): Promise<RefreshTokenEntity> {
    const doc = await RefreshTokenModel.create(data);
    return doc.toObject() as RefreshTokenEntity;
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return RefreshTokenModel.findOne({ tokenHash }).lean<RefreshTokenEntity>();
  }

  async markUsed(id: Types.ObjectId): Promise<void> {
    await RefreshTokenModel.updateOne({ _id: id }, { usedAt: new Date(), lastUsedAt: new Date() });
  }

  async revokeFamily(family: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { family, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const res = await RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() }
    );
    return res.modifiedCount;
  }

  /** Live sessions = newest unrevoked, unexpired token per family. */
  async listActiveSessions(userId: string): Promise<RefreshTokenEntity[]> {
    return RefreshTokenModel.find({
      userId,
      revokedAt: null,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastUsedAt: -1 })
      .lean<RefreshTokenEntity[]>();
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(sessionId)) return false;
    const doc = await RefreshTokenModel.findOne({ _id: sessionId, userId });
    if (!doc) return false;
    await RefreshTokenModel.updateMany(
      { family: doc.family, revokedAt: null },
      { revokedAt: new Date() }
    );
    return true;
  }
}
