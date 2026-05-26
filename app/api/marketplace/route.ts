/**
 * Marketplace API — /api/marketplace
 *
 * GET  — search / browse listings
 * POST — create a new listing (teacher / AI)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { MarketplaceService } from '@/lib/services/marketplace-service';
import type { AuthContext } from '@/lib/types/auth';

// GET /api/marketplace — browse & search
export const GET = withRole(
  ['student', 'teacher', 'principal', 'admin', 'saas_admin'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      const url = new URL(req.url);
      const q = url.searchParams.get('q') ?? undefined;
      const creatorType = (url.searchParams.get('creatorType') ?? undefined) as
        | 'ai'
        | 'teacher'
        | undefined;
      const maxPrice = url.searchParams.get('maxPrice')
        ? parseInt(url.searchParams.get('maxPrice')!, 10)
        : undefined;
      const minRating = url.searchParams.get('minRating')
        ? parseFloat(url.searchParams.get('minRating')!)
        : undefined;
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100);
      const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
      const view = url.searchParams.get('view');

      if (view === 'recommendations' && auth.role === 'student') {
        const listings = await MarketplaceService.getRecommendations(auth.userId, limit);
        return NextResponse.json({ success: true, listings });
      }

      if (view === 'mine') {
        const listings = await MarketplaceService.getCreatorListings(auth.userId);
        return NextResponse.json({ success: true, listings });
      }

      const listings = await MarketplaceService.searchListings({
        query: q,
        creatorType,
        maxPriceCents: maxPrice,
        minRating,
        limit,
        offset,
      });

      return NextResponse.json({ success: true, listings });
    } catch (error) {
      console.error('Marketplace GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
    }
  },
);

// POST /api/marketplace — create listing
export const POST = withRole(
  ['teacher', 'principal', 'admin', 'saas_admin'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      const body = await req.json();
      const { courseId, title, description, thumbnailUrl, priceCents, tags } = body;

      if (!courseId || !title) {
        return NextResponse.json(
          { error: 'courseId and title are required' },
          { status: 400 },
        );
      }

      const listing = await MarketplaceService.createListing({
        course_id: courseId,
        school_id: auth.schoolId ?? null,
        creator_id: auth.userId,
        creator_type: 'teacher',
        title,
        description: description ?? '',
        thumbnail_url: thumbnailUrl ?? null,
        price_cents: priceCents ?? 0,
        tags: tags ?? [],
      });

      return NextResponse.json({ success: true, listing }, { status: 201 });
    } catch (error) {
      console.error('Marketplace POST error:', error);
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
    }
  },
);
