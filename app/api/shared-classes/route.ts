import { query } from '@/lib/db';
import { withRole } from '@/lib/middleware/auth';
import { getOrCreateSharedClass, createDiscussionGroup, bulkAddStudentsToDiscussionGroup, getStudentsWithSamePace } from '@/lib/services/shared-class-service';
import { apiError, apiSuccess } from '@/lib/utils/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('SharedClassAPI');

async function handleGET(req: Request) {
  try {
    const url = new URL(req.url);
    const paceMultiplier = url.searchParams.get('pace');
    const topicId = url.searchParams.get('topicId');
    const action = url.searchParams.get('action');

    if (action === 'students-with-pace' && paceMultiplier) {
      const students = await getStudentsWithSamePace(parseFloat(paceMultiplier));
      return apiSuccess(students);
    }

    if (paceMultiplier && topicId) {
      const sharedClass = await getOrCreateSharedClass(
        parseFloat(paceMultiplier),
        topicId,
        '', // videoId
        ''  // content
      );
      return apiSuccess(sharedClass);
    }

    return apiError('Missing pace or topicId parameters', 400);
  } catch (error) {
    log.error('GET /api/shared-classes error', error);
    return apiError('Failed to get shared class', 500);
  }
}

async function handlePOST(auth: any, body: any) {
  try {
    const { action, paceMultiplier, topicId, videoId, content, discussionGroupName, discussionGroupDescription, studentIds } = body;

    if (action === 'create-shared-class') {
      const sharedClass = await getOrCreateSharedClass(
        paceMultiplier,
        topicId,
        videoId,
        content
      );

      // Get students with same pace
      const students = await getStudentsWithSamePace(paceMultiplier);
      const discussionGroup = await createDiscussionGroup(
        sharedClass.id,
        paceMultiplier,
        discussionGroupName || `Group ${new Date().toISOString()}`,
        discussionGroupDescription || ''
      );

      // Bulk add students
      if (students.length > 0) {
        await bulkAddStudentsToDiscussionGroup(
          students.map((s: any) => s.id),
          discussionGroup.id,
          sharedClass.id
        );
      }

      log.info('Shared class created with discussion group', {
        sharedClassId: sharedClass.id,
        studentCount: students.length,
      });

      return apiSuccess({
        sharedClass,
        discussionGroup,
        studentCount: students.length,
        message: `Shared class created for ${students.length} students with pace ${paceMultiplier}x`,
      });
    }

    return apiError('Unknown action', 400);
  } catch (error) {
    log.error('POST /api/shared-classes error', error);
    return apiError('Failed to create shared class', 500);
  }
}

export const GET = withRole(['teacher', 'principal', 'admin'], (req, auth) =>
  handleGET(req)
);

export const POST = withRole(['teacher', 'principal', 'admin'], (req, auth) =>
  req.json().then((body) => handlePOST(auth, body))
);
