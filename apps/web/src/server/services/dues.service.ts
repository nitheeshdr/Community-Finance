import { Types } from 'mongoose';
import {
  PaymentStatus,
  PaymentType,
  UserRole,
  UserStatus,
} from '@community-finance/shared';
import { PaymentModel } from '../models/payment.model';
import { UserModel } from '../models/user.model';
import type { FeeConfigRepository } from '../repositories/fee-config.repository';

export interface MemberDueDto {
  memberId: string;
  name: string;
  phone: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'UNPAID';
  amount: number; // paise (the fee for the period)
}

export interface PeriodDuesDto {
  period: string;
  fee: number; // paise
  total: number;
  paid: number;
  unpaid: number;
  members: MemberDueDto[]; // unpaid-first
}

export interface MemberLedgerEntryDto {
  period: string; // YYYY-MM
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'UNPAID';
  amount: number; // paise
  paidAt?: string;
  method?: string;
  receiptNumber?: string;
}

export interface MemberLedgerDto {
  memberId: string;
  name: string;
  phone: string;
  memberSince: string;
  totalPaid: number;
  paidMonths: number;
  unpaidMonths: number;
  entries: MemberLedgerEntryDto[]; // newest first
}

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Enumerate YYYY-MM keys from `start` up to and including `end` month. */
function monthsBetween(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    keys.push(ymKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

/**
 * Subscription-dues views: who hasn't paid for a given month, and a
 * per-member month-by-month paid/unpaid ledger.
 */
export class DuesService {
  constructor(private readonly feeConfigs: FeeConfigRepository) {}

  /** Members and their subscription status for one month (unpaid first). */
  async duesForPeriod(communityId: string, period: string): Promise<PeriodDuesDto> {
    const cid = new Types.ObjectId(communityId);
    const fee = (await this.feeConfigs.findActive(communityId))?.amount ?? 0;

    const members = await UserModel.find({
      communityId: cid,
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    })
      .select('name phone')
      .sort({ name: 1 })
      .lean<Array<{ _id: Types.ObjectId; name: string; phone: string }>>();

    const payments = await PaymentModel.find({
      communityId: cid,
      type: PaymentType.SUBSCRIPTION,
      period,
    })
      .select('memberId status amount')
      .lean<Array<{ memberId: Types.ObjectId; status: string; amount: number }>>();
    const byMember = new Map(payments.map((p) => [String(p.memberId), p]));

    const rows: MemberDueDto[] = members.map((m) => {
      const p = byMember.get(String(m._id));
      const status = (p?.status as MemberDueDto['status']) ?? 'UNPAID';
      return {
        memberId: String(m._id),
        name: m.name,
        phone: m.phone,
        status: status === PaymentStatus.PAID ? 'PAID' : status,
        amount: p?.amount ?? fee,
      };
    });

    // Unpaid first, then by name.
    rows.sort((a, b) => {
      const ap = a.status === 'PAID' ? 1 : 0;
      const bp = b.status === 'PAID' ? 1 : 0;
      return ap - bp || a.name.localeCompare(b.name);
    });

    const paid = rows.filter((r) => r.status === 'PAID').length;
    return {
      period,
      fee,
      total: rows.length,
      paid,
      unpaid: rows.length - paid,
      members: rows,
    };
  }

  /** A member's month-by-month subscription status since they joined. */
  async memberLedger(communityId: string, memberId: string, monthsBack = 24): Promise<MemberLedgerDto> {
    const cid = new Types.ObjectId(communityId);
    const member = await UserModel.findOne({ _id: memberId, communityId: cid })
      .select('name phone memberSince')
      .lean<{ _id: Types.ObjectId; name: string; phone: string; memberSince?: Date }>();
    if (!member) {
      return {
        memberId,
        name: '',
        phone: '',
        memberSince: '',
        totalPaid: 0,
        paidMonths: 0,
        unpaidMonths: 0,
        entries: [],
      };
    }

    const now = new Date();
    const earliest = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    const start =
      member.memberSince && member.memberSince > earliest
        ? new Date(member.memberSince.getFullYear(), member.memberSince.getMonth(), 1)
        : earliest;
    const periods = monthsBetween(start, now);

    const payments = await PaymentModel.find({
      communityId: cid,
      memberId: new Types.ObjectId(memberId),
      type: PaymentType.SUBSCRIPTION,
      period: { $in: periods },
    })
      .select('period status amount paidAt method receiptNumber')
      .lean<
        Array<{
          period?: string;
          status: string;
          amount: number;
          paidAt?: Date;
          method?: string;
          receiptNumber?: string;
        }>
      >();
    const byPeriod = new Map(payments.filter((p) => p.period).map((p) => [p.period!, p]));

    const fee = (await this.feeConfigs.findActive(communityId))?.amount ?? 0;
    let totalPaid = 0;
    let paidMonths = 0;

    const entries: MemberLedgerEntryDto[] = periods
      .slice()
      .reverse()
      .map((period) => {
        const p = byPeriod.get(period);
        const status = (p?.status as MemberLedgerEntryDto['status']) ?? 'UNPAID';
        if (status === PaymentStatus.PAID) {
          paidMonths++;
          totalPaid += p?.amount ?? 0;
        }
        return {
          period,
          status: status === PaymentStatus.PAID ? 'PAID' : status,
          amount: p?.amount ?? fee,
          paidAt: p?.paidAt?.toISOString(),
          method: p?.method,
          receiptNumber: p?.receiptNumber,
        };
      });

    return {
      memberId,
      name: member.name,
      phone: member.phone,
      memberSince: member.memberSince?.toISOString() ?? '',
      totalPaid,
      paidMonths,
      unpaidMonths: entries.length - paidMonths,
      entries,
    };
  }
}
