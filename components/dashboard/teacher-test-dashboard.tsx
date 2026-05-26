/**
 * TEACHER DASHBOARD - TEST ANALYTICS & CLASS INSIGHTS
 * 
 * Shows teachers class-wide test performance, readiness breakdown,
 * topic strengths/weaknesses, and students needing intervention
 */

'use client'

import React, { useState } from 'react'
import { createLogger } from '@/lib/logger'
import { TeacherTestDashboardData, ReadinessLevel } from '@/lib/types/test-attempts'

const logger = createLogger('TeacherTestDashboard')

// ============================================================================
// READINESS BREAKDOWN CHART
// ============================================================================

interface ReadinessBreakdownProps {
  breakdown: {
    ready: number
    overconfident: number
    underconfident: number
    supportRequired: number
  }
  total: number
}

function ReadinessBreakdown({ breakdown, total }: ReadinessBreakdownProps) {
  const toPercent = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-green-900">Ready to Advance</span>
          <span className="text-sm font-bold">{breakdown.ready} students</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full"
            style={{ width: `${toPercent(breakdown.ready)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-1">{toPercent(breakdown.ready)}%</p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-yellow-900">Build Confidence</span>
          <span className="text-sm font-bold">{breakdown.underconfident} students</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full"
            style={{ width: `${toPercent(breakdown.underconfident)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-1">{toPercent(breakdown.underconfident)}%</p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-orange-900">Review Needed</span>
          <span className="text-sm font-bold">{breakdown.overconfident} students</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-yellow-500 h-3 rounded-full"
            style={{ width: `${toPercent(breakdown.overconfident)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-1">{toPercent(breakdown.overconfident)}%</p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-red-900">Needs Support</span>
          <span className="text-sm font-bold">{breakdown.supportRequired} students</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-red-500 h-3 rounded-full"
            style={{ width: `${toPercent(breakdown.supportRequired)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-1">{toPercent(breakdown.supportRequired)}%</p>
      </div>
    </div>
  )
}

// ============================================================================
// TOPIC INSIGHTS
// ============================================================================

interface TopicTableProps {
  topics: Array<{
    topicName: string
    averagePerformance: number
    studentCount: number
  }>
  title: string
  icon: string
  color: string
}

function TopicTable({ topics, title, icon, color }: TopicTableProps) {
  return (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4`}>
      <h3 className={`font-bold text-${color}-900 mb-3`}>
        {icon} {title}
      </h3>
      <div className="space-y-3">
        {topics.length > 0 ? (
          topics.map((topic, idx) => (
            <div key={idx} className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className={`text-${color}-900 font-medium`}>{topic.topicName}</span>
                <span className="font-bold">{topic.averagePerformance}%</span>
              </div>
              <p className="text-xs text-gray-600">{topic.studentCount} students</p>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div
                  className={`bg-${color}-500 h-1 rounded-full`}
                  style={{ width: `${topic.averagePerformance}%` }}
                ></div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">No data available</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// STUDENT SUPPORT TABLE
// ============================================================================

interface StudentNeedingSupportTableProps {
  students: Array<{
    studentId: string
    studentName: string
    readinessLevel: ReadinessLevel
    averageScore: number
    primaryWeaknessTopics: string[]
  }>
}

function StudentNeedingSupportTable({ students }: StudentNeedingSupportTableProps) {
  const getReadinessIcon = (level: ReadinessLevel) => {
    switch (level) {
      case 'ready':
        return '✅'
      case 'underconfident':
        return 'ℹ️'
      case 'overconfident':
        return '⚠️'
      case 'support_required':
        return '🔴'
      default:
        return '❓'
    }
  }

  const getReadinessColor = (level: ReadinessLevel) => {
    switch (level) {
      case 'ready':
        return 'text-green-600'
      case 'underconfident':
        return 'text-blue-600'
      case 'overconfident':
        return 'text-yellow-600'
      case 'support_required':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Student</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Score</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Weak Areas</th>
          </tr>
        </thead>
        <tbody>
          {students.length > 0 ? (
            students.map((student) => (
              <tr key={student.studentId} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{student.studentName}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={getReadinessColor(student.readinessLevel)}>
                    {getReadinessIcon(student.readinessLevel)} {student.readinessLevel}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-bold">{student.averageScore}%</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {student.primaryWeaknessTopics.slice(0, 2).join(', ')}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-sm text-center text-gray-600">
                No students currently need intervention
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface TeacherTestDashboardProps {
  data?: TeacherTestDashboardData
  loading?: boolean
  error?: string
  classId?: string
}

export function TeacherTestDashboard({
  data,
  loading = false,
  error,
  classId,
}: TeacherTestDashboardProps) {
  const [filterReadiness, setFilterReadiness] = useState<ReadinessLevel | 'all'>('all')

  if (loading) {
    return <div className="p-4 text-center">Loading class analytics...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>
  }

  if (!data) {
    return <div className="p-4 text-center">No assessment data available</div>
  }

  const filteredStudents =
    filterReadiness === 'all'
      ? data.studentsNeedingSupport
      : data.studentsNeedingSupport.filter((s) => s.readinessLevel === filterReadiness)

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">Class Assessment Analytics</h1>
        <p className="text-purple-100">Monitor student readiness and performance gaps</p>
      </div>

      {/* KEY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-gray-600 text-sm">Class Average Score</p>
          <p className="text-3xl font-bold text-purple-600">{data.classAverageScore}%</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-gray-600 text-sm">Students Assessed</p>
          <p className="text-3xl font-bold text-blue-600">{data.studentCount}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-gray-600 text-sm">Needing Support</p>
          <p className="text-3xl font-bold text-red-600">{data.studentsNeedingSupport.length}</p>
        </div>
      </div>

      {/* READINESS BREAKDOWN */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Student Readiness Breakdown</h2>
        <ReadinessBreakdown
          breakdown={data.readinessBreakdown}
          total={data.studentCount}
        />
      </div>

      {/* TOPIC INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopicTable
          topics={data.topicStrengths}
          title="Topics with Strong Performance"
          icon="💪"
          color="green"
        />
        <TopicTable
          topics={data.topicWeaknesses}
          title="Topics Needing Intervention"
          icon="📚"
          color="orange"
        />
      </div>

      {/* STUDENTS NEEDING SUPPORT */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Students Needing Support</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterReadiness('all')}
              className={`px-3 py-1 text-xs rounded ${
                filterReadiness === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterReadiness('support_required')}
              className={`px-3 py-1 text-xs rounded ${
                filterReadiness === 'support_required'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Needs Support
            </button>
            <button
              onClick={() => setFilterReadiness('overconfident')}
              className={`px-3 py-1 text-xs rounded ${
                filterReadiness === 'overconfident'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Overconfident
            </button>
          </div>
        </div>

        <StudentNeedingSupportTable students={filteredStudents} />
      </div>

      {/* ACTION ITEMS */}
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
        <h3 className="font-bold text-indigo-900 mb-3">📋 Recommended Actions</h3>
        <ul className="space-y-2 text-sm text-indigo-800">
          {data.studentsNeedingSupport.length > 0 && (
            <li>
              → Prioritize intervention for {data.studentsNeedingSupport.length} student(s) showing
              low readiness
            </li>
          )}
          {data.topicWeaknesses.length > 0 && (
            <li>→ Review instruction for {data.topicWeaknesses[0]?.topicName} - weak across class</li>
          )}
          {data.readinessBreakdown.overconfident > 0 && (
            <li>→ Help {data.readinessBreakdown.overconfident} student(s) develop accurate self-assessment</li>
          )}
          {data.readinessBreakdown.underconfident > 0 && (
            <li>→ Provide encouragement to {data.readinessBreakdown.underconfident} student(s) performing well</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default TeacherTestDashboard
