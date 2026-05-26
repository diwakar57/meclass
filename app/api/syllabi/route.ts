/**
 * Syllabi API Routes - POST/GET /api/syllabi
 * Only teachers can create/manage syllabi
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import {
  createSyllabus,
  listSyllabi,
  countSyllabi,
} from '@/lib/syllabi/syllabus-service';
import { parseSyllabusContent } from '@/lib/services/syllabus-parser-service';
import type { AuthContext } from '@/lib/types/auth';
import type { CreateSyllabusInput } from '@/lib/types/syllabi';

interface CreateSyllabusPayload {
  title: string;
  description?: string;
  content?: string; // Base64 encoded for PDF/text
  format: 'pdf' | 'text' | 'form';
  chapters?: Array<{
    title: string;
    description?: string;
    topics?: Array<{
      title: string;
      description?: string;
      learningObjectives: string[];
    }>;
  }>;
}

// POST /api/syllabi - Create new syllabus
export const POST = withRole(['teacher'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const body: CreateSyllabusPayload = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!body.format || !['pdf', 'text', 'form'].includes(body.format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    if (body.format !== 'form' && !body.content) {
      return NextResponse.json({ error: 'Content is required for PDF/text format' }, { status: 400 });
    }

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 401 });
    }

    // Decode content if provided
    let decodedContent: string | Buffer = '';
    if (body.content) {
      // Try to decode base64
      try {
        decodedContent = Buffer.from(body.content, 'base64');
      } catch {
        decodedContent = body.content;
      }
    }

    // Parse syllabus content
    const parseInput: CreateSyllabusInput = {
      title: body.title,
      description: body.description,
      content: decodedContent,
      format: body.format,
      chapters: body.chapters,
    };

    const parseResult = await parseSyllabusContent(parseInput);
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { error: parseResult.error || 'Failed to parse syllabus' },
        { status: 400 }
      );
    }

    // Save to database
    const syllabus = await createSyllabus(
      auth.schoolId,
      auth.userId,
      body.title,
      body.description,
      parseResult.data,
      body.format
    );

    return NextResponse.json({
      success: true,
      syllabus: {
        id: syllabus.id,
        title: syllabus.title,
        description: syllabus.description,
        format: syllabus.format,
        chaptersCount: syllabus.contentParsed.chapters.length,
        createdAt: syllabus.createdAt,
      },
    });
  } catch (error) {
    console.error('Syllabus creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create syllabus' },
      { status: 500 }
    );
  }
});

// GET /api/syllabi - List syllabi for school
export const GET = withRole(['teacher', 'principal'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const teacherId = url.searchParams.get('teacherId');

    // Principals can see all syllabi; teachers only see their own
    const effectiveTeacherId = auth.role === 'teacher' ? auth.userId : teacherId || undefined;

    const syllabi = await listSyllabi(auth.schoolId, effectiveTeacherId, limit, offset);
    const total = await countSyllabi(auth.schoolId, effectiveTeacherId);

    return NextResponse.json({
      success: true,
      syllabi: syllabi.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        format: s.format,
        teacherId: s.teacherId,
        chaptersCount: s.contentParsed.chapters.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Syllabus listing error:', error);
    return NextResponse.json(
      { error: 'Failed to list syllabi' },
      { status: 500 }
    );
  }
});
