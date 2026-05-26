import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('SchoolsListAPI');

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SaaS admin gets all approved schools.
    if (auth.role === 'saas_admin') {
      const result = await query(
        `SELECT id, name, domain
         FROM schools
         ORDER BY created_at DESC
         LIMIT 100`
      );

      return NextResponse.json({
        schools: result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          domain: row.domain,
          studentCount: 0,
          teacherCount: 0,
        })),
      });
    }

    // Staff users get their own school (if present).
    if (auth.schoolId && auth.role !== 'student') {
      const result = await query(
        `SELECT id, name, domain
         FROM schools
         WHERE id = $1
         LIMIT 1`,
        [auth.schoolId]
      );

      return NextResponse.json({
        schools: result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          domain: row.domain,
          studentCount: 0,
          teacherCount: 0,
        })),
      });
    }

    // Students get approved memberships.
    const result = await query(
      `SELECT s.id, s.name, s.domain
       FROM school_memberships sm
       JOIN schools s ON s.id = sm.school_id
       WHERE sm.student_id = $1 AND sm.status = 'approved'
       ORDER BY sm.created_at DESC`,
      [auth.userId]
    );

    return NextResponse.json({
      schools: result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        domain: row.domain,
        studentCount: 0,
        teacherCount: 0,
      })),
    });
  } catch (error) {
    log.error('Failed to list schools', error);
    return NextResponse.json({ error: 'Failed to list schools' }, { status: 500 });
  }
}
