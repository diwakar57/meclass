/**
 * STUDENT DASHBOARD - TEST ATTEMPTS & CONFIDENCE ANALYSIS
 * 
 * Shows student their test attempts, performance, and confidence analysis
 * Displays readiness level and recommendations for improvement
 */

'use client'

import React, { useState, useEffect } from 'react'
import { createLogger } from '@/lib/logger'
import {
  TestAttempt,
  ConfidenceAnalysis,
  ReadinessLevel,
  ConfidenceMismatchType,
  StudentTestDashboardData,
} from '@/lib/types/test-attempts'

const logger = createLogger('StudentTestDashboard')

// ============================================================================
// READINESS BADGE COMPONENT
// ============================================================================

interface ReadinessBadgeProps {
  level: ReadinessLevel
  mismatchType?: ConfidenceMismatchType
}

function ReadinessBadge({ level, mismatchType }: ReadinessBadgeProps) {
  const config = {
    ready: { color: 'bg-green-100 text-green-800', icon: '✅', label: 'Ready to Advance' },
    overconfident: {
      color: 'bg-yellow-100 text-yellow-800',
      icon: '⚠️',
      label: 'Review Needed',
    },
    underconfident: {
      color: 'bg-blue-100 text-blue-800',
      icon: 'ℹ️',
      label: 'Build Confidence',
    },
    support_required: {
      color: 'bg-red-100 text-red-800',
      icon: '🔴',
      label: 'Needs Support',
    },
  }

  const cfg = config[level]

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.color}`}>
      <span>{cfg.icon}</span>
      <span className="font-semibold">{cfg.label}</span>
    </div>
  )
}

// ============================================================================
// CONFIDENCE VS PERFORMANCE CHART
// ============================================================================

interface ConfidenceChartProps {
  confidence: number
  performance: number
  mismatchScore: number
}

function ConfidenceChart({ confidence, performance, mismatchScore }: ConfidenceChartProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Your Confidence</span>
          <span className="text-sm font-bold">{confidence}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${confidence}%` }}
          ></div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Actual Performance</span>
          <span className="text-sm font-bold">{performance}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${performance}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Calibration Gap:</strong> {mismatchScore}%
        </p>
        {mismatchScore <= 10 && <p className="text-xs text-green-600">✓ Well-calibrated</p>}
        {mismatchScore > 10 && confidence > performance && (
          <p className="text-xs text-yellow-600">You may be overestimating your knowledge</p>
        )}
        {mismatchScore > 10 && confidence < performance && (
          <p className="text-xs text-blue-600">You're performing better than you think!</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TOPIC PERFORMANCE GRID
// ============================================================================

interface TopicPerformanceGridProps {
  strongTopics: Array<{ topicId: string; topicName: string; performance: number }>
  weakTopics: Array<{ topicId: string; topicName: string; performance: number }>
}

function TopicPerformanceGrid({ strongTopics, weakTopics }: TopicPerformanceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="font-bold text-green-900 mb-3">💪 Your Strengths</h3>
        <ul className="space-y-2">
          {strongTopics.length > 0 ? (
            strongTopics.map((topic) => (
              <li key={topic.topicId} className="text-sm">
                <div className="flex justify-between items-center">
                  <span>{topic.topicName}</span>
                  <span className="font-bold text-green-600">{topic.performance}%</span>
                </div>
              </li>
            ))
          ) : (
            <p className="text-sm text-gray-600">No strong topics yet</p>
          )}
        </ul>
      </div>

      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h3 className="font-bold text-orange-900 mb-3">📚 Areas to Improve</h3>
        <ul className="space-y-2">
          {weakTopics.length > 0 ? (
            weakTopics.map((topic) => (
              <li key={topic.topicId} className="text-sm">
                <div className="flex justify-between items-center">
                  <span>{topic.topicName}</span>
                  <span className="font-bold text-orange-600">{topic.performance}%</span>
                </div>
              </li>
            ))
          ) : (
            <p className="text-sm text-gray-600">No weak topics</p>
          )}
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// RECOMMENDATIONS PANEL
// ============================================================================

interface RecommendationsProps {
  actions: string[]
}

function Recommendations({ actions }: RecommendationsProps) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
      <h3 className="font-bold text-blue-900 mb-3">💡 Recommended Next Steps</h3>
      <ul className="space-y-2">
        {actions.map((action, idx) => (
          <li key={idx} className="text-sm text-blue-800 flex gap-2">
            <span className="text-lg">→</span>
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// TEST ATTEMPT CARD
// ============================================================================

interface TestAttemptCardProps {
  attempt: TestAttempt
  analysis?: ConfidenceAnalysis
  onSelect: (attemptId: string) => void
}

function TestAttemptCard({ attempt, analysis, onSelect }: TestAttemptCardProps) {
  const date = new Date(attempt.startedAt).toLocaleDateString()
  const scoreColor =
    attempt.percentageScore >= 80
      ? 'text-green-600'
      : attempt.percentageScore >= 70
        ? 'text-yellow-600'
        : 'text-red-600'

  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition"
      onClick={() => onSelect(attempt.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-bold">{attempt.testName}</h4>
          <p className="text-sm text-gray-600">{date}</p>
        </div>
        <span className={`text-2xl font-bold ${scoreColor}`}>{attempt.percentageScore}%</span>
      </div>

      <div className="text-sm text-gray-700 mb-3">
        {attempt.totalQuestionsCorrect}/{attempt.totalQuestionsAnswered} correct
      </div>

      {analysis && (
        <div className="flex justify-between items-center">
          <ReadinessBadge level={analysis.readinessLevel} />
          <span className="text-xs text-gray-600">{analysis.confidenceMismatchType}</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface StudentTestDashboardProps {
  data?: StudentTestDashboardData
  loading?: boolean
  error?: string
}

export function StudentTestDashboard({
  data,
  loading = false,
  error,
}: StudentTestDashboardProps) {
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<ConfidenceAnalysis | null>(null)

  useEffect(() => {
    if (selectedAttemptId && data?.recentAttempts) {
      const attempt = data.recentAttempts.find((a) => a.id === selectedAttemptId)
      if (attempt) {
        // Fetch analysis for this attempt
        fetchAnalysis(selectedAttemptId)
      }
    }
  }, [selectedAttemptId])

  async function fetchAnalysis(attemptId: string) {
    try {
      const response = await fetch(`/api/test-attempts/${attemptId}/analyze`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        setSelectedAnalysis(result.data)
      }
    } catch (err) {
      logger.error('Error fetching analysis', { error: err })
    }
  }

  if (loading) {
    return <div className="p-4 text-center">Loading test data...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>
  }

  if (!data) {
    return <div className="p-4 text-center">No test data available</div>
  }

  const latestAnalysis = data.confidenceAnalysis.lastAnalysis

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">Your Assessment Performance</h1>
        <p className="text-blue-100">Track your growth and confidence calibration</p>
      </div>

      {/* OVERALL STATISTICS */}
      {latestAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-gray-600 text-sm">Current Score</p>
            <p className="text-3xl font-bold text-blue-600">{latestAnalysis.overallPerformance}%</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-gray-600 text-sm">Your Confidence</p>
            <p className="text-3xl font-bold text-purple-600">{latestAnalysis.overallConfidence}%</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-gray-600 text-sm">Tests Taken</p>
            <p className="text-3xl font-bold text-green-600">{data.recentAttempts.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-gray-600 text-sm">Confidence Trend</p>
            <p className="text-lg font-bold">
              {data.confidenceAnalysis.trend === 'improving' && '📈 Improving'}
              {data.confidenceAnalysis.trend === 'declining' && '📉 Declining'}
              {data.confidenceAnalysis.trend === 'stable' && '➡️ Stable'}
            </p>
          </div>
        </div>
      )}

      {/* READINESS ASSESSMENT */}
      {latestAnalysis && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Readiness Assessment</h2>
          <div className="flex justify-between items-center mb-4">
            <ReadinessBadge
              level={latestAnalysis.readinessLevel}
              mismatchType={latestAnalysis.confidenceMismatchType}
            />
            <span className="text-gray-600">{latestAnalysis.mismatchAnalysis.explanation}</span>
          </div>
          <p className="text-gray-700">{latestAnalysis.readinessAssessment.explanation}</p>
        </div>
      )}

      {/* CONFIDENCE VS PERFORMANCE */}
      {latestAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Confidence Calibration</h2>
            <ConfidenceChart
              confidence={latestAnalysis.overallConfidence}
              performance={latestAnalysis.overallPerformance}
              mismatchScore={latestAnalysis.overallMismatchScore}
            />
          </div>

          {/* RECOMMENDATIONS */}
          {latestAnalysis.readinessAssessment.recommendedActions.length > 0 && (
            <div>
              <Recommendations
                actions={latestAnalysis.readinessAssessment.recommendedActions}
              />
            </div>
          )}
        </div>
      )}

      {/* TOPIC PERFORMANCE */}
      {latestAnalysis && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Topic Performance Analysis</h2>
          <TopicPerformanceGrid
            strongTopics={latestAnalysis.strongTopics}
            weakTopics={latestAnalysis.weakTopics}
          />
        </div>
      )}

      {/* RECENT ATTEMPTS */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Recent Test Attempts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recentAttempts.map((attempt) => (
            <TestAttemptCard
              key={attempt.id}
              attempt={attempt}
              analysis={selectedAttemptId === attempt.id ? selectedAnalysis || undefined : undefined}
              onSelect={setSelectedAttemptId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default StudentTestDashboard
