import { withRole } from '@/lib/middleware/auth';
import { getOrCreateVideoGeneratorConfig, cacheGeneratedVideo, getCachedGeneratedVideo, linkStudentToVideo } from '@/lib/services/video-generator-cache';
import { apiError, apiSuccess } from '@/lib/utils/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('VideoGeneratorAPI');

async function handleGET(req: Request, auth: any) {
  try {
    const url = new URL(req.url);
    const paceMultiplier = url.searchParams.get('pace');
    const topicId = url.searchParams.get('topicId');
    const generatorConfigId = url.searchParams.get('generatorConfigId');

    if (generatorConfigId) {
      const video = await getCachedGeneratedVideo(generatorConfigId);
      return apiSuccess({
        video,
        cached: !!video,
      });
    }

    if (paceMultiplier && topicId) {
      const config = await getOrCreateVideoGeneratorConfig(
        parseFloat(paceMultiplier),
        topicId,
        'medium',
        'default',
        600
      );

      return apiSuccess({
        config,
        message: `Video generator config for pace ${paceMultiplier}x, topic ${topicId}`,
      });
    }

    return apiError('Missing required parameters', 400);
  } catch (error) {
    log.error('GET /api/video-generator error', error);
    return apiError('Failed to get video generator config', 500);
  }
}

async function handlePOST(auth: any, body: any) {
  try {
    const { action, paceMultiplier, topicId, videoId, discussionGroupId, studentId } = body;

    if (action === 'generate') {
      const config = await getOrCreateVideoGeneratorConfig(
        paceMultiplier,
        topicId,
        'medium',
        'default',
        600
      );

      log.info('Video generator config created', {
        pace: paceMultiplier,
        topic: topicId,
      });

      return apiSuccess({
        config,
        message: 'Video generator config ready - students with same pace will use cached content',
      });
    }

    if (action === 'cache-video') {
      const generatorConfigId = `${paceMultiplier}-${topicId}`;
      const video = {
        id: videoId,
        generatorConfigId,
        url: `https://cdn.example.com/videos/${videoId}.mp4`,
        thumbnail: `https://cdn.example.com/videos/${videoId}-thumb.jpg`,
        duration: 600,
        createdAt: new Date().toISOString(),
      };

      await cacheGeneratedVideo(generatorConfigId, video);
      log.info('Video cached for reuse', { generatorConfigId, videoId });

      return apiSuccess({
        video,
        message: 'Video cached - all students with this pace will use this video',
      });
    }

    if (action === 'link-student') {
      await linkStudentToVideo(studentId, topicId, videoId, discussionGroupId);
      log.info('Student linked to video with discussion group', {
        studentId,
        videoId,
        discussionGroupId,
      });

      return apiSuccess({
        message: 'Student linked to video - using shared content with separate discussion',
      });
    }

    return apiError('Unknown action', 400);
  } catch (error) {
    log.error('POST /api/video-generator error', error);
    return apiError('Failed to process video generator request', 500);
  }
}

export const GET = withRole(['student', 'teacher', 'admin'], (req, auth) =>
  handleGET(req, auth)
);

export const POST = withRole(['teacher', 'admin'], (req, auth) =>
  req.json().then((body) => handlePOST(auth, body))
);
