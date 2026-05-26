import { cacheClient } from '@/lib/cache/redis-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('VideoGeneratorCache');

export interface VideoGeneratorConfig {
  paceMultiplier: number;
  topicId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  style: string;
  duration: number;
}

export interface GeneratedVideo {
  id: string;
  generatorConfigId: string;
  url: string;
  thumbnail: string;
  duration: number;
  createdAt: string;
}

/**
 * Cache key for generator config by pace (shared across students with same pace)
 */
function getGeneratorConfigKey(paceMultiplier: number, topicId: string): string {
  return `video:generator:pace:${paceMultiplier}:topic:${topicId}`;
}

/**
 * Cache key for generated video content
 */
function getGeneratedVideoKey(generatorConfigId: string): string {
  return `video:generated:${generatorConfigId}`;
}

/**
 * Cache key for student's video references (can be same video but with different discussion)
 */
function getStudentVideoKey(studentId: string, classId: string): string {
  return `video:student:${studentId}:class:${classId}`;
}

/**
 * Get or create shared video generator config for a pace level
 */
export async function getOrCreateVideoGeneratorConfig(
  paceMultiplier: number,
  topicId: string,
  difficulty: 'easy' | 'medium' | 'hard',
  style: string,
  duration: number
): Promise<VideoGeneratorConfig> {
  const cacheKey = getGeneratorConfigKey(paceMultiplier, topicId);

  // Try to get from cache first
  const cached = await cacheClient.get<VideoGeneratorConfig>(cacheKey);
  if (cached) {
    log.info('Retrieved video generator config from cache', { paceMultiplier, topicId });
    return cached;
  }

  // Create new config
  const config: VideoGeneratorConfig = {
    paceMultiplier,
    topicId,
    difficulty,
    style,
    duration,
  };

  // Cache for 24 hours (shared across all students with same pace)
  await cacheClient.set(cacheKey, config, 24 * 3600);

  log.info('Created and cached video generator config', { paceMultiplier, topicId });
  return config;
}

/**
 * Cache generated video (shared across students with same pace)
 */
export async function cacheGeneratedVideo(
  generatorConfigId: string,
  video: GeneratedVideo
): Promise<void> {
  const cacheKey = getGeneratedVideoKey(generatorConfigId);
  // Cache for 7 days
  await cacheClient.set(cacheKey, video, 7 * 24 * 3600);
  log.info('Cached generated video', { generatorConfigId });
}

/**
 * Get cached generated video
 */
export async function getCachedGeneratedVideo(
  generatorConfigId: string
): Promise<GeneratedVideo | null> {
  const cacheKey = getGeneratedVideoKey(generatorConfigId);
  return cacheClient.get<GeneratedVideo>(cacheKey);
}

/**
 * Link student to video (can be same video for multiple students discussing separately)
 */
export async function linkStudentToVideo(
  studentId: string,
  classId: string,
  videoId: string,
  discussionGroupId: string
): Promise<void> {
  const cacheKey = getStudentVideoKey(studentId, classId);
  const videoLink = {
    videoId,
    discussionGroupId,
    linkedAt: new Date().toISOString(),
  };

  // Cache for 30 days
  await cacheClient.set(cacheKey, videoLink, 30 * 24 * 3600);
  log.info('Linked student to video', { studentId, classId, videoId, discussionGroupId });
}

/**
 * Get student's video reference with discussion group
 */
export async function getStudentVideoReference(
  studentId: string,
  classId: string
): Promise<{ videoId: string; discussionGroupId: string } | null> {
  const cacheKey = getStudentVideoKey(studentId, classId);
  return cacheClient.get<{ videoId: string; discussionGroupId: string }>(cacheKey);
}

/**
 * Get all students with same pace multiplier (for batch operations)
 */
export async function cacheStudentsWithPace(
  paceMultiplier: number,
  studentIds: string[]
): Promise<void> {
  const cacheKey = `users:pace:${paceMultiplier}`;
  // Cache for 1 hour
  await cacheClient.set(cacheKey, studentIds, 3600);
  log.info('Cached students with pace', { paceMultiplier, count: studentIds.length });
}

/**
 * Get students with same pace (useful for batch video generation)
 */
export async function getStudentsWithPace(paceMultiplier: number): Promise<string[]> {
  const cacheKey = `users:pace:${paceMultiplier}`;
  const cached = await cacheClient.get<string[]>(cacheKey);
  return cached || [];
}

/**
 * Invalidate video cache when content changes
 */
export async function invalidateVideoCache(topicId: string): Promise<void> {
  // In production, you'd want to invalidate all pace levels for this topic
  log.info('Video cache invalidation requested', { topicId });
  // This would be implemented per pace level if needed
}
