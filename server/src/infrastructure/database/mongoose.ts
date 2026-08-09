import mongoose from 'mongoose';
import { describeError, type Logger } from '../../lib/logger.js';

export interface MongoConnectionOptions {
  readonly uri: string;
  readonly dbName?: string | undefined;
  readonly logger: Logger;
}

export interface DatabaseConnection {
  /** Idempotent. Concurrent callers share one in-flight connection attempt. */
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

/*
 * Serverless functions are frozen and thawed between requests, so the connection promise
 * is cached on globalThis. Without this every invocation would open a new pool and Atlas
 * would start refusing connections under even light traffic.
 */
const CACHE_KEY = Symbol.for('serviceside.mongoose.connection');

interface ConnectionCache {
  promise?: Promise<typeof mongoose>;
}

const globalCache = globalThis as typeof globalThis & { [CACHE_KEY]?: ConnectionCache };
const cache: ConnectionCache = (globalCache[CACHE_KEY] ??= {});

export function createMongoConnection(options: MongoConnectionOptions): DatabaseConnection {
  const { uri, dbName, logger } = options;

  return {
    isConnected() {
      return mongoose.connection.readyState === 1;
    },

    async connect() {
      if (mongoose.connection.readyState === 1) return;

      cache.promise ??= mongoose
        .connect(uri, {
          ...(dbName ? { dbName } : {}),
          // Fail fast rather than queueing commands against a database that never arrives.
          bufferCommands: false,
          serverSelectionTimeoutMS: 8_000,
          // A single lead form does not need a large pool, and serverless multiplies pools.
          maxPoolSize: 5,
        })
        .then((instance) => {
          logger.info('database.connected', { database: instance.connection.name });
          return instance;
        })
        .catch((error: unknown) => {
          // Clear the cache so the next request retries instead of reusing a rejected promise.
          cache.promise = undefined;
          logger.error('database.connection_failed', describeError(error));
          throw error;
        });

      await cache.promise;
    },

    async disconnect() {
      cache.promise = undefined;
      await mongoose.disconnect();
      logger.info('database.disconnected');
    },
  };
}
