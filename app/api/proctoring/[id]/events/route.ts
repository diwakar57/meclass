/**
 * Proctoring Events API — POST /api/proctoring/[id]/events
 * Accepts a batch of behavioral events from the client proctoring widget.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { ProctoringService } from '@/lib/services/proctoring-service';
import type { AuthContext } from '@/lib/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withRole(
  ['student'],
  async (req: NextRequest, auth: AuthContext, ctx: RouteContext) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json();
      const { events } = body;

      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json({ error: 'events array is required' }, { status: 400 });
      }

      if (events.length > 100) {
        return NextResponse.json({ error: 'Max 100 events per batch' }, { status: 400 });
      }

      const enriched = events.map((e: Record<string, unknown>) => ({
        session_id: id,
        event_type: e.event_type,
        severity: e.severity ?? 'low',
        details: (e.details as Record<string, unknown>) ?? {},
        occurred_at: (e.occurred_at as string) ?? new Date().toISOString(),
      }));

      await ProctoringService.recordBatchEvents(enriched);
      return NextResponse.json({ success: true, processed: enriched.length });
    } catch (error) {
      console.error('Proctoring events error:', error);
      return NextResponse.json({ error: 'Failed to record events' }, { status: 500 });
    }
  },
);
