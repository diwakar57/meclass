'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('CreateTeacherCoursePage');

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CreateTeacherCoursePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    gradeId: '',
    subjectId: '',
    classId: '',
    startDate: todayDate(),
    endDate: plusDaysDate(90),
    syllabusId: '',
  });

  const canSubmit = useMemo(() => {
    if (!formData.title.trim()) return false;
    if (!formData.gradeId.trim()) return false;
    if (!formData.subjectId.trim()) return false;
    if (!formData.startDate || !formData.endDate) return false;
    return new Date(formData.startDate) < new Date(formData.endDate);
  }, [formData]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      setError('Please fill required fields and make sure end date is after start date.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/teacher/courses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          gradeId: formData.gradeId.trim(),
          subjectId: formData.subjectId.trim(),
          classId: formData.classId.trim() || undefined,
          syllabusId: formData.syllabusId.trim() || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create course');
      }

      router.push('/dashboard/teacher/courses');
      router.refresh();
    } catch (err) {
      log.error('Failed to create course', err);
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Create Course" subtitle="Set up a structured teaching course">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Required fields are marked with *.</p>
            <Link
              href="/dashboard/teacher/courses"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Back to Courses
            </Link>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Course Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Grade 7 Mathematics Foundation"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Add goals, outline, and outcomes for this course."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Grade ID *</label>
                <input
                  type="text"
                  value={formData.gradeId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gradeId: e.target.value }))}
                  placeholder="e.g., class-7"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Subject ID *</label>
                <input
                  type="text"
                  value={formData.subjectId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subjectId: e.target.value }))}
                  placeholder="e.g., math"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Class ID (optional)</label>
                <input
                  type="text"
                  value={formData.classId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, classId: e.target.value }))}
                  placeholder="e.g., class-7A"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Syllabus ID (optional)</label>
                <input
                  type="text"
                  value={formData.syllabusId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, syllabusId: e.target.value }))}
                  placeholder="Attach an existing syllabus"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">End Date *</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating...' : 'Create Course'}
              </button>
              <Link
                href="/dashboard/teacher/courses"
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </DashboardLayout>
  );
}
