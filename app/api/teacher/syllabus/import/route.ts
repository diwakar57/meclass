import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/teacher/syllabus/import
 * Import a syllabus document for a teacher's class
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can import syllabi' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const classId = formData.get('classId') as string;
    const schoolId = user.schoolId || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name;
    const fileContent = await file.text();

    logger.info(`Teacher ${user.id} importing syllabus: ${fileName}`);

    // Parse the syllabus content based on file type
    let syllabusData: any = {
      title: fileName.replace(/\.[^/.]+$/, ''), // Remove file extension
      description: '',
      content: fileContent,
      metadata: {
        originalFileName: fileName,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      },
    };

    // If it's JSON, try to parse it
    if (file.name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(fileContent);
        syllabusData = {
          title: parsed.title || fileName.replace(/\.[^/.]+$/, ''),
          description: parsed.description || '',
          content: JSON.stringify(parsed.content || parsed, null, 2),
          metadata: {
            originalFileName: fileName,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            parsedJSON: true,
          },
        };
      } catch (e) {
        logger.warn('Failed to parse JSON syllabus, treating as text');
      }
    }

    // Create syllabus record in database
    const syllabus = await prisma.teacherSyllabus.create({
      data: {
        teacherId: user.id,
        schoolId,
        title: syllabusData.title,
        description: syllabusData.description,
        contentParsed: syllabusData.metadata, // Store metadata as JSON
        format: file.name.split('.').pop() || 'txt',
      },
    });

    logger.info(`Syllabus ${syllabus.id} created for teacher ${user.id}`);

    return NextResponse.json({
      success: true,
      id: syllabus.id,
      title: syllabus.title,
      message: `Syllabus "${syllabusData.title}" imported successfully!`,
    });
  } catch (error) {
    logger.error('Failed to import syllabus:', error);
    return NextResponse.json(
      { error: 'Failed to import syllabus' },
      { status: 500 }
    );
  }
}
