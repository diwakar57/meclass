/**
 * Marketplace Enroll API — POST /api/marketplace/[id]/enroll
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { MarketplaceService } from '@/lib/services/marketplace-service';
import type { AuthContext } from '@/lib/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withRole(
  ['student'],
  async (req: NextRequest, auth: AuthContext, ctx: RouteContext) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }
      const { id } = await ctx.params;
      const enrollment = await MarketplaceService.enrollStudent(id, auth.userId, auth.schoolId);
      return NextResponse.json({ success: true, enrollment }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to enroll';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  },
);
