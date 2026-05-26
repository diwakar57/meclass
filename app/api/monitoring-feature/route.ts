/**
 * Monitoring Feature Control API
 * Allows SaaS admin to enable/disable monitoring for schools
 * Allows school admin to configure monitoring settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export interface MonitoringFeatureSettings {
  enableFaceDetection: boolean;
  enableTabSwitchDetection: boolean;
  enableMouseTracking: boolean;
  focusPauseDelay: number;
  alertSoundEnabled: boolean;
  pauseClassOnAlert: boolean;
  notifyOnAlert: boolean;
  logRetentionDays: number;
}

// GET endpoint to fetch monitoring settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Missing schoolId parameter' },
        { status: 400 }
      );
    }

    // Verify user is admin or school admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { role: true, schoolId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = user.role === 'admin';
    const isSchoolAdmin = user.role === 'school_admin' && user.schoolId === schoolId;

    if (!isAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch school monitoring settings
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        monitoringFeatureEnabled: true,
        monitoringSettings: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error('Fetch monitoring settings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to configure monitoring settings (School Admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schoolId, settings } = await request.json();

    if (!schoolId || !settings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is school admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { role: true, schoolId: true },
    });

    if (!user || (user.role !== 'school_admin' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    if (user.role === 'school_admin' && user.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Cannot modify other school settings' },
        { status: 403 }
      );
    }

    // Verify school has monitoring feature enabled
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { monitoringFeatureEnabled: true },
    });

    if (!school?.monitoringFeatureEnabled) {
      return NextResponse.json(
        { error: 'Monitoring feature not enabled for this school' },
        { status: 403 }
      );
    }

    // Update monitoring settings
    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        monitoringSettings: settings,
      },
      select: {
        id: true,
        name: true,
        monitoringSettings: true,
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: session.user.id as string,
        action: 'UPDATE_MONITORING_SETTINGS',
        details: { settings },
      },
    });

    return NextResponse.json({
      success: true,
      school: updated,
      message: 'Monitoring settings updated successfully',
    });
  } catch (error) {
    console.error('Update monitoring settings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to enable/disable monitoring feature (SaaS Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is SaaS admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only SaaS admins can control feature access' },
        { status: 403 }
      );
    }

    const { schoolId, enabled } = await request.json();

    if (!schoolId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check subscription tier
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { subscriptionTier: true },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Only premium and higher tiers get monitoring
    const allowedTiers = ['premium', 'enterprise'];
    if (enabled && !allowedTiers.includes(school.subscriptionTier || '')) {
      return NextResponse.json(
        {
          error: 'Monitoring feature requires Premium or Enterprise subscription',
        },
        { status: 403 }
      );
    }

    // Update feature access
    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        monitoringFeatureEnabled: enabled,
      },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        monitoringFeatureEnabled: true,
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: session.user.id as string,
        action: 'UPDATE_FEATURE_ACCESS',
        details: { feature: 'monitoring', enabled },
      },
    });

    return NextResponse.json({
      success: true,
      school: updated,
      message: `Monitoring feature ${enabled ? 'enabled' : 'disabled'} for school`,
    });
  } catch (error) {
    console.error('Feature control error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
