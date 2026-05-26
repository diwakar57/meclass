'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherSyllabusPage');

interface SyllabusRecord {
  id: string;
  gradeId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
}

interface TopicDependency {
  dependsOnTopicId?: string;
  dependsOnTopicName?: string;
  dependsOnGradeId?: string;
}

interface TopicRecord {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  dependencies: TopicDependency[];
}

interface GenerateClassesResult {
  success: boolean;
  studentsProcessed: number;
  totalSessionsCreated: number;
  classCollections: Array<{
    studentId: string;
    displayName: string;
    totalSessions: number;
    estimatedCompletionWeeks: number;
    paceRecommendation: string;
  }>;
  errors: Array<{ studentId: string; error: string }>;
}

export default function TeacherSyllabusPage() {
  const router = useRouter();

  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [dependencyName, setDependencyName] = useState('');
  const [dependencyGradeId, setDependencyGradeId] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);

  const [syllabus, setSyllabus] = useState<SyllabusRecord | null>(null);
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [generatingClasses, setGeneratingClasses] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerateClassesResult | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<'simple' | 'core' | 'harsh'>('core');

  const canCreateSyllabus = useMemo(() => {
    return gradeId.trim() && subjectId.trim() && title.trim();
  }, [gradeId, subjectId, title]);

  async function createSyllabus(event: FormEvent) {
    event.preventDefault();
    if (!canCreateSyllabus) {
      setError('gradeId, subjectId and title are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await fetch('/api/syllabus', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeId: gradeId.trim(),
          subjectId: subjectId.trim(),
          title: title.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create syllabus');
      }

      setSyllabus(data.data);
      setMessage('Syllabus created successfully. You can now add ordered topics.');
      setTopics([]);
    } catch (err) {
      const value = err instanceof Error ? err.message : 'Failed to create syllabus';
      setError(value);
      log.error('Create syllabus failed', err);
    } finally {
      setLoading(false);
    }
  }

  async function addTopic(event: FormEvent) {
    event.preventDefault();
    if (!syllabus) {
      setError('Create a syllabus first.');
      return;
    }
    if (!topicTitle.trim()) {
      setError('Topic title is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const dependencies: TopicDependency[] = [];
      if (dependencyName.trim()) {
        dependencies.push({
          dependsOnTopicName: dependencyName.trim(),
          dependsOnGradeId: dependencyGradeId.trim() || undefined,
        });
      }

      const response = await fetch(`/api/syllabus/${syllabus.id}/topics`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topicTitle.trim(),
          description: topicDescription.trim() || undefined,
          orderIndex,
          dependencies,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add topic');
      }

      setMessage('Topic added successfully.');
      setTopicTitle('');
      setTopicDescription('');
      setDependencyName('');
      setDependencyGradeId('');
      setOrderIndex((prev) => prev + 1);
      await refreshTopics(syllabus.id);
    } catch (err) {
      const value = err instanceof Error ? err.message : 'Failed to add topic';
      setError(value);
      log.error('Add topic failed', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshTopics(syllabusId: string) {
    const response = await fetch(`/api/syllabus/${syllabusId}/topics`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch topics');
    }

    setTopics(data.data || []);
  }

  async function publishSyllabus() {
    if (!syllabus) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await fetch(`/api/syllabus/${syllabus.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published', changeNote: 'Published from teacher dashboard' }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish syllabus');
      }

      setSyllabus(data.data);
      setMessage('Syllabus published and versioned successfully.');
    } catch (err) {
      const value = err instanceof Error ? err.message : 'Failed to publish syllabus';
      setError(value);
      log.error('Publish syllabus failed', err);
    } finally {
      setLoading(false);
    }
  }

  async function generateClassesFromSyllabus() {
    if (!syllabus) {
      setError('Publish syllabus first.');
      return;
    }

    if (syllabus.status !== 'published') {
      setError('Syllabus must be published before generating classes.');
      return;
    }

    try {
      setGeneratingClasses(true);
      setError('');
      setGenerationResult(null);
      setMessage('Generating adaptive classes for all enrolled students...');

      const response = await fetch(`/api/teacher/syllabus/${syllabus.id}/generate-classes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: selectedPlanType,
          allowDefaultPlan: true,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate classes');
      }

      setGenerationResult(data);
      setMessage(
        `✓ Successfully generated classes for ${data.studentsProcessed} students with ${data.totalSessionsCreated} total sessions!`
      );
      log.info('Classes generated successfully', data);
    } catch (err) {
      const value = err instanceof Error ? err.message : 'Failed to generate classes';
      setError(value);
      log.error('Generate classes failed', err);
    } finally {
      setGeneratingClasses(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Syllabus Management</h1>
            <p className="text-sm text-slate-600 mt-1">
              Phase 1 workflow: create grade-subject syllabus, add ordered topics, publish versions.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/teacher')}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </button>
        </div>

        {message && <div className="rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        {error && <div className="rounded-md bg-rose-100 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <form onSubmit={createSyllabus} className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-medium text-slate-900">Create Syllabus</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={gradeId}
              onChange={(event) => setGradeId(event.target.value)}
              placeholder="gradeId"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              placeholder="subjectId"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Syllabus title"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !canCreateSyllabus}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Create Syllabus'}
          </button>
        </form>

        {syllabus && (
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-900">{syllabus.title}</h3>
                <p className="text-sm text-slate-600">
                  status: {syllabus.status} | version: {syllabus.version} | gradeId: {syllabus.gradeId} | subjectId: {syllabus.subjectId}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={publishSyllabus}
                  disabled={loading || topics.length === 0 || syllabus.status === 'published'}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Publish
                </button>
              </div>
            </div>

            {/* Class Generation Section */}
            {syllabus.status === 'published' && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-base font-semibold text-blue-900 mb-3">Generate Adaptive Classes</h4>
                  <p className="text-sm text-blue-800 mb-4">
                    Convert this syllabus into personalized learning classes for all enrolled students. Classes will be automatically
                    adapted to each student's learning pace and diagnostic profile.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Learning Pace Type</label>
                      <select
                        value={selectedPlanType}
                        onChange={(e) => setSelectedPlanType(e.target.value as 'simple' | 'core' | 'harsh')}
                        disabled={generatingClasses}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="core">Standard Pace (Recommended)</option>
                        <option value="simple">Slow Pace (Extended timeline)</option>
                        <option value="harsh">Fast Pace (Accelerated)</option>
                      </select>
                      <p className="text-xs text-slate-600 mt-1">
                        Classes will override this based on individual student diagnostics if available
                      </p>
                    </div>

                    <button
                      onClick={generateClassesFromSyllabus}
                      disabled={generatingClasses || loading}
                      className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {generatingClasses ? 'Generating... This may take a minute...' : '🚀 Generate Classes for All Students'}
                    </button>
                  </div>
                </div>

                {/* Generation Results */}
                {generationResult && (
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <h5 className="font-semibold text-slate-900 mb-3">Generation Results</h5>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded border border-slate-200 p-3">
                        <p className="text-xs text-slate-600">Students Processed</p>
                        <p className="text-2xl font-bold text-slate-900">{generationResult.studentsProcessed}</p>
                      </div>
                      <div className="bg-white rounded border border-slate-200 p-3">
                        <p className="text-xs text-slate-600">Total Classes Created</p>
                        <p className="text-2xl font-bold text-slate-900">{generationResult.totalSessionsCreated}</p>
                      </div>
                      <div className="bg-white rounded border border-slate-200 p-3">
                        <p className="text-xs text-slate-600">Errors</p>
                        <p className="text-2xl font-bold text-rose-600">{generationResult.errors.length}</p>
                      </div>
                    </div>

                    {generationResult.classCollections.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-slate-900 mb-2">Student Class Collections</h6>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {generationResult.classCollections.map((collection) => (
                            <div key={collection.studentId} className="bg-white rounded p-2 Border border-slate-200 text-sm">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-slate-900">{collection.displayName}</p>
                                  <p className="text-xs text-slate-600">
                                    {collection.totalSessions} classes • {collection.estimatedCompletionWeeks} weeks • {collection.paceRecommendation} pace
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {generationResult.errors.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h6 className="text-sm font-medium text-rose-900 mb-2">Errors ({generationResult.errors.length})</h6>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {generationResult.errors.map((err, idx) => (
                            <p key={idx} className="text-xs text-rose-700">
                              Student {err.studentId}: {err.error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={addTopic} className="space-y-3 border-t border-slate-200 pt-4">
              <h4 className="text-base font-medium text-slate-900">Add Topic</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={topicTitle}
                  onChange={(event) => setTopicTitle(event.target.value)}
                  placeholder="Topic title"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  value={orderIndex}
                  onChange={(event) => setOrderIndex(Number(event.target.value))}
                  placeholder="Order index"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={dependencyName}
                  onChange={(event) => setDependencyName(event.target.value)}
                  placeholder="Dependency topic name (optional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={dependencyGradeId}
                  onChange={(event) => setDependencyGradeId(event.target.value)}
                  placeholder="Dependency gradeId (optional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                value={topicDescription}
                onChange={(event) => setTopicDescription(event.target.value)}
                placeholder="Topic description"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-24"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Add Topic
              </button>
            </form>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-medium text-slate-900">Ordered Topics</h4>
                <button
                  onClick={() => refreshTopics(syllabus.id).catch((err) => setError(err.message))}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700"
                >
                  Refresh
                </button>
              </div>

              {topics.length === 0 ? (
                <p className="text-sm text-slate-600">No topics yet.</p>
              ) : (
                <ul className="space-y-2">
                  {topics.map((topic) => (
                    <li key={topic.id} className="rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">
                        {topic.orderIndex}. {topic.title}
                      </p>
                      {topic.description && <p className="text-sm text-slate-600 mt-1">{topic.description}</p>}
                      {topic.dependencies?.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          dependencies: {topic.dependencies.map((dep) => dep.dependsOnTopicName || dep.dependsOnTopicId).join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
