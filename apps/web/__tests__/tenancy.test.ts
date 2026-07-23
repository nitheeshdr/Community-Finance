/**
 * Multi-tenancy isolation: BaseRepository must never read or write
 * across community boundaries.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CommunityType,
  UserRole,
  UserStatus,
} from '@community-finance/shared';
import { clearCollections, setupTestDb, teardownTestDb } from './helpers/db';
import { CommunityModel } from '@/server/models/community.model';
import { UserModel } from '@/server/models/user.model';
import { UserRepository } from '@/server/repositories/user.repository';

describe('Tenant isolation (BaseRepository)', () => {
  const repo = new UserRepository();
  let communityA: string;
  let communityB: string;
  let userInA: string;

  beforeAll(async () => {
    await setupTestDb();
    await UserModel.init(); // ensure unique indexes exist before duplicate tests
  });
  afterAll(teardownTestDb);

  beforeEach(async () => {
    await clearCollections();
    const [a, b] = await CommunityModel.create([
      { name: 'Village A', type: CommunityType.VILLAGE },
      { name: 'Village B', type: CommunityType.VILLAGE },
    ]);
    communityA = String(a!._id);
    communityB = String(b!._id);

    const user = await UserModel.create({
      communityId: communityA,
      name: 'Member A',
      phone: '9876500001',
      passwordHash: 'hash',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
    });
    userInA = String(user._id);
  });

  it('findById scoped to another community returns null', async () => {
    expect(await repo.findById(communityA, userInA)).not.toBeNull();
    expect(await repo.findById(communityB, userInA)).toBeNull();
  });

  it('list never leaks documents across tenants', async () => {
    const { items: inA } = await repo.list(communityA, {}, { page: 1, limit: 10 });
    const { items: inB } = await repo.list(communityB, {}, { page: 1, limit: 10 });
    expect(inA).toHaveLength(1);
    expect(inB).toHaveLength(0);
  });

  it('updateById cannot mutate another tenant\'s document', async () => {
    const result = await repo.updateById(communityB, userInA, {
      $set: { name: 'Hacked' },
    });
    expect(result).toBeNull();
    const untouched = await UserModel.findById(userInA);
    expect(untouched!.name).toBe('Member A');
  });

  it('deleteById cannot remove another tenant\'s document', async () => {
    expect(await repo.deleteById(communityB, userInA)).toBe(false);
    expect(await UserModel.findById(userInA)).not.toBeNull();
  });

  it('count and aggregate are tenant-scoped', async () => {
    expect(await repo.count(communityA)).toBe(1);
    expect(await repo.count(communityB)).toBe(0);
    const agg = await repo.aggregate<{ _id: null; n: number }>(communityB, [
      { $group: { _id: null, n: { $sum: 1 } } },
    ]);
    expect(agg).toHaveLength(0);
  });

  it('same phone number is allowed in different communities', async () => {
    await expect(
      UserModel.create({
        communityId: communityB,
        name: 'Member B',
        phone: '9876500001', // same phone, different tenant
        passwordHash: 'hash',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
      })
    ).resolves.toBeTruthy();

    // But duplicates within one community are rejected.
    await expect(
      UserModel.create({
        communityId: communityA,
        name: 'Duplicate',
        phone: '9876500001',
        passwordHash: 'hash',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
      })
    ).rejects.toThrow();
  });
});
