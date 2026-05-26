/**
 * GET /api/ai-classroom/sessions/[id]
 * Get a specific AI classroom session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { createLogger } from '@/lib/logger';
import { getAIClassroomSession } from '@/lib/services/ai-classroom-session-service';

const logger = createLogger('GetAIClassroomSession');

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const aiClassroomSession = await getAIClassroomSession(id);

    if (!aiClassroomSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify ownership (student can only access their own sessions)
    if (
      aiClassroomSession.student_id !== session.user.id &&
      session.user.role !== 'teacher' &&
      session.user.role !== 'principal' &&
      session.user.role !== 'saas_admin'
    ) {
      return NextResponse.json(
        { error: 'Not authorized to access this session' },
        { status: 403 }
      );
    }

    return NextResponse.json(aiClassroomSession, { status: 200 });
  } catch (error) {
    logger.error('Failed to get AI classroom session', { error });
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-classroom/sessions/[id]
 * Update an AI classroom session (mark as completed, add transcript, etc.)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const updates = await req.json();

    // Get current session to verify ownership
    const aiClassroomSession = await getAIClassroomSession(id);

    if (!aiClassroomSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Only student who owns the session can update it
    if (aiClassroomSession.student_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this session' },
        { status: 403 }
      );
    }

    // Import here to avoid circular dependencies
    const { updateAIClassroomSession } = await import(
      '@/lib/services/ai-classroom-session-service'
    );

    const updated = await updateAIClassroomSession(id, {
      video_url: updates.video_url,
      audio_url: updates.audio_url,
      transcript: updates.transcript,
      duration_seconds: updates.duration_seconds,
      session_metadata: updates.session_metadata,
      completed_at: updates.completed_at,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    logger.error('Failed to update AI classroom session', { error });
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-classroom/sessions/[id]
 * Delete an AI classroom session
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get current session to verify ownership
    const aiClassroomSession = await getAIClassroomSession(id);

    if (!aiClassroomSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Only student who owns the session or admin can delete it
    if (
      aiClassroomSession.student_id !== session.user.id &&
      session.user.role !== 'principal' &&
      session.user.role !== 'saas_admin'
    ) {
      return NextResponse.json(
        { error: 'Not authorized to delete this session' },
        { status: 403 }
      );
    }

    // Import here to avoid circular dependencies
    const { deleteAIClassroomSession } = await import(
      '@/lib/services/ai-classroom-session-service'
    );

    await deleteAIClassroomSession(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Failed to delete AI classroom session', { error });
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
