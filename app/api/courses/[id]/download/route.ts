/**
 * Course Download/View API - GET /api/courses/[id]/download
 * Download or serve generated course HTML
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { getCourse } from '@/lib/courses/course-service';
import { getCourseFile } from '@/lib/filesystem/course-storage';
import type { AuthContext } from '@/lib/types/auth';

// GET /api/courses/[id]/download - Download course as HTML/ZIP
export const GET = withRole(['student', 'teacher', 'principal'], async (
  req: NextRequest,
  auth: AuthContext,
  // @ts-ignore - params are injected by Next.js
  { params }
) => {
  try {
    const courseId = (await params).id;
    const format = new URL(req.url).searchParams.get('format') || 'html'; // html or zip

    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Verify school access
    if (course.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Students can only download their own courses
    if (auth.role === 'student' && course.studentId !== auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if course generation is complete
    if (course.generationStatus !== 'success') {
      return NextResponse.json(
        {
          error: 'Course generation not complete',
          status: course.generationStatus,
          message:
            course.generationStatus === 'failed'
              ? `Error: ${course.errorMessage}`
              : 'Please wait for generation to complete',
        },
        { status: 400 }
      );
    }

    // Get course file from filesystem
    const fileData = await getCourseFile(courseId);
    if (!fileData) {
      return NextResponse.json({ error: 'Course file not found' }, { status: 404 });
    }

    // Return file with appropriate headers
    return new NextResponse(fileData.buffer, {
      headers: {
        'Content-Type': fileData.mimeType,
        'Content-Disposition': `attachment; filename="${course.title.replace(/[^a-z0-9]/gi, '_')}.html"`,
        'Content-Length': fileData.buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Course download error:', error);
    return NextResponse.json(
      { error: 'Failed to download course' },
      { status: 500 }
    );
  }
});
