'use client';

/**
 * Step4ReviewPlan Component
 * Review generated learning plan
 */

import React from 'react';

interface Step4Props {
  diagnosticScore: number | null;
  onComplete: () => void;
  loading: boolean;
}

export default function Step4ReviewPlan({
  diagnosticScore,
  onComplete,
  loading,
}: Step4Props) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Learning Plan</h2>
      <p className="text-gray-600 mb-6">
        We've created a personalized learning plan based on your assessment
      </p>

      {diagnosticScore !== null && (
        <div className="mb-8 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 text-sm mb-1">Diagnostic Test Score</p>
              <p className="text-3xl font-bold text-indigo-600">{diagnosticScore}%</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Status</p>
              <p className="text-xl font-semibold text-gray-900">
                {diagnosticScore >= 80
                  ? '✓ Strong Foundation'
                  : diagnosticScore >= 60
                    ? '→ Good Progress'
                    : '⚠ Needs Support'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personalization Summary */}
      <div className="space-y-6 mb-8">
        <div className="border-l-4 border-indigo-600 pl-4 py-2">
          <h3 className="font-semibold text-gray-900 mb-2">✓ What We Found</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li>• We've identified your learning pace and style preferences</li>
            <li>• Created a personalized sequence of topics for your grade level</li>
            <li>• Included review topics to strengthen foundation knowledge</li>
            <li>• Scheduled classes based on optimal learning patterns</li>
          </ul>
        </div>

        <div className="border-l-4 border-green-600 pl-4 py-2">
          <h3 className="font-semibold text-gray-900 mb-2">📚 Your Plan Includes</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li>• Grade-appropriate core curriculum topics</li>
            <li>• Prerequisite review for challenging concepts</li>
            <li>• Interactive lessons and practice sessions</li>
            <li>• Regular assessments to track progress</li>
            <li>• Personalized teaching tips based on your learning style</li>
          </ul>
        </div>

        <div className="border-l-4 border-blue-600 pl-4 py-2">
          <h3 className="font-semibold text-gray-900 mb-2">🎯 Next Steps</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li>• Complete your first lesson when authorized by your teacher</li>
            <li>• Take quizzes to assess understanding</li>
            <li>• Share your progress with parents and teachers</li>
            <li>• Adjust your learning preferences as you go</li>
          </ul>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={onComplete}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
      >
        {loading ? 'Finalizing Your Plan...' : 'Start Learning'}
      </button>

      <p className="text-center text-gray-500 text-sm mt-4">
        You can adjust your learning plan preferences anytime from your dashboard
      </p>
    </div>
  );
}
