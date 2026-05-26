/**
 * /app/dashboard/student/learning-plan/page.tsx
 * Student learning plan view
 */

'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

interface LearningPlan {
  id: string;
  courseId: string;
  courseTitle: string;
  status: string;
  startDate: Date;
  projectedCompletionDate: Date;
  originalSyllabus: any[];
  personalizedSyllabus: {
    remediationTopics: any[];
    mainTopics: any[];
  };
  learningProfile: any;
  nextClass?: any;
  progress: {
    totalTopics: number;
    completedTopics: number;
    percentComplete: number;
  };
}

export default function StudentLearningPlanPage() {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLearningPlan();
  }, []);

  const loadLearningPlan = async () => {
    try {
      const res = await fetch('/api/student/learning-plan', {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load learning plan');
      }

      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="text-center py-10">Loading your learning plan...</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><div className="text-center text-red-600 py-10">{error}</div></DashboardLayout>;
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-10">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-900">
              Your learning plan is being created. Please check back soon!
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{plan.courseTitle}</h1>
          <p className="text-gray-600 mt-2">Your personalized learning plan</p>
        </div>

        {/* Progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-2">Progress</p>
            <div className="mb-2">
              <p className="text-3xl font-bold text-indigo-600">{plan.progress.percentComplete}%</p>
              <p className="text-sm text-gray-600">{plan.progress.completedTopics}/{plan.progress.totalTopics} completed</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${plan.progress.percentComplete}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-2">Timeline</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(plan.projectedCompletionDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">Projected completion</p>
          </div>

          {plan.nextClass && (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm mb-2">Next Class</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(plan.nextClass.scheduledDate).toLocaleDateString()}
              </p>
              <button className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
                Join Class →
              </button>
            </div>
          )}
        </div>

        {/* Syllabus Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Syllabus */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Teacher Syllabus</h2>
            <div className="space-y-2">
              {plan.originalSyllabus.slice(0, 5).map((topic: any, idx) => (
                <div key={idx} className="flex items-start">
                  <span className="text-gray-400 mr-3">•</span>
                  <div>
                    <p className="font-medium text-gray-900">{topic.title}</p>
                    <p className="text-sm text-gray-600">{topic.estimatedSessions} sessions</p>
                  </div>
                </div>
              ))}
              {plan.originalSyllabus.length > 5 && (
                <p className="text-sm text-indigo-600">+{plan.originalSyllabus.length - 5} more topics</p>
              )}
            </div>
          </div>

          {/* Personalized Syllabus */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Plan</h2>
            
            {plan.personalizedSyllabus.remediationTopics.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-amber-700 mb-3">Reinforcement Topics</h3>
                <div className="space-y-2">
                  {plan.personalizedSyllabus.remediationTopics.map((topic: any, idx) => (
                    <div key={`rem-${idx}`} className="flex items-start bg-amber-50 p-2 rounded">
                      <span className="text-amber-600 mr-2">⚡</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{topic.title}</p>
                        <p className="text-xs text-gray-600">{topic.estimatedDays} days</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-green-700 mb-3">Main Topics</h3>
              <div className="space-y-2">
                {plan.personalizedSyllabus.mainTopics.slice(0, 3).map((topic: any, idx) => (
                  <div key={`main-${idx}`} className="flex items-start bg-green-50 p-2 rounded">
                    <span className="text-green-600 mr-2">✓</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{topic.title}</p>
                      <p className="text-xs text-gray-600">Difficulty: {topic.adjustedDifficulty}/10</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Learning Style */}
        {plan.learningProfile && (
          <div className="mt-8 bg-indigo-50 rounded-lg shadow p-6 border border-indigo-200">
            <h2 className="text-xl font-bold text-indigo-900 mb-4">Your Learning Profile</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-700">Pace</p>
                <p className="text-lg text-indigo-900 capitalize">{plan.learningProfile.paceType}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-700">Style</p>
                <p className="text-lg text-indigo-900 capitalize">{plan.learningProfile.preferredStyle}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-700">Teaching</p>
                <p className="text-lg text-indigo-900 capitalize">{plan.learningProfile.recommendedTeachingStyle.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-700">Mistake Type</p>
                <p className="text-lg text-indigo-900 capitalize">{plan.learningProfile.mistakeType}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
