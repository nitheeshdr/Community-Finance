/** Audit logs must be append-only: no updates, no deletes, ever. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { AuditAction, AuditEntity, UserRole } from '@community-finance/shared';
import { setupTestDb, teardownTestDb } from './helpers/db';
import { AuditLogModel } from '@/server/models/audit-log.model';

describe('AuditLog immutability', () => {
  beforeAll(setupTestDb);
  afterAll(teardownTestDb);

  async function createEntry() {
    return AuditLogModel.create({
      communityId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      userName: 'Tester',
      role: UserRole.ADMIN,
      action: AuditAction.CREATE,
      entity: AuditEntity.USER,
    });
  }

  it('allows inserts', async () => {
    const entry = await createEntry();
    expect(entry._id).toBeTruthy();
  });

  it('blocks updateOne / updateMany / findOneAndUpdate', async () => {
    const entry = await createEntry();
    await expect(
      AuditLogModel.updateOne({ _id: entry._id }, { userName: 'Tampered' }).exec()
    ).rejects.toThrow(/append-only/);
    await expect(
      AuditLogModel.updateMany({}, { userName: 'Tampered' }).exec()
    ).rejects.toThrow(/append-only/);
    await expect(
      AuditLogModel.findOneAndUpdate({ _id: entry._id }, { userName: 'Tampered' }).exec()
    ).rejects.toThrow(/append-only/);
  });

  it('blocks deleteOne / deleteMany / findOneAndDelete', async () => {
    const entry = await createEntry();
    await expect(AuditLogModel.deleteOne({ _id: entry._id }).exec()).rejects.toThrow(/append-only/);
    await expect(AuditLogModel.deleteMany({}).exec()).rejects.toThrow(/append-only/);
    await expect(
      AuditLogModel.findOneAndDelete({ _id: entry._id }).exec()
    ).rejects.toThrow(/append-only/);
  });

  it('blocks re-saving an existing document', async () => {
    const entry = await createEntry();
    entry.userName = 'Tampered';
    await expect(entry.save()).rejects.toThrow(/append-only/);
  });
});
