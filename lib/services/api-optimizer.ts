import { cacheClient } from '@/lib/cache/redis-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('APIOptimizer');

interface BatchRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, unknown>;
  cacheKey?: string;
  cacheTTL?: number;
}

interface BatchResponse {
  endpoint: string;
  data: unknown;
  status: number;
  cached: boolean;
}

/**
 * Request deduplication cache
 * Prevents multiple identical requests within a short timeframe
 */
const requestCache = new Map<string, { promise: Promise<unknown>; timestamp: number }>();
const DEDUP_WINDOW = 1000; // 1 second

/**
 * Generate cache key from request
 */
function generateCacheKey(endpoint: string, method: string, params?: Record<string, unknown>): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `api:${method}:${endpoint}:${paramStr}`;
}

/**
 * Deduplicate identical requests within a time window
 */
export async function withRequestDedup<T>(
  endpoint: string,
  method: string,
  fetcher: () => Promise<T>,
  params?: Record<string, unknown>
): Promise<T> {
  const cacheKey = generateCacheKey(endpoint, method, params);
  const cached = requestCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < DEDUP_WINDOW) {
    log.debug('Using deduplicated request', { endpoint, method });
    return cached.promise as Promise<T>;
  }

  const promise = fetcher();
  requestCache.set(cacheKey, { promise, timestamp: Date.now() });

  // Clean up old entries
  if (requestCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
      if (now - value.timestamp > DEDUP_WINDOW) {
        requestCache.delete(key);
      }
    }
  }

  return promise;
}

/**
 * Batch multiple API requests and cache results
 * Reduces individual API calls and network overhead
 */
export async function batchRequests(
  requests: BatchRequest[],
  concurrency = 5
): Promise<BatchResponse[]> {
  const results: BatchResponse[] = [];

  // Check cache for each request first
  const uncachedRequests = [];
  for (const req of requests) {
    if (req.cacheKey) {
      const cached = await cacheClient.get(req.cacheKey);
      if (cached) {
        results.push({
          endpoint: req.endpoint,
          data: cached,
          status: 200,
          cached: true,
        });
        continue;
      }
    }
    uncachedRequests.push(req);
  }

  // Process uncached requests with concurrency control
  for (let i = 0; i < uncachedRequests.length; i += concurrency) {
    const batch = uncachedRequests.slice(i, i + concurrency);
    const promises = batch.map((req) => executeRequest(req));
    const batchResults = await Promise.allSettled(promises);

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const request = batch[j];

      if (result.status === 'fulfilled') {
        results.push(result.value);

        // Cache if cacheKey provided
        if (request.cacheKey) {
          const ttl = request.cacheTTL || 3600;
          await cacheClient.set(request.cacheKey, result.value.data, ttl);
        }
      } else {
        results.push({
          endpoint: request.endpoint,
          data: null,
          status: 500,
          cached: false,
        });
        log.error('Batch request failed', { endpoint: request.endpoint, error: result.reason });
      }
    }
  }

  log.info('Batch requests completed', {
    total: requests.length,
    cached: results.filter((r) => r.cached).length,
    uncached: results.filter((r) => !r.cached).length,
  });

  return results;
}

/**
 * Execute a single request
 */
async function executeRequest(request: BatchRequest): Promise<BatchResponse> {
  try {
    const response = await fetch(request.endpoint, {
      method: request.method,
      headers: { 'Content-Type': 'application/json' },
      body: request.method !== 'GET' ? JSON.stringify(request.params) : undefined,
    });

    const data = await response.json();
    return {
      endpoint: request.endpoint,
      data,
      status: response.status,
      cached: false,
    };
  } catch (error) {
    log.error('Request execution failed', { endpoint: request.endpoint, error });
    throw error;
  }
}

/**
 * Prefetch and cache data for known future requests
 * Useful for eagerly loading data that will be needed
 */
export async function prefetchData(
  endpoints: Array<{ url: string; cacheKey: string; ttl?: number }>
): Promise<void> {
  const requests = endpoints.map((ep) => ({
    endpoint: ep.url,
    method: 'GET' as const,
    cacheKey: ep.cacheKey,
    cacheTTL: ep.ttl || 3600,
  }));

  await batchRequests(requests, 3);
  log.info('Prefetch completed', { count: endpoints.length });
}

/**
 * Cache API response with automatic invalidation
 */
export async function cacheAPIResponse<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  // Try cache first
  const cached = await cacheClient.get<T>(key);
  if (cached) {
    log.debug('API response from cache', { key });
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  await cacheClient.set(key, data, ttlSeconds);
  log.debug('API response cached', { key, ttl: ttlSeconds });

  return data;
}

/**
 * Invalidate specific API cache
 */
export async function invalidateAPICache(pattern: string): Promise<void> {
  // Pattern matching would be implemented at the cache layer
  log.info('Cache invalidation requested', { pattern });
  // Implementation depends on Redis pattern matching
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats() {
  return {
    dedupCacheSize: requestCache.size,
    isConnected: cacheClient.isConnected(),
  };
}
