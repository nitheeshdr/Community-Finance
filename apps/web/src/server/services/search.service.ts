import { Types } from 'mongoose';
import { UserRole, type GlobalSearchResultDto } from '@community-finance/shared';
import { DocumentModel } from '../models/document.model';
import { EventModel } from '../models/event.model';
import { ExpenseModel } from '../models/expense.model';
import { PaymentModel } from '../models/payment.model';
import { UserModel } from '../models/user.model';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Global ⌘K search across members, events, expenses, payments, documents. */
export class SearchService {
  async search(communityId: string, query: string): Promise<GlobalSearchResultDto> {
    const cid = new Types.ObjectId(communityId);
    const rx = { $regex: escapeRegex(query), $options: 'i' };
    const LIMIT = 5;

    const [members, events, expenses, payments, documents] = await Promise.all([
      UserModel.find({
        communityId: cid,
        deletedAt: null,
        role: { $ne: UserRole.SUPER_ADMIN },
        $or: [{ name: rx }, { phone: rx }],
      })
        .limit(LIMIT)
        .select('name phone')
        .lean<Array<{ _id: Types.ObjectId; name: string; phone: string }>>(),
      EventModel.find({ communityId: cid, name: rx })
        .limit(LIMIT)
        .select('name date')
        .lean<Array<{ _id: Types.ObjectId; name: string; date: Date }>>(),
      ExpenseModel.find({
        communityId: cid,
        deletedAt: null,
        $or: [{ name: rx }, { vendor: rx }, { category: rx }],
      })
        .limit(LIMIT)
        .select('name amount')
        .lean<Array<{ _id: Types.ObjectId; name: string; amount: number }>>(),
      PaymentModel.find({
        communityId: cid,
        $or: [{ receiptNumber: rx }, { upiReference: rx }],
      })
        .limit(LIMIT)
        .select('receiptNumber amount memberId')
        .populate('memberId', 'name')
        .lean<
          Array<{
            _id: Types.ObjectId;
            receiptNumber?: string;
            amount: number;
            memberId?: { name?: string };
          }>
        >(),
      DocumentModel.find({ communityId: cid, deletedAt: null, name: rx })
        .limit(LIMIT)
        .select('name url')
        .lean<Array<{ _id: Types.ObjectId; name: string; url: string }>>(),
    ]);

    return {
      members: members.map((m) => ({ id: String(m._id), name: m.name, phone: m.phone })),
      events: events.map((e) => ({
        id: String(e._id),
        name: e.name,
        date: e.date.toISOString(),
      })),
      expenses: expenses.map((x) => ({ id: String(x._id), name: x.name, amount: x.amount })),
      payments: payments.map((p) => ({
        id: String(p._id),
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        memberName: p.memberId?.name,
      })),
      documents: documents.map((d) => ({ id: String(d._id), name: d.name, url: d.url })),
    };
  }
}
