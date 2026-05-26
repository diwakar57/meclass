import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { appendAuditLog } from '@/lib/services/audit-service';

export const POST = withRole(
  ['student'],
  async (req: NextRequest, auth: AuthContext, context?: { params?: Promise<{ assignmentId: string }> }) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const params = await context?.params;
    const assignmentId = params?.assignmentId;

    if (!assignmentId) {
      return NextResponse.json({ success: false, error: 'assignmentId is required' }, { status: 400 });
    }

    let notes = '';
    let fileName: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const notesRaw = form.get('notes');
      notes = typeof notesRaw === 'string' ? notesRaw.trim() : '';
      const file = form.get('file');
      if (file && typeof file !== 'string') {
        fileName = file.name || null;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
      fileName = typeof body?.fileName === 'string' ? body.fileName : null;
    }

    const assignmentResult = await query(
      `SELECT a.id, a.class_id
       FROM assignments a
       JOIN class_enrollments ce ON ce.class_id = a.class_id AND ce.student_id = $2
       WHERE a.id = $3
         AND a.school_id = $1
       LIMIT 1`,
      [auth.schoolId, auth.userId, assignmentId]
    );

    if ((assignmentResult.rowCount || 0) === 0) {
      return NextResponse.json({ success: false, error: 'Assignment not found in your enrolled courses' }, { status: 404 });
    }

    const feedbackPayload = JSON.stringify({
      notes,
      fileName,
      submittedVia: contentType.includes('multipart/form-data') ? 'dropbox-upload' : 'manual',
    });

    await query(
      `INSERT INTO assignment_submissions
        (id, assignment_id, school_id, student_id, status, submitted_at, feedback, updated_at)
       VALUES
        ($1, $2, $3, $4, 'submitted', CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET
         status = 'submitted',
         submitted_at = CURRENT_TIMESTAMP,
         feedback = EXCLUDED.feedback,
         updated_at = CURRENT_TIMESTAMP`,
      [randomUUID(), assignmentId, auth.schoolId, auth.userId, feedbackPayload]
    );

    await appendAuditLog({
      schoolId: auth.schoolId,
      userId: auth.userId,
      action: 'assignment_submit',
      resourceType: 'assignment_submission',
      resourceId: assignmentId,
      changes: {
        assignmentId,
        notesLength: notes.length,
        fileName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        assignmentId,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      },
    });
  }
);
