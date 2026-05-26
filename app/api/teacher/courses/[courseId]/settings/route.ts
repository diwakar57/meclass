/**
 * POST /api/teacher/courses/[courseId]/topics
 * PUT /api/teacher/courses/[courseId]/calendar
 * Manage course topics and calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { CourseService, CourseCalendarService } from '@/lib/services/course-service';
import type { AuthContext } from '@/lib/types/auth';
import type { BulkAddCourseTopicsRequest, SetCalendarRequest } from '@/lib/models/course-models';

// POST /api/teacher/courses/[courseId]/topics
export const POST = withRole(['teacher'], async (req: NextRequest, auth: AuthContext, { params }: { params: Promise<{ courseId: string }> }) => {
  try {
    const { courseId } = await params;
    const body: BulkAddCourseTopicsRequest = await req.json();

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    const topics = await CourseService.addTopics(courseId, auth.schoolId, auth.userId, body.topics);

    return NextResponse.json({
      success: true,
      topics,
      message: `${topics.length} topics added to course`,
    });
  } catch (error: any) {
    console.error('Add topics error:', error);
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 403 : 400 });
  }
});

/**
 * PUT /api/teacher/courses/[courseId]/calendar
 */
export const PUT = withRole(['teacher', 'principal'], async (req: NextRequest, auth: AuthContext, { params }: { params: Promise<{ courseId: string }> }) => {
  try {
    const { courseId } = await params;
    const body: SetCalendarRequest = await req.json();

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    // Verify ownership (for teachers)
    if (auth.role === 'teacher') {
      const courseDetails = await CourseService.getCourseDetails(courseId, auth.schoolId);
      if (!courseDetails || courseDetails.course.teacherId !== auth.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const calendar = await CourseService.setCalendar(courseId, auth.schoolId, body);

    return NextResponse.json({
      success: true,
      calendar,
      message: 'Course calendar updated successfully',
    });
  } catch (error: any) {
    console.error('Set calendar error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
