import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { PaymentMethod, PaymentStatus, PaymentType } from '@community-finance/shared';

const paymentSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(PaymentType), required: true },
    method: { type: String, enum: Object.values(PaymentMethod), required: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
      default: PaymentStatus.PENDING,
    },
    /** Paise. */
    amount: { type: Number, required: true, min: 0 },
    /** YYYY-MM for subscription payments. */
    period: { type: String },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    receiptNumber: { type: String },
    receiptUrl: { type: String },
    upiReference: { type: String, maxlength: 100 },
    notes: { type: String, maxlength: 500 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, maxlength: 500 },
    razorpayPaymentId: { type: String },
    razorpayOrderId: { type: String },
    /** Razorpay Payment Link (one-time event contribution pay button). */
    razorpayLinkId: { type: String },
    razorpayLinkUrl: { type: String },
    razorpayInvoiceId: { type: String },
    razorpaySubscriptionId: { type: String },
    refundId: { type: String },
    refundReason: { type: String, maxlength: 500 },
    failureReason: { type: String, maxlength: 500 },
    retryCount: { type: Number, default: 0 },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// One subscription payment per member per period (paid/pending only —
// failed attempts may repeat).
paymentSchema.index(
  { communityId: 1, memberId: 1, type: 1, period: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: PaymentType.SUBSCRIPTION,
      status: { $in: [PaymentStatus.PAID, PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
    },
  }
);
paymentSchema.index({ communityId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ communityId: 1, eventId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
paymentSchema.index({ razorpayLinkId: 1 }, { sparse: true });
paymentSchema.index({ communityId: 1, receiptNumber: 1 }, { sparse: true });

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;

export const PaymentModel: Model<PaymentDoc> =
  (models.Payment as Model<PaymentDoc>) ?? model<PaymentDoc>('Payment', paymentSchema);
