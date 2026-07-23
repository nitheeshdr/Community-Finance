import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * One document per issued refresh token. Tokens rotate on every refresh:
 * the old doc is marked used and a new one is created in the same `family`.
 * Reuse of a used token ⇒ the family is compromised ⇒ revoke the family.
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    /** sha256 of the JWT — raw token never stored. */
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    jti: { type: String, required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    deviceInfo: {
      ip: String,
      userAgent: String,
      device: String,
      browser: String,
      os: String,
    },
    lastUsedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// TTL cleanup once expired.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema>;

export const RefreshTokenModel: Model<RefreshTokenDoc> =
  (models.RefreshToken as Model<RefreshTokenDoc>) ??
  model<RefreshTokenDoc>('RefreshToken', refreshTokenSchema);
