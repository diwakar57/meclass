/**
 * MarketplaceService
 *
 * Handles the AI-generated course marketplace:
 *   - Listing and publishing courses
 *   - Browsing, search, and recommendations
 *   - Student enrollment / purchase flow
 *   - Ratings & reviews
 *   - Revenue tracking
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('MarketplaceService');

// ─── Types ──────────────────────────────────────────────────────────────────

export type MarketplaceListingStatus = 'draft' | 'published' | 'archived';

export interface MarketplaceListing {
  id: string;
  course_id: string;
  school_id: string | null; // null = platform-wide
  creator_id: string;
  creator_type: 'ai' | 'teacher';
  title: string;
  description: string;
  thumbnail_url: string | null;
  price_cents: number; // 0 = free
  currency: string;
  tags: string[];
  avg_rating: number;
  review_count: number;
  enrollment_count: number;
  status: MarketplaceListingStatus;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceReview {
  id: string;
  listing_id: string;
  reviewer_id: string;
  rating: number; // 1–5
  comment: string | null;
  created_at: string;
}

export interface MarketplaceEnrollment {
  id: string;
  listing_id: string;
  student_id: string;
  school_id: string;
  paid_cents: number;
  enrolled_at: string;
  progress_pct: number;
  completed_at: string | null;
}

export interface CreateListingInput {
  course_id: string;
  school_id?: string | null;
  creator_id: string;
  creator_type: 'ai' | 'teacher';
  title: string;
  description: string;
  thumbnail_url?: string | null;
  price_cents?: number;
  currency?: string;
  tags?: string[];
}

export interface ListingSearchOptions {
  query?: string;
  tags?: string[];
  maxPriceCents?: number;
  minRating?: number;
  creatorType?: 'ai' | 'teacher';
  status?: MarketplaceListingStatus;
  limit?: number;
  offset?: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class MarketplaceService {
  /**
   * Publish (or draft) a course to the marketplace.
   */
  static async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    const {
      course_id,
      school_id,
      creator_id,
      creator_type,
      title,
      description,
      thumbnail_url,
      price_cents = 0,
      currency = 'USD',
      tags = [],
    } = input;

    const result = await query<MarketplaceListing>(
      `INSERT INTO marketplace_listings
         (course_id, school_id, creator_id, creator_type, title, description,
          thumbnail_url, price_cents, currency, tags, avg_rating, review_count,
          enrollment_count, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,0,'draft',NOW(),NOW())
       RETURNING *`,
      [
        course_id,
        school_id ?? null,
        creator_id,
        creator_type,
        title,
        description,
        thumbnail_url ?? null,
        price_cents,
        currency,
        JSON.stringify(tags),
      ],
    );

    logger.info('Marketplace listing created', { listingId: result.rows[0].id });
    return result.rows[0];
  }

  /**
   * Publish a draft listing.
   */
  static async publishListing(listingId: string, creatorId: string): Promise<MarketplaceListing> {
    const result = await query<MarketplaceListing>(
      `UPDATE marketplace_listings
       SET status = 'published', updated_at = NOW()
       WHERE id = $1 AND creator_id = $2 AND status = 'draft'
       RETURNING *`,
      [listingId, creatorId],
    );

    if (!result.rows[0]) throw new Error('Listing not found or already published');
    logger.info('Marketplace listing published', { listingId });
    return result.rows[0];
  }

  /**
   * Search / browse the marketplace.
   */
  static async searchListings(opts: ListingSearchOptions = {}): Promise<MarketplaceListing[]> {
    const conditions: string[] = ["status = 'published'"];
    const values: unknown[] = [];
    let idx = 1;

    if (opts.query) {
      conditions.push(
        `(title ILIKE $${idx} OR description ILIKE $${idx})`,
      );
      values.push(`%${opts.query}%`);
      idx++;
    }

    if (opts.creatorType) {
      conditions.push(`creator_type = $${idx++}`);
      values.push(opts.creatorType);
    }

    if (opts.maxPriceCents !== undefined) {
      conditions.push(`price_cents <= $${idx++}`);
      values.push(opts.maxPriceCents);
    }

    if (opts.minRating !== undefined) {
      conditions.push(`avg_rating >= $${idx++}`);
      values.push(opts.minRating);
    }

    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = opts.offset ?? 0;

    const result = await query<MarketplaceListing>(
      `SELECT * FROM marketplace_listings
       WHERE ${conditions.join(' AND ')}
       ORDER BY enrollment_count DESC, avg_rating DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    );

    return result.rows;
  }

  /**
   * Get a single listing by ID.
   */
  static async getListing(listingId: string): Promise<MarketplaceListing | null> {
    const result = await query<MarketplaceListing>(
      `SELECT * FROM marketplace_listings WHERE id = $1`,
      [listingId],
    );
    return result.rows[0] ?? null;
  }

  /**
   * Enroll a student in a marketplace course (free or paid).
   */
  static async enrollStudent(
    listingId: string,
    studentId: string,
    schoolId: string,
  ): Promise<MarketplaceEnrollment> {
    // Check not already enrolled
    const existing = await query<MarketplaceEnrollment>(
      `SELECT id FROM marketplace_enrollments WHERE listing_id = $1 AND student_id = $2`,
      [listingId, studentId],
    );
    if (existing.rows[0]) throw new Error('Student already enrolled');

    const listing = await this.getListing(listingId);
    if (!listing) throw new Error('Listing not found');

    const result = await query<MarketplaceEnrollment>(
      `INSERT INTO marketplace_enrollments
         (listing_id, student_id, school_id, paid_cents, enrolled_at, progress_pct)
       VALUES ($1,$2,$3,$4,NOW(),0)
       RETURNING *`,
      [listingId, studentId, schoolId, listing.price_cents],
    );

    // Increment enrollment count
    await query(
      `UPDATE marketplace_listings
       SET enrollment_count = enrollment_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [listingId],
    );

    logger.info('Student enrolled in marketplace course', { listingId, studentId });
    return result.rows[0];
  }

  /**
   * Submit a rating & review.
   */
  static async submitReview(
    listingId: string,
    reviewerId: string,
    rating: number,
    comment?: string,
  ): Promise<MarketplaceReview> {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

    const result = await query<MarketplaceReview>(
      `INSERT INTO marketplace_reviews (listing_id, reviewer_id, rating, comment, created_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (listing_id, reviewer_id)
       DO UPDATE SET rating = $3, comment = $4
       RETURNING *`,
      [listingId, reviewerId, rating, comment ?? null],
    );

    // Recompute avg_rating
    await query(
      `UPDATE marketplace_listings ml
       SET avg_rating = (
         SELECT ROUND(AVG(rating)::numeric, 2)
         FROM marketplace_reviews WHERE listing_id = ml.id
       ),
       review_count = (
         SELECT COUNT(*) FROM marketplace_reviews WHERE listing_id = ml.id
       ),
       updated_at = NOW()
       WHERE ml.id = $1`,
      [listingId],
    );

    return result.rows[0];
  }

  /**
   * AI-powered personalized recommendations for a student.
   * Uses enrollment history + tags to suggest relevant courses.
   */
  static async getRecommendations(
    studentId: string,
    limit = 5,
  ): Promise<MarketplaceListing[]> {
    // Find tags from courses the student has already enrolled in
    const enrolledTags = await query<{ tags: string }>(
      `SELECT ml.tags
       FROM marketplace_enrollments me
       JOIN marketplace_listings ml ON ml.id = me.listing_id
       WHERE me.student_id = $1`,
      [studentId],
    );

    const tagSet = new Set<string>();
    for (const row of enrolledTags.rows) {
      try {
        const parsed = JSON.parse(row.tags) as string[];
        parsed.forEach((t) => tagSet.add(t));
      } catch {
        // ignore parse errors
      }
    }

    if (tagSet.size === 0) {
      // Fall back to most popular courses
      return this.searchListings({ limit });
    }

    const tags = Array.from(tagSet);
    const result = await query<MarketplaceListing>(
      `SELECT ml.*
       FROM marketplace_listings ml
       WHERE ml.status = 'published'
         AND ml.id NOT IN (
           SELECT listing_id FROM marketplace_enrollments WHERE student_id = $1
         )
         AND ml.tags::jsonb ?| $2
       ORDER BY ml.avg_rating DESC, ml.enrollment_count DESC
       LIMIT $3`,
      [studentId, tags, limit],
    );

    return result.rows;
  }

  /**
   * Get listings created by a specific teacher or AI.
   */
  static async getCreatorListings(creatorId: string): Promise<MarketplaceListing[]> {
    const result = await query<MarketplaceListing>(
      `SELECT * FROM marketplace_listings WHERE creator_id = $1 ORDER BY created_at DESC`,
      [creatorId],
    );
    return result.rows;
  }
}
