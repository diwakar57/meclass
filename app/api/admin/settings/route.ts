import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || !['admin', 'saas_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock admin settings data
    const settingsData = {
      system: {
        schoolName: 'OpenMAIC School',
        timezone: 'Asia/Kolkata',
        language: 'English',
        academicYear: '2025-2026',
      },
      security: {
        twoFactorAuth: true,
        ipWhitelist: false,
        passwordPolicy: 'Strong',
        sessionTimeout: 30,
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        notificationFrequency: 'Immediate',
      },
      features: {
        gradesEnabled: true,
        attendanceEnabled: true,
        assignmentsEnabled: true,
        communicationEnabled: true,
        portfolioEnabled: true,
      },
      integrations: {
        googleClassroom: { enabled: true, apiKey: '****' },
        microsoft365: { enabled: false, apiKey: '' },
        googleMeet: { enabled: true, apiKey: '****' },
        zoom: { enabled: false, apiKey: '' },
      },
    };

    return NextResponse.json({ data: settingsData });
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || !['admin', 'saas_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Mock: Save settings
    console.log('Admin settings updated:', body);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: body,
    });
  } catch (error) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
