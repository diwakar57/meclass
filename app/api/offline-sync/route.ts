/**
 * Offline Sync API — /api/offline-sync
 *
 * POST — upload a batch of offline records to be synced
 * GET  — retrieve server-side sync state for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { OfflineSyncService } from '@/lib/services/offline-sync-service';
import type { AuthContext } from '@/lib/types/auth';

// POST /api/offline-sync — upload offline records
export const POST = withRole(
  ['student', 'teacher'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      const body = await req.json();
      const { records } = body;

      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json({ error: 'records array is required' }, { status: 400 });
      }

      if (records.length > 500) {
        return NextResponse.json(
          { error: 'Maximum 500 records per sync batch' },
          { status: 400 },
        );
      }

      const report = await OfflineSyncService.syncBatch(records, auth.userId);
      return NextResponse.json({ success: true, report });
    } catch (error) {
      console.error('Offline sync POST error:', error);
      return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
  },
);

// GET /api/offline-sync — get sync state
export const GET = withRole(
  ['student', 'teacher'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }

      const syncState = await OfflineSyncService.getStudentSyncState(auth.userId, auth.schoolId);
      return NextResponse.json({ success: true, ...syncState });
    } catch (error) {
      console.error('Offline sync GET error:', error);
      return NextResponse.json({ error: 'Failed to retrieve sync state' }, { status: 500 });
    }
  },
);
