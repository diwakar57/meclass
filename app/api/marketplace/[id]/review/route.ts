/**
 * Marketplace Review API — POST /api/marketplace/[id]/review
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { MarketplaceService } from '@/lib/services/marketplace-service';
import type { AuthContext } from '@/lib/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withRole(
  ['student', 'teacher'],
  async (req: NextRequest, auth: AuthContext, ctx: RouteContext) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json();
      const { rating, comment } = body;

      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 });
      }

      const review = await MarketplaceService.submitReview(id, auth.userId, rating, comment);
      return NextResponse.json({ success: true, review }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to submit review';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  },
);
