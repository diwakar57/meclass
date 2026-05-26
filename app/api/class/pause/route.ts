/**
 * Class Control API Route
 * Pause/Resume class when student loses focus
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { prisma } from '@/lib/prisma';

export interface PauseClassPayload {
  classId: string;
  reason: string;
  studentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: PauseClassPayload = await request.json();

    // Verify user is teacher or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { role: true, schoolId: true },
    });

    if (!user || !['teacher', 'admin', 'school_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify class ownership
    const classroom = await prisma.classroom.findUnique({
      where: { id: data.classId },
      select: {
        teacherId: true,
        schoolId: true,
        isPaused: true,
      },
    });

    if (!classroom) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check permissions
    const hasAccess =
      user.role === 'admin' ||
      (user.role === 'school_admin' && user.schoolId === classroom.schoolId) ||
      (user.role === 'teacher' && classroom.teacherId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Pause class
    const updated = await prisma.classroom.update({
      where: { id: data.classId },
      data: {
        isPaused: true,
        pauseReason: data.reason,
        pausedAt: new Date(),
      },
    });

    // Log the event
    await prisma.classMonitoringEvent.create({
      data: {
        classId: data.classId,
        studentId: data.studentId,
        eventType: 'CLASS_PAUSED',
        reason: data.reason,
        triggeredBy: session.user.id as string,
      },
    });

    // Notify students (via websocket/realtime)
    await notifyClassPause(data.classId, {
      message: `Class has been paused: ${data.reason}`,
      studentId: data.studentId,
    });

    return NextResponse.json({ success: true, classroom: updated });
  } catch (error) {
    console.error('Pause class error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await request.json();

    // Verify class ownership
    const classroom = await prisma.classroom.findUnique({
      where: { id: classId },
      select: {
        teacherId: true,
      },
    });

    if (!classroom || classroom.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Resume class
    const updated = await prisma.classroom.update({
      where: { id: classId },
      data: {
        isPaused: false,
        pauseReason: null,
        pausedAt: null,
      },
    });

    // Log the event
    await prisma.classMonitoringEvent.create({
      data: {
        classId: classId,
        eventType: 'CLASS_RESUMED',
        triggeredBy: session.user.id as string,
      },
    });

    // Notify students
    await notifyClassResume(classId);

    return NextResponse.json({ success: true, classroom: updated });
  } catch (error) {
    console.error('Resume class error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Notify all students that class has been paused
 */
async function notifyClassPause(
  classId: string,
  payload: { message: string; studentId?: string }
): Promise<void> {
  // TODO: Implement websocket/realtime notification
  console.log(`Notifying class ${classId} of pause:`, payload);
}

/**
 * Notify all students that class has resumed
 */
async function notifyClassResume(classId: string): Promise<void> {
  // TODO: Implement websocket/realtime notification
  console.log(`Notifying class ${classId} of resume`);
}
