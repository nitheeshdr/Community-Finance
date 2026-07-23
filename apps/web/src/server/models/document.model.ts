import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { DocumentType } from '@community-finance/shared';

const documentSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    type: { type: String, enum: Object.values(DocumentType), required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    cloudinaryId: { type: String, required: true, maxlength: 300 },
    url: { type: String, required: true },
    mimeType: { type: String, required: true, maxlength: 100 },
    sizeBytes: { type: Number, required: true, min: 0 },
    /** Optional back-reference: which entity this file belongs to. */
    entity: { type: String, maxlength: 50 },
    entityId: { type: Schema.Types.ObjectId },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

documentSchema.index({ communityId: 1, type: 1, createdAt: -1 });
documentSchema.index({ communityId: 1, entity: 1, entityId: 1 });
documentSchema.index({ communityId: 1, name: 'text' });

export type DocumentDoc = InferSchemaType<typeof documentSchema>;

export const DocumentModel: Model<DocumentDoc> =
  (models.Document as Model<DocumentDoc>) ?? model<DocumentDoc>('Document', documentSchema);
