import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer | null = null;

/** Boot an in-memory MongoDB and point the app env at it. */
export async function setupTestDb(): Promise<void> {
  process.env.MONGODB_URI ??= 'set-below';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret';
  process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(64);
  process.env.CRON_SECRET = 'test-cron-secret';
  // NODE_ENV is typed read-only in Next's env typings; set via indexer.
  (process.env as Record<string, string>)['NODE_ENV'] = 'test';

  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
}

export async function teardownTestDb(): Promise<void> {
  await mongoose.disconnect();
  await mongod?.stop();
  mongod = null;
}

export async function clearCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
