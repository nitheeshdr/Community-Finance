import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { AuditAction, AuditEntity, UserRole } from '@community-finance/shared';

/**
 * Append-only audit trail. Update/delete are blocked at the schema level —
 * any attempt throws. Corrections happen by writing new entries.
 */
const auditLogSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true, maxlength: 100 },
    role: { type: String, enum: Object.values(UserRole), required: true },
    action: { type: String, enum: Object.values(AuditAction), required: true },
    entity: { type: String, enum: Object.values(AuditEntity), required: true },
    entityId: { type: Schema.Types.ObjectId },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String, maxlength: 64 },
    device: { type: String, maxlength: 100 },
    browser: { type: String, maxlength: 100 },
    os: { type: String, maxlength: 100 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ communityId: 1, createdAt: -1 });
auditLogSchema.index({ communityId: 1, entity: 1, entityId: 1 });
auditLogSchema.index({ communityId: 1, userId: 1, createdAt: -1 });

const IMMUTABLE_MESSAGE = 'Audit logs are append-only and cannot be modified or deleted';

// Block every mutation path Mongoose exposes.
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
  auditLogSchema.pre(op, function () {
    throw new Error(IMMUTABLE_MESSAGE);
  });
}
auditLogSchema.pre('save', function () {
  if (!this.isNew) throw new Error(IMMUTABLE_MESSAGE);
});

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;

export const AuditLogModel: Model<AuditLogDoc> =
  (models.AuditLog as Model<AuditLogDoc>) ?? model<AuditLogDoc>('AuditLog', auditLogSchema);
