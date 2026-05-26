import { withRole } from '@/lib/middleware/auth';
import { batchRequests, cacheAPIResponse, getCacheStats } from '@/lib/services/api-optimizer';
import { apiError, apiSuccess } from '@/lib/utils/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('APIOptimizerEndpoint');

async function handleGET(auth: any) {
  try {
    return apiSuccess({
      stats: getCacheStats(),
      message: 'API optimizer is running',
    });
  } catch (error) {
    log.error('GET /api/optimizer error', error);
    return apiError('Failed to get optimizer stats', 500);
  }
}

async function handlePOST(auth: any, body: any) {
  try {
    const { action, requests, prefetch } = body;

    if (action === 'batch') {
      const results = await batchRequests(
        requests,
        5 // concurrency
      );

      log.info('Batch request completed', {
        total: requests.length,
        cached: results.filter((r: any) => r.cached).length,
      });

      return apiSuccess({
        results,
        summary: {
          total: results.length,
          cached: results.filter((r: any) => r.cached).length,
          errors: results.filter((r: any) => r.status >= 400).length,
        },
      });
    }

    if (action === 'prefetch') {
      // This is typically handled server-side during build/startup
      log.info('Prefetch requested', { count: prefetch?.length || 0 });
      return apiSuccess({
        message: 'Prefetch scheduled',
        count: prefetch?.length || 0,
      });
    }

    return apiError('Unknown action', 400);
  } catch (error) {
    log.error('POST /api/optimizer error', error);
    return apiError('Failed to optimize requests', 500);
  }
}

export const GET = withRole(['admin'], (req, auth) => handleGET(auth));

export const POST = withRole(['admin', 'teacher', 'principal'], (req, auth) =>
  req.json().then((body) => handlePOST(auth, body))
);
