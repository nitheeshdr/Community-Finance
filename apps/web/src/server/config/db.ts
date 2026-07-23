import mongoose from 'mongoose';
import { getEnv } from './env';
import { logger } from '../lib/logger';

/**
 * Serverless-safe Mongoose connection.
 * Vercel functions share module scope across warm invocations but may run
 * many cold starts in parallel — cache the connection promise globally so
 * concurrent requests reuse a single connection pool.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = global as typeof globalThis & {
  __mongoose?: MongooseCache;
};

const cache: MongooseCache = globalWithMongoose.__mongoose ?? {
  conn: null,
  promise: null,
};
globalWithMongoose.__mongoose = cache;

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const env = getEnv();
    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
      })
      .then((m) => {
        logger.info('MongoDB connected');
        return m;
      })
      .catch((err) => {
        cache.promise = null; // allow retry on next request
        logger.error({ err }, 'MongoDB connection failed');
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDb(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}
