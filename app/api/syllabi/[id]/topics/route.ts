/**
 * app/api/syllabi/[id]/topics/route.ts
 * Topics management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/role-guard';
import { topicService } from '@/lib/services/syllabus-service';
import { syllabusTopicsRepository } from '@/lib/repositories/syllabus-repository';
import { createLogger } from '@/lib/logger';
import type { CreateSyllabusTopicRequest } from '@/lib/types/syllabi';

const log = createLogger('TopicsAPI');

// GET /api/syllabi/[id]/topics
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { id } = params;
    const topics = await syllabusTopicsRepository.getBySyllabusId(id);

    return NextResponse.json({
      success: true,
      data: topics,
      count: topics.length,
    });
  } catch (error) {
    log.error('Failed to list topics:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list topics' },
      { status: 400 }
    );
  }
}

// POST /api/syllabi/[id]/topics
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    const { id: syllabusId } = params;
    const body: CreateSyllabusTopicRequest = await req.json();

    const topic = await topicService.addTopic(syllabusId, schoolId, body, userId);

    return NextResponse.json(
      {
        success: true,
        data: topic,
        message: `Topic "${topic.title}" added to syllabus`,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error('Failed to create topic:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create topic' },
      { status: 400 }
    );
  }
}
