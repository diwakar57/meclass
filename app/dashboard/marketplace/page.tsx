'use client';

/**
 * AI Course Marketplace page
 * Students browse, enroll, and review courses.
 * Teachers publish new courses.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Listing {
  id: string;
  title: string;
  description: string;
  creator_type: 'ai' | 'teacher';
  price_cents: number;
  avg_rating: number;
  review_count: number;
  enrollment_count: number;
  tags: string[] | string;
  thumbnail_url: string | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </span>
  );
}

function CourseCard({
  listing,
  onEnroll,
  enrolledIds,
}: {
  listing: Listing;
  onEnroll: (id: string) => void;
  enrolledIds: Set<string>;
}) {
  const tags = Array.isArray(listing.tags)
    ? listing.tags
    : (() => {
        try {
          return JSON.parse(listing.tags as string) as string[];
        } catch {
          return [];
        }
      })();

  const enrolled = enrolledIds.has(listing.id);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Thumbnail */}
      <div className="h-36 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl">
        {listing.creator_type === 'ai' ? '🤖' : '👩‍🏫'}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
            {listing.title}
          </h3>
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${listing.creator_type === 'ai' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}
          >
            {listing.creator_type === 'ai' ? 'AI' : 'Teacher'}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {listing.description}
        </p>

        <div className="flex items-center gap-2">
          <StarRating rating={listing.avg_rating} />
          <span className="text-xs text-gray-400">({listing.review_count})</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-auto">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {listing.price_cents === 0 ? 'Free' : `$${(listing.price_cents / 100).toFixed(2)}`}
          </span>
          <button
            onClick={() => onEnroll(listing.id)}
            disabled={enrolled}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              enrolled
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-default'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {enrolled ? '✓ Enrolled' : 'Enroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'ai' | 'teacher' | 'free'>('all');
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newListing, setNewListing] = useState({
    title: '',
    description: '',
    courseId: '',
    priceCents: 0,
    tags: '',
  });

  const isTeacher = user?.role === 'teacher' || user?.role === 'principal';

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (filter === 'ai') params.set('creatorType', 'ai');
      if (filter === 'teacher') params.set('creatorType', 'teacher');
      if (filter === 'free') params.set('maxPrice', '0');

      const res = await fetch(`/api/marketplace?${params}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
      }
    } catch (err) {
      console.error('Marketplace fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function handleEnroll(listingId: string) {
    try {
      const res = await fetch(`/api/marketplace/${listingId}/enroll`, { method: 'POST' });
      if (res.ok) {
        setEnrolledIds((prev) => new Set(prev).add(listingId));
      }
    } catch (err) {
      console.error('Enroll error:', err);
    }
  }

  async function handleCreateListing() {
    if (!newListing.title || !newListing.courseId) return;
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newListing,
          tags: newListing.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewListing({ title: '', description: '', courseId: '', priceCents: 0, tags: '' });
        fetchListings();
      }
    } catch (err) {
      console.error('Create listing error:', err);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Marketplace</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse AI-generated and teacher-created courses
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Publish Course
          </button>
        )}
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchListings()}
          placeholder="Search courses…"
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          {(['all', 'ai', 'teacher', 'free'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">📚</p>
          <p className="text-lg font-medium">No courses found</p>
          <p className="text-sm mt-1">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {listings.map((listing) => (
            <CourseCard
              key={listing.id}
              listing={listing}
              onEnroll={handleEnroll}
              enrolledIds={enrolledIds}
            />
          ))}
        </div>
      )}

      {/* Create listing modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Publish a Course to Marketplace
            </h2>

            {[
              { label: 'Course ID', key: 'courseId', placeholder: 'existing-course-id' },
              { label: 'Title', key: 'title', placeholder: 'Introduction to Algebra' },
              { label: 'Description', key: 'description', placeholder: 'Learn the basics…' },
              { label: 'Tags (comma-separated)', key: 'tags', placeholder: 'math, algebra, grade8' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {label}
                </label>
                <input
                  value={newListing[key as keyof typeof newListing] as string}
                  onChange={(e) =>
                    setNewListing((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Price (cents, 0 = free)
              </label>
              <input
                type="number"
                min={0}
                value={newListing.priceCents}
                onChange={(e) =>
                    setNewListing((prev) => ({ ...prev, priceCents: Number(e.target.value) || 0 }))
                  }
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreateListing}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Publish
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
