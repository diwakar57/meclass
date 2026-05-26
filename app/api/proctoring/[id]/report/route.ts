/**
 * Proctoring Report API — GET/POST /api/proctoring/[id]/report
 *
 * POST — end session and generate integrity report
 * GET  — retrieve existing report
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { ProctoringService } from '@/lib/services/proctoring-service';
import type { AuthContext } from '@/lib/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

// POST — end session & generate report
export const POST = withRole(
  ['student', 'teacher', 'principal', 'admin'],
  async (req: NextRequest, auth: AuthContext, ctx: RouteContext) => {
    try {
      const { id } = await ctx.params;
      const report = await ProctoringService.endSession(id);
      return NextResponse.json({ success: true, report });
    } catch (error) {
      console.error('End proctoring session error:', error);
      return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
    }
  },
);

// GET — retrieve report
export const GET = withRole(
  ['teacher', 'principal', 'admin'],
  async (req: NextRequest, auth: AuthContext, ctx: RouteContext) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }
      const { id } = await ctx.params;
      const report = await ProctoringService.getReport(id, auth.schoolId);
      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    } catch (error) {
      console.error('Get proctoring report error:', error);
      return NextResponse.json({ error: 'Failed to retrieve report' }, { status: 500 });
    }
  },
);
