import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cacheClient } from '@/lib/cache/redis-client';

const log = createLogger('SharedClassService');

export interface SharedClassContent {
  id: string;
  pace_multiplier: number;
  topic_id: string;
  video_id: string;
  content: string;
  created_at: string;
}

export interface ClassDiscussionGroup {
  id: string;
  shared_class_id: string;
  pace_multiplier: number;
  name: string;
  description: string;
  created_at: string;
}

export interface StudentDiscussion {
  id: string;
  discussion_group_id: string;
  student_id: string;
  shared_class_id: string;
  created_at: string;
}

/**
 * Get or create shared class content for a pace level
 * Multiple students with the same pace share the same video and interactive content
 */
export async function getOrCreateSharedClass(
  paceMultiplier: number,
  topicId: string,
  videoId: string,
  content: string
): Promise<SharedClassContent> {
  const cacheKey = `shared_class:pace:${paceMultiplier}:topic:${topicId}`;

  // Check cache first
  const cached = await cacheClient.get<SharedClassContent>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Check if already exists in database
    const result = await query(
      `SELECT id, pace_multiplier, topic_id, video_id, content, created_at
       FROM shared_classes
       WHERE pace_multiplier = $1 AND topic_id = $2
       LIMIT 1`,
      [paceMultiplier, topicId]
    );

    let sharedClass: SharedClassContent;

    if (result.rows.length > 0) {
      sharedClass = result.rows[0] as SharedClassContent;
    } else {
      // Create new shared class
      const insertResult = await query(
        `INSERT INTO shared_classes (pace_multiplier, topic_id, video_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id, pace_multiplier, topic_id, video_id, content, created_at`,
        [paceMultiplier, topicId, videoId, content]
      );

      sharedClass = insertResult.rows[0] as SharedClassContent;
    }

    // Cache for 7 days
    await cacheClient.set(cacheKey, sharedClass, 7 * 24 * 3600);
    log.info('Shared class content created/retrieved', { paceMultiplier, topicId });

    return sharedClass;
  } catch (error) {
    log.error('Error getting/creating shared class', error);
    throw error;
  }
}

/**
 * Get students with same pace for batch operations
 */
export async function getStudentsWithSamePace(
  paceMultiplier: number
): Promise<Array<{ id: string; email: string; name: string }>> {
  const cacheKey = `students:pace:${paceMultiplier}`;

  // Check cache first
  const cached = await cacheClient.get<Array<{ id: string; email: string; name: string }>>(
    cacheKey
  );
  if (cached) {
    return cached;
  }

  try {
    const result = await query(
      `SELECT DISTINCT u.id, u.email, u.first_name || ' ' || u.last_name as name
       FROM users u
       JOIN learning_plans lp ON u.id = lp.student_id
       WHERE lp.pace_multiplier = $1
       LIMIT 1000`,
      [paceMultiplier]
    );

    const students = result.rows as Array<{ id: string; email: string; name: string }>;

    // Cache for 1 hour
    await cacheClient.set(cacheKey, students, 3600);
    log.info('Retrieved students with pace', { paceMultiplier, count: students.length });

    return students;
  } catch (error) {
    log.error('Error getting students with pace', error);
    throw error;
  }
}

/**
 * Create a discussion group for students within the same shared class
 * Allows many students to discuss the same content separately
 */
export async function createDiscussionGroup(
  sharedClassId: string,
  paceMultiplier: number,
  name: string,
  description: string
): Promise<ClassDiscussionGroup> {
  try {
    const result = await query(
      `INSERT INTO class_discussion_groups (shared_class_id, pace_multiplier, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, shared_class_id, pace_multiplier, name, description, created_at`,
      [sharedClassId, paceMultiplier, name, description]
    );

    const group = result.rows[0] as ClassDiscussionGroup;
    log.info('Discussion group created', { groupId: group.id, sharedClassId });

    return group;
  } catch (error) {
    log.error('Error creating discussion group', error);
    throw error;
  }
}

/**
 * Add student to a discussion group within shared class
 */
export async function addStudentToDiscussionGroup(
  studentId: string,
  discussionGroupId: string,
  sharedClassId: string
): Promise<StudentDiscussion> {
  try {
    const result = await query(
      `INSERT INTO student_discussions (discussion_group_id, student_id, shared_class_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (discussion_group_id, student_id) DO UPDATE
       SET shared_class_id = EXCLUDED.shared_class_id
       RETURNING id, discussion_group_id, student_id, shared_class_id, created_at`,
      [discussionGroupId, studentId, sharedClassId]
    );

    const discussion = result.rows[0] as StudentDiscussion;
    log.info('Student added to discussion group', { studentId, discussionGroupId });

    return discussion;
  } catch (error) {
    log.error('Error adding student to discussion group', error);
    throw error;
  }
}

/**
 * Get discussion groups for a shared class
 */
export async function getDiscussionGroupsForClass(sharedClassId: string): Promise<ClassDiscussionGroup[]> {
  try {
    const result = await query(
      `SELECT id, shared_class_id, pace_multiplier, name, description, created_at
       FROM class_discussion_groups
       WHERE shared_class_id = $1
       ORDER BY created_at`,
      [sharedClassId]
    );

    return result.rows as ClassDiscussionGroup[];
  } catch (error) {
    log.error('Error getting discussion groups', error);
    throw error;
  }
}

/**
 * Get students in a specific discussion group
 */
export async function getStudentsInDiscussionGroup(
  discussionGroupId: string
): Promise<Array<{ id: string; email: string; name: string }>> {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name || ' ' || u.last_name as name
       FROM users u
       JOIN student_discussions sd ON u.id = sd.student_id
       WHERE sd.discussion_group_id = $1
       ORDER BY u.first_name, u.last_name`,
      [discussionGroupId]
    );

    return result.rows as Array<{ id: string; email: string; name: string }>;
  } catch (error) {
    log.error('Error getting discussion group students', error);
    throw error;
  }
}

/**
 * Bulk add students to discussion groups (optimized for same-pace cohorts)
 */
export async function bulkAddStudentsToDiscussionGroup(
  studentIds: string[],
  discussionGroupId: string,
  sharedClassId: string
): Promise<void> {
  try {
    if (studentIds.length === 0) return;

    const values = studentIds
      .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
      .join(',');

    const params: unknown[] = [];
    for (const studentId of studentIds) {
      params.push(discussionGroupId, studentId, sharedClassId);
    }

    await query(
      `INSERT INTO student_discussions (discussion_group_id, student_id, shared_class_id)
       VALUES ${values}
       ON CONFLICT (discussion_group_id, student_id) DO UPDATE
       SET shared_class_id = EXCLUDED.shared_class_id`,
      params
    );

    log.info('Bulk added students to discussion group', {
      count: studentIds.length,
      discussionGroupId,
    });
  } catch (error) {
    log.error('Error bulk adding students', error);
    throw error;
  }
}
