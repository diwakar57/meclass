/**
 * GET /api/admin/students
 * List all students in the admin's school(s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { createLogger } from '@/lib/logger';
import { query } from '@/lib/db';

const logger = createLogger('AdminStudents');

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  grade_level?: string;
  class_name?: string;
  section?: string;
  enrollment_status?: string;
  school_id: string;
  school_name?: string;
  parent_name?: string;
  overall_mastery?: number;
  attendance_rate?: number;
  recent_quiz_score?: number;
  risk_level?: string;
  last_active?: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '25'));
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const search = searchParams.get('search')?.toLowerCase() || '';
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const className = searchParams.get('className') || '';
    const section = searchParams.get('section') || '';
    const status = searchParams.get('status') || '';
    const riskLevel = searchParams.get('riskLevel') || '';
    const schoolId = searchParams.get('schoolId') || '';

    // Get all students (with optional school filter)
    let studentQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        sp.grade_level,
        sp.class_name,
        sp.section,
        sp.enrollment_status,
        sp.overall_mastery,
        sp.attendance_rate,
        sp.recent_quiz_score,
        sp.risk_level,
        u.last_active,
        s.id as school_id,
        s.name as school_name,
        (SELECT name FROM users WHERE id = sp.parent_id LIMIT 1) as parent_name
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN schools s ON sp.school_id = s.id
      WHERE u.role = 'student'
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (schoolId) {
      studentQuery += ` AND sp.school_id = $${paramCount}`;
      params.push(schoolId);
      paramCount++;
    }

    const result = await query(studentQuery, params);
    let students: StudentRecord[] = result.rows || [];

    // Apply filters
    students = students.filter((student) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          student.name?.toLowerCase().includes(searchLower) ||
          student.id?.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Grade level filter
      if (gradeLevel && student.grade_level !== gradeLevel) return false;

      // Class filter
      if (className && student.class_name !== className) return false;

      // Section filter
      if (section && student.section !== section) return false;

      // Status filter
      if (status && student.enrollment_status !== status) return false;

      // Risk level filter
      if (riskLevel && student.risk_level !== riskLevel) return false;

      return true;
    });

    // Apply sorting
    const sortKey = sortBy.toLowerCase();
    students.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortKey) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'studentid':
          aValue = a.id || '';
          bValue = b.id || '';
          break;
        case 'grade':
          aValue = a.grade_level || '';
          bValue = b.grade_level || '';
          break;
        case 'classname':
          aValue = a.class_name || '';
          bValue = b.class_name || '';
          break;
        case 'enrollment':
          aValue = a.enrollment_status || '';
          bValue = b.enrollment_status || '';
          break;
        case 'mastery':
          aValue = a.overall_mastery || 0;
          bValue = b.overall_mastery || 0;
          break;
        case 'attendance':
          aValue = a.attendance_rate || 0;
          bValue = b.attendance_rate || 0;
          break;
        case 'score':
          aValue = a.recent_quiz_score || 0;
          bValue = b.recent_quiz_score || 0;
          break;
        case 'risk':
          const riskOrder = { high: 0, medium: 1, low: 2 };
          aValue = riskOrder[a.risk_level as any] || 3;
          bValue = riskOrder[b.risk_level as any] || 3;
          break;
        case 'active':
          aValue = a.last_active ? new Date(a.last_active).getTime() : 0;
          bValue = b.last_active ? new Date(b.last_active).getTime() : 0;
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      // Handle numeric comparison
      if (aValue === bValue) return 0;
      const comparison = aValue < bValue ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const totalCount = students.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedStudents = students.slice(startIdx, endIdx);

    // Transform to match expected format
    const transformedStudents = paginatedStudents.map((student) => ({
      id: student.id,
      studentId: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      gradeLevel: student.grade_level,
      className: student.class_name,
      section: student.section,
      enrollmentStatus: student.enrollment_status,
      overallMastery: student.overall_mastery,
      attendanceRate: student.attendance_rate,
      recentQuizScore: student.recent_quiz_score,
      riskLevel: student.risk_level,
      lastActivityAt: student.last_active,
      parentName: student.parent_name,
      schoolName: student.school_name,
    }));

    return NextResponse.json(
      {
        students: transformedStudents,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to get students', { error });
    return NextResponse.json({ error: 'Failed to get students' }, { status: 500 });
  }
}
