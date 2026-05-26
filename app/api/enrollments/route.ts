import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    // Mock enrollment data
    const enrollmentData = {
      totalEnrolled: 450,
      pendingRequests: 12,
      activeStudents: 425,
      enrollmentByGrade: [
        { grade: 'Grade 1', count: 45 },
        { grade: 'Grade 2', count: 48 },
        { grade: 'Grade 3', count: 50 },
        { grade: 'Grade 4', count: 52 },
        { grade: 'Grade 5', count: 55 },
        { grade: 'Grade 6', count: 58 },
        { grade: 'Grade 7', count: 40 },
        { grade: 'Grade 8', count: 38 },
        { grade: 'Grade 9', count: 35 },
        { grade: 'Grade 10', count: 34 },
      ],
      enrolledStudents: Array(50)
        .fill(null)
        .map((_, i) => ({
          studentId: `student-${i}`,
          name: `Student ${i}`,
          email: `student${i}@school.com`,
          phone: '9876543210',
          gradeLevel: `Grade ${1 + (i % 10)}`,
          enrollmentDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
          status: ['active', 'inactive', 'suspended', 'completed'][Math.floor(Math.random() * 4)],
          feesPaid: Math.floor(Math.random() * 50000),
          feesTotal: 50000,
          parent: `Parent ${i}`,
        })),
      enrollmentRequests: Array(5)
        .fill(null)
        .map((_, i) => ({
          requestId: `req-${i}`,
          parentName: `Parent ${i}`,
          studentName: `Prospective Student ${i}`,
          studentAge: 10 + Math.floor(Math.random() * 10),
          gradeLevel: `Grade ${1 + (i % 10)}`,
          requestDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          status: ['pending', 'approved', 'rejected'][i % 3],
        })),
      monthlyEnrollment: Array(12)
        .fill(null)
        .map((_, i) => ({
          month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
          new: 20 + Math.floor(Math.random() * 40),
        })),
    };

    return NextResponse.json({ data: enrollmentData });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
