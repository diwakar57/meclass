/**
 * Student Monitoring API Route
 * Logs student behavior: focus, mouse movement, tab switches, face detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { prisma } from '@/lib/prisma';

export interface StudentMonitoringLogPayload {
  schoolId: string;
  classId: string;
  studentId: string;
  focusStatus: 'focused' | 'unfocused';
  mouseMovement: number;
  tabSwitchCount: number;
  faceDetectedStatus: boolean;
  alertTriggered: boolean;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: StudentMonitoringLogPayload = await request.json();

    // Verify monitoring is enabled for this school
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
      select: {
        id: true,
        monitoringFeatureEnabled: true,
        subscriptionTier: true,
      },
    });

    if (!school?.monitoringFeatureEnabled) {
      return NextResponse.json(
        { error: 'Monitoring not enabled for this school' },
        { status: 403 }
      );
    }

    // Verify user has access to view this data
    const hasAccess = await verifyMonitoringAccess(session.user.id, data);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Save monitoring log
    const log = await prisma.studentMonitoringLog.create({
      data: {
        schoolId: data.schoolId,
        classId: data.classId,
        studentId: data.studentId,
        focusStatus: data.focusStatus,
        mouseMovement: data.mouseMovement,
        tabSwitchCount: data.tabSwitchCount,
        faceDetected: data.faceDetectedStatus,
        alertTriggered: data.alertTriggered,
        timestamp: new Date(data.timestamp),
      },
    });

    // Check if alert action needed
    if (data.alertTriggered) {
      await handleAlertAction(data);
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const schoolId = searchParams.get('schoolId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!classId || !schoolId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify access
    const hasAccess = await verifyMonitoringAccess(session.user.id, {
      classId,
      schoolId,
      studentId: studentId || undefined,
    } as any);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch monitoring logs
    const where: any = {
      classId,
      schoolId,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const logs = await prisma.studentMonitoringLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    // Calculate statistics
    const stats = {
      totalLogs: logs.length,
      averageFocusTime: calculateFocusTime(logs),
      alertCount: logs.filter((l) => l.alertTriggered).length,
      tabSwitchCount: logs.reduce((sum, l) => sum + l.tabSwitchCount, 0),
      faceDetectionRate: calculateDetectionRate(logs),
    };

    return NextResponse.json({ logs, stats });
  } catch (error) {
    console.error('Fetch monitoring logs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verify if user has access to monitoring data
 */
async function verifyMonitoringAccess(
  userId: string,
  data: Partial<StudentMonitoringLogPayload & { classId?: string }>
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      schoolId: true,
      parentOf: { select: { id: true } },
    },
  });

  if (!user) return false;

  // Admin: full access
  if (user.role === 'admin') return true;

  // School admin: access to their school data
  if (
    user.role === 'school_admin' &&
    user.schoolId === data.schoolId
  ) {
    return true;
  }

  // Teacher: access to their class
  if (user.role === 'teacher') {
    const classOwner = await prisma.classroom.findUnique({
      where: { id: data.classId },
      select: { teacherId: true },
    });
    return classOwner?.teacherId === userId;
  }

  // Parent: access to their child's data
  if (user.role === 'parent' && data.studentId) {
    return user.parentOf.some((child) => child.id === data.studentId);
  }

  return false;
}

/**
 * Handle alert actions (e.g., pause class, notify admin)
 */
async function handleAlertAction(data: StudentMonitoringLogPayload): Promise<void> {
  try {
    // Get school monitoring settings
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
      select: {
        monitoringSettings: true,
        admins: { select: { id: true, email: true } },
      },
    });

    if (
      school?.monitoringSettings &&
      typeof school.monitoringSettings === 'object' &&
      (school.monitoringSettings as any).pauseClassOnAlert
    ) {
      // Pause the class
      await prisma.classroom.update({
        where: { id: data.classId },
        data: { isPaused: true },
      });
    }

    // Notify admin/teacher if configured
    if ((school?.monitoringSettings as any)?.notifyOnAlert) {
      // Send notification (implement via email/webhook)
      await notifyStakeholders(data, school?.admins || []);
    }
  } catch (error) {
    console.error('Error handling alert action:', error);
  }
}

/**
 * Calculate focus time percentage
 */
function calculateFocusTime(logs: any[]): number {
  if (logs.length === 0) return 100;
  const focusedCount = logs.filter((l) => l.focusStatus === 'focused').length;
  return Math.round((focusedCount / logs.length) * 100);
}

/**
 * Calculate face detection rate
 */
function calculateDetectionRate(logs: any[]): number {
  if (logs.length === 0) return 0;
  const detectedCount = logs.filter((l) => l.faceDetected).length;
  return Math.round((detectedCount / logs.length) * 100);
}

/**
 * Notify stakeholders of alerts
 */
async function notifyStakeholders(data: StudentMonitoringLogPayload, admins: any[]): Promise<void> {
  // TODO: Implement email/webhook notifications
  console.log('Notifying stakeholders:', admins);
}
