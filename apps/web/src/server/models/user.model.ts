import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { UserRole, UserStatus } from '@community-finance/shared';

const familyMemberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    relation: { type: String, required: true, trim: true, maxlength: 50 },
    age: { type: Number, min: 0, max: 120 },
  },
  { _id: false }
);

/**
 * Single user collection for all roles. Members ARE users — the spec's
 * "member management" operates on role=MEMBER documents.
 */
const userSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.MEMBER,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      required: true,
      default: UserStatus.ACTIVE,
    },
    address: { type: String, maxlength: 500 },
    /** Household/family group name — members sharing it are grouped. */
    familyGroup: { type: String, maxlength: 100, trim: true },
    family: { type: [familyMemberSchema], default: [] },
    profileImage: { type: String },
    /** AES-256-GCM encrypted; never returned by default. */
    aadhaarEncrypted: { type: String, select: false },
    aadhaarMasked: { type: String },
    memberSince: { type: Date, default: () => new Date() },
    mustChangePassword: { type: Boolean, default: true },
    /** Failed-login lockout. */
    lockedUntil: { type: Date },
    statusReason: { type: String, maxlength: 500 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Phone unique per community (soft-deleted users excluded via partial filter).
userSchema.index(
  { communityId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
userSchema.index({ communityId: 1, status: 1, role: 1 });
userSchema.index({ communityId: 1, familyGroup: 1 });
userSchema.index({ communityId: 1, name: 'text' });

export type UserDoc = InferSchemaType<typeof userSchema>;

export const UserModel: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>('User', userSchema);
