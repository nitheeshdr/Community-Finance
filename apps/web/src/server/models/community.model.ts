import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { CommunityStatus, CommunityType } from '@community-finance/shared';

const communitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    type: {
      type: String,
      enum: Object.values(CommunityType),
      required: true,
      default: CommunityType.VILLAGE,
    },
    status: {
      type: String,
      enum: Object.values(CommunityStatus),
      required: true,
      default: CommunityStatus.ACTIVE,
      index: true,
    },
    description: { type: String, maxlength: 1000 },
    address: { type: String, maxlength: 500 },
    logo: { type: String },
  },
  { timestamps: true }
);

communitySchema.index({ name: 1 }, { unique: true });

export type CommunityDoc = InferSchemaType<typeof communitySchema>;

export const CommunityModel: Model<CommunityDoc> =
  (models.Community as Model<CommunityDoc>) ?? model<CommunityDoc>('Community', communitySchema);
