import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentName, studentAge, gradeLevel, parentName, parentEmail, parentPhone, address } = body;

    // Mock: Submit enrollment request
    console.log('Enrollment request submitted:', { studentName, gradeLevel, parentName });

    return NextResponse.json({
      success: true,
      message: 'Enrollment request submitted successfully',
      requestId: `req-${Date.now()}`,
      status: 'pending',
    });
  } catch (error) {
    console.error('Error submitting enrollment request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
