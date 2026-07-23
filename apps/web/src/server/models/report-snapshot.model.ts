import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Immutable month-end financial snapshot. Once a period is closed the
 * snapshot is the authoritative record; live recalculation applies only
 * to open periods. Mutations are blocked like audit logs.
 */
const reportSnapshotSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    /** YYYY-MM */
    period: { type: String, required: true },
    totals: {
      income: { type: Number, required: true },
      expenses: { type: Number, required: true },
      openingBalance: { type: Number, required: true },
      closingBalance: { type: Number, required: true },
      collectionExpected: { type: Number, required: true },
      collectionReceived: { type: Number, required: true },
      collectionPending: { type: Number, required: true },
      paidCount: { type: Number, required: true },
      pendingCount: { type: Number, required: true },
      failedCount: { type: Number, required: true },
      donationTotal: { type: Number, required: true },
      donationCount: { type: Number, required: true },
    },
    incomeBySource: [{ category: String, amount: Number, count: Number, _id: false }],
    expensesByCategory: [{ category: String, amount: Number, count: Number, _id: false }],
    memberStats: {
      total: Number,
      active: Number,
      inactive: Number,
      suspended: Number,
    },
    eventStats: {
      total: Number,
      active: Number,
      closed: Number,
      totalBudget: Number,
    },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    closedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

reportSnapshotSchema.index({ communityId: 1, period: 1 }, { unique: true });

const IMMUTABLE_MESSAGE = 'Closed period snapshots are immutable';
for (const op of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const) {
  reportSnapshotSchema.pre(op, function () {
    throw new Error(IMMUTABLE_MESSAGE);
  });
}
reportSnapshotSchema.pre('save', function () {
  if (!this.isNew) throw new Error(IMMUTABLE_MESSAGE);
});

export type ReportSnapshotDoc = InferSchemaType<typeof reportSnapshotSchema>;

export const ReportSnapshotModel: Model<ReportSnapshotDoc> =
  (models.ReportSnapshot as Model<ReportSnapshotDoc>) ??
  model<ReportSnapshotDoc>('ReportSnapshot', reportSnapshotSchema);
