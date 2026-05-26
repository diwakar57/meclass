import { createLogger } from '@/lib/logger';

const log = createLogger('RedisClient');

// In-memory cache for development/Vercel environment
interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  set(key: string, value: unknown, ttlSeconds = 3600): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Use Redis if available via REDIS_URL, otherwise use in-memory cache
const isRedisAvailable = !!process.env.REDIS_URL;

let redisClient: any = null;
let memoryCache: MemoryCache | null = null;

if (isRedisAvailable) {
  // Lazy load Redis
  try {
    const redis = require('redis');
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          const delay = Math.min(retries * 50, 500);
          return delay;
        },
      },
    });

    redisClient.on('error', (err: Error) => {
      log.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      log.info('Redis connected');
    });

    if (redisClient.connect) {
      redisClient.connect().catch((err: Error) => {
        log.error('Failed to connect to Redis:', err);
        redisClient = null;
      });
    }
  } catch (error) {
    log.warn('Redis not available, using in-memory cache', error);
    memoryCache = new MemoryCache();
  }
} else {
  memoryCache = new MemoryCache();
}

/**
 * Unified cache client for both Redis and in-memory cache
 */
export const cacheClient = {
  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      } else if (memoryCache) {
        memoryCache.set(key, value, ttlSeconds);
      }
    } catch (error) {
      log.error('Cache set error:', error);
    }
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      if (redisClient && redisClient.isOpen) {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else if (memoryCache) {
        return (memoryCache.get(key) as T) || null;
      }
      return null;
    } catch (error) {
      log.error('Cache get error:', error);
      return null;
    }
  },

  async delete(key: string): Promise<void> {
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.del(key);
      } else if (memoryCache) {
        memoryCache.delete(key);
      }
    } catch (error) {
      log.error('Cache delete error:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.flushDb();
      } else if (memoryCache) {
        memoryCache.clear();
      }
    } catch (error) {
      log.error('Cache clear error:', error);
    }
  },

  async mget(...keys: string[]): Promise<(unknown | null)[]> {
    try {
      if (redisClient && redisClient.isOpen) {
        const values = await redisClient.mGet(keys);
        return values.map((v: string | null) => (v ? JSON.parse(v) : null));
      } else if (memoryCache) {
        return keys.map((k) => memoryCache!.get(k));
      }
      return keys.map(() => null);
    } catch (error) {
      log.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  },

  async mset(kvPairs: Array<[string, unknown]>, ttlSeconds = 3600): Promise<void> {
    try {
      if (redisClient && redisClient.isOpen) {
        const pipeline = redisClient.multi();
        for (const [key, value] of kvPairs) {
          pipeline.setEx(key, ttlSeconds, JSON.stringify(value));
        }
        await pipeline.exec();
      } else if (memoryCache) {
        for (const [key, value] of kvPairs) {
          memoryCache.set(key, value, ttlSeconds);
        }
      }
    } catch (error) {
      log.error('Cache mset error:', error);
    }
  },

  isConnected(): boolean {
    return redisClient ? redisClient.isOpen : memoryCache !== null;
  },
};

export default cacheClient;
