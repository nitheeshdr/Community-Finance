import { Types } from 'mongoose';
import { UserRole, UserStatus } from '@community-finance/shared';
import { UserModel, type UserDoc } from '../models/user.model';
import { BaseRepository } from './base.repository';

export type UserEntity = UserDoc & { _id: Types.ObjectId };

export class UserRepository extends BaseRepository<UserDoc> {
  constructor() {
    super(UserModel);
  }

  /**
   * Login lookup is intentionally cross-tenant: the phone number is the
   * global identifier at the login screen (a user belongs to exactly one
   * community). Password hash and lockout fields are explicitly selected.
   */
  async findForLogin(phone: string): Promise<(UserEntity & { passwordHash: string }) | null> {
    return UserModel.findOne({ phone, deletedAt: null })
      .select('+passwordHash')
      .lean<UserEntity & { passwordHash: string }>();
  }

  async findByIdWithPassword(
    communityId: string,
    id: string
  ): Promise<(UserEntity & { passwordHash: string }) | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return UserModel.findOne({ _id: id, communityId, deletedAt: null })
      .select('+passwordHash')
      .lean<UserEntity & { passwordHash: string }>();
  }

  async phoneExists(communityId: string, phone: string, excludeId?: string): Promise<boolean> {
    return this.exists(communityId, {
      phone,
      deletedAt: null,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
  }

  async countActiveMembers(communityId: string): Promise<number> {
    return this.count(communityId, {
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    });
  }

  async findActiveMemberIds(communityId: string): Promise<Types.ObjectId[]> {
    const rows = await UserModel.find(
      {
        communityId: new Types.ObjectId(communityId),
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      { _id: 1 }
    ).lean<{ _id: Types.ObjectId }[]>();
    return rows.map((r) => r._id);
  }
}
