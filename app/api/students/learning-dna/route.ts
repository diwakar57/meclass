import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { LearningDNAService } from '@/lib/services/learning-dna';

export const GET = withRole(['student', 'teacher'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const requestedStudentId = req.nextUrl.searchParams.get('studentId');
    const studentId = requestedStudentId || auth.userId;

    if (auth.role === 'student' && studentId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (auth.role === 'teacher') {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
      }

      const studentResult = await query(
        `SELECT school_id
         FROM users
         WHERE id = $1 AND role = 'student'`,
        [studentId]
      );

      if (studentResult.rowCount === 0) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      if (studentResult.rows[0].school_id !== auth.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const dna = await LearningDNAService.getLearningDNA(studentId);

    if (!dna) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        paceType: dna.paceType,
        mistakeType: dna.mistakeType,
        preferredStyle: dna.preferredStyle,
        attentionSpanScore: dna.attentionSpanScore,
        recoveryRate: dna.recoveryRate,
        lastUpdated: dna.lastUpdated,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch learning dna' }, { status: 500 });
  }
});
