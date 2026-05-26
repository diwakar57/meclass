/**
 * Individual Course API - GET /api/courses/[id]
 * Fetch course metadata and status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { getCourse } from '@/lib/courses/course-service';
import type { AuthContext } from '@/lib/types/auth';

// GET /api/courses/[id] - Get course metadata
export const GET = withRole(['student', 'teacher', 'principal'], async (
  req: NextRequest,
  auth: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const courseId = params.id;

    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Verify school access
    if (course.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Students can only view their own courses
    if (auth.role === 'student' && course.studentId !== auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        generationStatus: course.generationStatus,
        fileSize: course.fileSize,
        filePath: course.filePath,
        errorMessage: course.errorMessage,
        createdAt: course.createdAt,
        generatedAt: course.generatedAt,
      },
    });
  } catch (error) {
    console.error('Course fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
});
