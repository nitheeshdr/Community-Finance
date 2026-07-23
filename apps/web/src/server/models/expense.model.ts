import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ExpenseStatus, PaymentMethod } from '@community-finance/shared';

const expenseSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    /** Business rule: every expense belongs to an event. */
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, maxlength: 100 },
    /** Paise. */
    amount: { type: Number, required: true, min: 0 },
    vendor: { type: String, maxlength: 150 },
    description: { type: String, maxlength: 2000 },
    paymentMode: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CASH,
    },
    status: {
      type: String,
      enum: Object.values(ExpenseStatus),
      required: true,
      default: ExpenseStatus.PENDING,
    },
    /** Cloudinary URLs. */
    bills: { type: [String], default: [] },
    expenseDate: { type: Date, default: () => new Date() },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ communityId: 1, eventId: 1, status: 1 });
expenseSchema.index({ communityId: 1, category: 1 });
expenseSchema.index({ communityId: 1, expenseDate: -1 });
expenseSchema.index({ communityId: 1, name: 'text', vendor: 'text' });

export type ExpenseDoc = InferSchemaType<typeof expenseSchema>;

export const ExpenseModel: Model<ExpenseDoc> =
  (models.Expense as Model<ExpenseDoc>) ?? model<ExpenseDoc>('Expense', expenseSchema);
