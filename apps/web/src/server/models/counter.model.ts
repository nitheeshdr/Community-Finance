import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Atomic per-community counters (receipt numbers, etc.).
 * `findOneAndUpdate` with `$inc` is atomic in MongoDB — safe under
 * concurrent webhook + admin traffic.
 */
const counterSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    value: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

counterSchema.index({ communityId: 1, name: 1 }, { unique: true });

export type CounterDoc = InferSchemaType<typeof counterSchema>;

export const CounterModel: Model<CounterDoc> =
  (models.Counter as Model<CounterDoc>) ?? model<CounterDoc>('Counter', counterSchema);

export async function nextCounter(communityId: string, name: string): Promise<number> {
  const doc = await CounterModel.findOneAndUpdate(
    { communityId, name },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  ).lean();
  return doc.value;
}
