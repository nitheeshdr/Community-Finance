import { randomInt } from 'node:crypto';
import { Types } from 'mongoose';
import {
  AuditAction,
  AuditEntity,
  UserRole,
  UserStatus,
  type BulkImportResultRow,
  type BulkMemberRow,
  type ChangeMemberStatusInput,
  type CreateMemberInput,
  type MemberDto,
  type MemberListQuery,
  type UpdateMemberInput,
} from '@community-finance/shared';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../errors/app-error';
import { encryptField, maskAadhaar } from '../lib/crypto';
import { hashPassword } from '../lib/password';
import type { UserEntity, UserRepository } from '../repositories/user.repository';
import type { ListResult } from '../repositories/base.repository';
import type { AuditService } from './audit.service';

/**
 * Invoked whenever the set of ACTIVE members changes (add/remove/suspend/
 * activate). BudgetSplitService registers here so every open event's
 * per-head split recalculates automatically — the core business rule.
 */
export type ActiveMembershipChangeHook = (
  communityId: string,
  trigger: string
) => Promise<void>;

export class MemberService {
  private membershipHooks: ActiveMembershipChangeHook[] = [];

  constructor(
    private readonly users: UserRepository,
    private readonly audit: AuditService
  ) {}

  onActiveMembershipChange(hook: ActiveMembershipChangeHook): void {
    this.membershipHooks.push(hook);
  }

  private async fireMembershipChange(communityId: string, trigger: string): Promise<void> {
    for (const hook of this.membershipHooks) {
      await hook(communityId, trigger);
    }
  }

  async list(communityId: string, query: MemberListQuery): Promise<ListResult<MemberDto>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.role) filter.role = query.role;
    else filter.role = { $in: [UserRole.MEMBER, UserRole.ADMIN] };
    if (query.familyGroup) filter.familyGroup = query.familyGroup;
    if (query.search) {
      filter.$or = [
        { name: { $regex: escapeRegex(query.search), $options: 'i' } },
        { phone: { $regex: `^${escapeRegex(query.search)}` } },
      ];
    }
    const { items, total } = await this.users.list(communityId, filter, {
      page: query.page,
      limit: query.limit,
      sort: query.sortBy
        ? { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 }
        : { createdAt: -1 },
    });
    return { items: (items as UserEntity[]).map(toMemberDto), total };
  }

  async getById(communityId: string, id: string): Promise<MemberDto> {
    const user = (await this.users.findById(communityId, id)) as UserEntity | null;
    if (!user || user.deletedAt) throw new NotFoundError('Member');
    return toMemberDto(user);
  }

  async create(
    communityId: string,
    input: CreateMemberInput,
    actorRole: UserRole
  ): Promise<MemberDto> {
    // Only super admins may create admins.
    if (input.role === UserRole.ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only the super admin can create admins');
    }
    if (await this.users.phoneExists(communityId, input.phone)) {
      throw new ConflictError('A member with this phone number already exists');
    }

    const created = (await this.users.create(communityId, {
      name: input.name,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      status: UserStatus.ACTIVE,
      address: input.address,
      familyGroup: input.familyGroup,
      family: input.family,
      profileImage: input.profileImage,
      memberSince: input.memberSince ?? new Date(),
      mustChangePassword: true,
      ...(input.aadhaar
        ? {
            aadhaarEncrypted: encryptField(input.aadhaar),
            aadhaarMasked: maskAadhaar(input.aadhaar),
          }
        : {}),
    } as never)) as UserEntity;

    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.USER,
      entityId: String(created._id),
      after: { name: created.name, phone: created.phone, role: created.role },
    });
    await this.fireMembershipChange(communityId, `Member added: ${created.name}`);
    return toMemberDto(created);
  }

  /**
   * CSV bulk import. Row-by-row validation with per-row outcomes;
   * passwords are auto-generated when omitted and returned ONCE in the
   * result so the admin can distribute them. The budget split recalcs
   * a single time at the end, not per member.
   */
  async bulkCreate(
    communityId: string,
    rows: BulkMemberRow[],
    actorId: string
  ): Promise<BulkImportResultRow[]> {
    const results: BulkImportResultRow[] = [];
    const seenPhones = new Set<string>();
    let created = 0;

    for (const [index, row] of rows.entries()) {
      const base = { row: index + 1, name: row.name, phone: row.phone };
      try {
        if (seenPhones.has(row.phone)) {
          throw new ConflictError('Duplicate phone number within the file');
        }
        seenPhones.add(row.phone);
        if (await this.users.phoneExists(communityId, row.phone)) {
          throw new ConflictError('A member with this phone number already exists');
        }

        const generated = row.password ? undefined : generatePassword();
        const password = row.password ?? generated!;

        await this.users.create(communityId, {
          name: row.name,
          phone: row.phone,
          passwordHash: await hashPassword(password),
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          address: row.address,
          family: [],
          memberSince: row.memberSince ?? new Date(),
          mustChangePassword: true,
          ...(row.aadhaar
            ? {
                aadhaarEncrypted: encryptField(row.aadhaar),
                aadhaarMasked: maskAadhaar(row.aadhaar),
              }
            : {}),
        } as never);

        created++;
        results.push({ ...base, status: 'CREATED', password: generated });
      } catch (err) {
        results.push({
          ...base,
          status: 'FAILED',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    if (created > 0) {
      await this.fireMembershipChange(
        communityId,
        `Bulk import: ${created} member${created === 1 ? '' : 's'} added`
      );
      await this.audit.record({
        action: AuditAction.CREATE,
        entity: AuditEntity.USER,
        after: {
          bulkImport: true,
          created,
          failed: results.length - created,
          importedBy: actorId,
        },
      });
    }
    return results;
  }

  async update(
    communityId: string,
    id: string,
    input: UpdateMemberInput,
    actorRole: UserRole
  ): Promise<MemberDto> {
    const existing = (await this.users.findById(communityId, id)) as UserEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Member');
    if (existing.role === UserRole.SUPER_ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError();
    }
    if (input.role && input.role !== existing.role && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only the super admin can change roles');
    }
    if (input.phone && (await this.users.phoneExists(communityId, input.phone, id))) {
      throw new ConflictError('A member with this phone number already exists');
    }

    const { aadhaar, ...rest } = input;
    const update: Record<string, unknown> = { ...rest };
    if (aadhaar) {
      update.aadhaarEncrypted = encryptField(aadhaar);
      update.aadhaarMasked = maskAadhaar(aadhaar);
    }

    const updated = (await this.users.updateById(communityId, id, {
      $set: update,
    })) as UserEntity | null;
    if (!updated) throw new NotFoundError('Member');

    await this.audit.record({
      action: input.role && input.role !== existing.role ? AuditAction.ROLE_CHANGED : AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: id,
      before: diffFields(existing, update),
      after: update,
    });
    return toMemberDto(updated);
  }

  async changeStatus(
    communityId: string,
    id: string,
    input: ChangeMemberStatusInput,
    actorId: string,
    actorRole: UserRole
  ): Promise<MemberDto> {
    if (id === actorId) {
      throw new BusinessRuleError('You cannot change your own status');
    }
    const existing = (await this.users.findById(communityId, id)) as UserEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Member');
    if (existing.role !== UserRole.MEMBER && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only the super admin can suspend admins');
    }
    if (existing.status === input.status) return toMemberDto(existing);

    const updated = (await this.users.updateById(communityId, id, {
      $set: { status: input.status, statusReason: input.reason },
    })) as UserEntity;

    const action =
      input.status === UserStatus.SUSPENDED
        ? AuditAction.SUSPEND
        : input.status === UserStatus.ACTIVE
          ? AuditAction.ACTIVATE
          : AuditAction.UPDATE;
    await this.audit.record({
      action,
      entity: AuditEntity.USER,
      entityId: id,
      before: { status: existing.status },
      after: { status: input.status, reason: input.reason },
    });

    // Active-member pool changed in either direction ⇒ recalc event splits.
    if (existing.role === UserRole.MEMBER) {
      const verb = input.status === UserStatus.ACTIVE ? 'activated' : input.status.toLowerCase();
      await this.fireMembershipChange(communityId, `Member ${verb}: ${existing.name}`);
    }
    return toMemberDto(updated);
  }

  /** Soft delete — payment history must survive for financial records. */
  async remove(communityId: string, id: string, actorId: string, actorRole: UserRole): Promise<void> {
    if (id === actorId) throw new BusinessRuleError('You cannot delete yourself');
    const existing = (await this.users.findById(communityId, id)) as UserEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Member');
    if (existing.role !== UserRole.MEMBER && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only the super admin can delete admins');
    }

    await this.users.updateById(communityId, id, {
      $set: { deletedAt: new Date(), status: UserStatus.INACTIVE },
    });
    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.USER,
      entityId: id,
      before: { name: existing.name, phone: existing.phone, status: existing.status },
    });
    if (existing.role === UserRole.MEMBER) {
      await this.fireMembershipChange(communityId, `Member removed: ${existing.name}`);
    }
  }

  /** Admin password reset for a member (no SMS/OTP flow). */
  async resetPassword(
    communityId: string,
    id: string,
    newPassword: string,
    actorRole: UserRole
  ): Promise<void> {
    const existing = (await this.users.findById(communityId, id)) as UserEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Member');
    if (existing.role !== UserRole.MEMBER && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only the super admin can reset admin passwords');
    }
    await this.users.updateById(communityId, id, {
      $set: { passwordHash: await hashPassword(newPassword), mustChangePassword: true },
    });
    await this.audit.record({
      action: AuditAction.PASSWORD_RESET,
      entity: AuditEntity.USER,
      entityId: id,
    });
  }
}

/* ------------------------------------------------------------------ */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Readable one-time password: no ambiguous glyphs, letter+digit guaranteed. */
function generatePassword(): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  let pw = letters[randomInt(letters.length)]! + digits[randomInt(digits.length)]!;
  for (let i = 0; i < 8; i++) pw += all[randomInt(all.length)]!;
  return pw;
}

function diffFields(existing: UserEntity, update: Record<string, unknown>): Record<string, unknown> {
  const before: Record<string, unknown> = {};
  for (const key of Object.keys(update)) {
    if (key in existing) before[key] = (existing as unknown as Record<string, unknown>)[key];
  }
  return before;
}

export function toMemberDto(user: UserEntity): MemberDto {
  const u = user as UserEntity & { createdAt?: Date; updatedAt?: Date; _id: Types.ObjectId };
  return {
    id: String(u._id),
    communityId: String(u.communityId),
    name: u.name,
    phone: u.phone,
    role: u.role as MemberDto['role'],
    status: u.status as MemberDto['status'],
    address: u.address ?? undefined,
    familyGroup: u.familyGroup ?? undefined,
    family: (u.family ?? []).map((f) => ({
      name: f.name,
      relation: f.relation,
      age: f.age ?? undefined,
    })),
    profileImage: u.profileImage ?? undefined,
    aadhaarMasked: u.aadhaarMasked ?? undefined,
    memberSince: u.memberSince?.toISOString() ?? '',
    createdAt: u.createdAt?.toISOString() ?? '',
    updatedAt: u.updatedAt?.toISOString() ?? '',
  };
}
