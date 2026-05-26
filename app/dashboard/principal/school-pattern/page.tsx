'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/lib/contexts/AuthContext';

type AIWorkflow = 'adaptive' | 'diagnostic' | 'plan' | 'session-plan' | 'classroom-runtime';

type ApiState = {
  loading: boolean;
  error: string | null;
  result: unknown | null;
};

type PlanType = 'simple' | 'core' | 'harsh';
type LearnAIStyle = 'visual' | 'step_by_step' | 'story' | 'practice_focused';
type LearnAIDifficulty = 'easy' | 'medium' | 'hard';
type RuntimeStyle = 'friendly' | 'strict' | 'storytelling' | 'socratic';

interface SchoolFeature {
  name: string;
  description: string;
  href: string;
  status: 'live' | 'ai-enabled';
}

interface SchoolFeatureGroup {
  title: string;
  icon: string;
  features: SchoolFeature[];
}

const SCHOOL_FEATURE_GROUPS: SchoolFeatureGroup[] = [
  {
    title: 'Academic Core',
    icon: '📚',
    features: [
      {
        name: 'Attendance Control Room',
        description: 'Daily attendance, class trends, and absentee alerts.',
        href: '/dashboard/principal/attendance',
        status: 'live',
      },
      {
        name: 'Teacher Gradebooks',
        description: 'Performance tracking, grading coverage, and quality checks.',
        href: '/dashboard/teacher/grades',
        status: 'live',
      },
      {
        name: 'Exams and Assessments',
        description: 'Exam scheduling, publishing, and outcomes analysis.',
        href: '/dashboard/teacher/exams',
        status: 'live',
      },
      {
        name: 'Learning Progress',
        description: 'Student mastery, quiz history, and intervention points.',
        href: '/dashboard/student/progress',
        status: 'live',
      },
    ],
  },
  {
    title: 'Operations and Admin',
    icon: '🏫',
    features: [
      {
        name: 'Staff Management',
        description: 'Hiring, role updates, and staff analytics.',
        href: '/dashboard/principal/staff',
        status: 'live',
      },
      {
        name: 'Admissions and Enrollment',
        description: 'Enrollment pipeline, approvals, and conversion tracking.',
        href: '/dashboard/enrollment',
        status: 'live',
      },
      {
        name: 'Timetable and Schedule',
        description: 'School-wide scheduling and event planning.',
        href: '/dashboard/schedule',
        status: 'live',
      },
      {
        name: 'Resources Library',
        description: 'Teaching assets, popular resources, and downloads.',
        href: '/dashboard/resources',
        status: 'live',
      },
    ],
  },
  {
    title: 'Finance and Engagement',
    icon: '💬',
    features: [
      {
        name: 'Fee Structures',
        description: 'Recurring fee models, grade applicability, and revisions.',
        href: '/dashboard/principal/fees',
        status: 'live',
      },
      {
        name: 'Payments and Recovery',
        description: 'Collections, payment retries, and receipt control.',
        href: '/dashboard/principal/payments',
        status: 'live',
      },
      {
        name: 'Parent Communication Hub',
        description: 'Direct communication threads and response tracking.',
        href: '/dashboard/communications',
        status: 'live',
      },
      {
        name: 'AI Intervention Studio',
        description: 'AI-supported diagnostics, plans, and personalized sessions.',
        href: '/dashboard/principal/school-pattern',
        status: 'ai-enabled',
      },
    ],
  },
];

function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function PrincipalSchoolPatternPage() {
  const { user } = useAuth();

  const [activeWorkflow, setActiveWorkflow] = useState<AIWorkflow>('adaptive');
  const [apiState, setApiState] = useState<ApiState>({
    loading: false,
    error: null,
    result: null,
  });

  const [adaptiveSubject, setAdaptiveSubject] = useState('Mathematics');
  const [adaptivePlanType, setAdaptivePlanType] = useState<PlanType>('core');
  const [adaptiveSyllabusText, setAdaptiveSyllabusText] = useState(
    'Module 1: Number Systems\n- Integers\n- Rational Numbers\nModule 2: Algebra\n- Expressions\n- Linear Equations\nModule 3: Geometry\n- Angles\n- Triangles'
  );

  const [diagnosticStudentUserId, setDiagnosticStudentUserId] = useState('');
  const [diagnosticSyllabusId, setDiagnosticSyllabusId] = useState('syllabus-demo-001');

  const [planStudentUserId, setPlanStudentUserId] = useState('');
  const [planSyllabusId, setPlanSyllabusId] = useState('syllabus-demo-001');
  const [planScorePercent, setPlanScorePercent] = useState<number>(62);
  const [planStrengths, setPlanStrengths] = useState('Fractions, Number Sense');
  const [planGaps, setPlanGaps] = useState('Linear Equations, Ratio and Proportion');
  const [planOverconfidence, setPlanOverconfidence] = useState('Linear Equations');
  const [planUnderconfidence, setPlanUnderconfidence] = useState('Fractions');

  const [sessionPlanStudentUserId, setSessionPlanStudentUserId] = useState('');
  const [sessionPlanTeacherUserId, setSessionPlanTeacherUserId] = useState('teacher-demo-001');
  const [sessionPlanSyllabusId, setSessionPlanSyllabusId] = useState('syllabus-demo-001');
  const [sessionPlanTopicId, setSessionPlanTopicId] = useState('topic-linear-equations');
  const [sessionPlanStyle, setSessionPlanStyle] = useState<LearnAIStyle>('step_by_step');
  const [sessionPlanDifficulty, setSessionPlanDifficulty] = useState<LearnAIDifficulty>('medium');

  const [runtimeStudentId, setRuntimeStudentId] = useState('');
  const [runtimeTopicId, setRuntimeTopicId] = useState('topic-linear-equations');
  const [runtimeDuration, setRuntimeDuration] = useState<number>(30);
  const [runtimeStyle, setRuntimeStyle] = useState<RuntimeStyle>('friendly');
  const [runtimeEnableVideo, setRuntimeEnableVideo] = useState(true);
  const [runtimeEnableAudio, setRuntimeEnableAudio] = useState(true);
  const [runtimeEnableInteraction, setRuntimeEnableInteraction] = useState(true);
  const [runtimeEnableQuiz, setRuntimeEnableQuiz] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setDiagnosticStudentUserId((prev) => prev || user.id);
    setPlanStudentUserId((prev) => prev || user.id);
    setSessionPlanStudentUserId((prev) => prev || user.id);
    setRuntimeStudentId((prev) => prev || user.id);
  }, [user?.id]);

  const totalLiveFeatures = useMemo(
    () =>
      SCHOOL_FEATURE_GROUPS.reduce(
        (count, group) => count + group.features.filter((feature) => feature.status === 'live').length,
        0
      ),
    []
  );

  const totalAIEnabledFeatures = useMemo(
    () =>
      SCHOOL_FEATURE_GROUPS.reduce(
        (count, group) => count + group.features.filter((feature) => feature.status === 'ai-enabled').length,
        0
      ),
    []
  );

  async function runWorkflow(url: string, payload: unknown) {
    setApiState({ loading: true, error: null, result: null });
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error || data?.details || data?.message || `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      setApiState({ loading: false, error: null, result: data });
    } catch (error) {
      setApiState({
        loading: false,
        error: error instanceof Error ? error.message : 'AI workflow failed',
        result: null,
      });
    }
  }

  async function handleAdaptiveGenerate() {
    await runWorkflow('/api/adaptive-class-generator', {
      teacherSyllabus: {
        sourceType: 'text',
        subjectNameHint: adaptiveSubject,
        rawText: adaptiveSyllabusText,
      },
      selectedPlanType: adaptivePlanType,
      allowDefaultPlanWithoutDiagnostic: true,
      runAiPlanningPrompt: true,
    });
  }

  async function handleDiagnosticGenerate() {
    await runWorkflow('/api/learnai/diagnostic/generate', {
      studentUserId: diagnosticStudentUserId,
      syllabusId: diagnosticSyllabusId,
    });
  }

  async function handlePersonalizedPlanGenerate() {
    await runWorkflow('/api/learnai/plan', {
      studentUserId: planStudentUserId,
      syllabusId: planSyllabusId,
      insight: {
        scorePercent: Number(planScorePercent),
        strengths: parseCommaSeparated(planStrengths),
        gaps: parseCommaSeparated(planGaps),
        overconfidenceTopics: parseCommaSeparated(planOverconfidence),
        underconfidenceTopics: parseCommaSeparated(planUnderconfidence),
      },
    });
  }

  async function handleSessionPlanGenerate() {
    await runWorkflow('/api/learnai/session', {
      studentUserId: sessionPlanStudentUserId,
      teacherUserId: sessionPlanTeacherUserId,
      syllabusId: sessionPlanSyllabusId,
      requestedTopicId: sessionPlanTopicId,
      preferredStyle: sessionPlanStyle,
      difficulty: sessionPlanDifficulty,
    });
  }

  async function handleRuntimeSessionGenerate() {
    await runWorkflow('/api/ai-classroom/sessions/generate', {
      studentId: runtimeStudentId,
      topicId: runtimeTopicId,
      sessionDuration: Number(runtimeDuration),
      teachingStyle: runtimeStyle,
      enableVideo: runtimeEnableVideo,
      enableAudio: runtimeEnableAudio,
      enableInteraction: runtimeEnableInteraction,
      enableQuiz: runtimeEnableQuiz,
    });
  }

  return (
    <DashboardLayout
      title="School Pattern + Real AI"
      subtitle="Complete school operations UI with live AI workflows for diagnostics, planning, and adaptive sessions"
    >
      <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-lg">
            <div className="relative p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 opacity-40" />
              <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-200 to-teal-300 opacity-30" />
              <div className="relative grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Live School Modules</p>
                  <p className="mt-3 text-4xl font-black text-amber-900">{totalLiveFeatures}</p>
                  <p className="mt-2 text-sm text-amber-800">Attendance, staff, exams, communication, finance, and schedule modules are wired in UI.</p>
                </div>
                <div className="rounded-xl border border-teal-100 bg-teal-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">AI-Enabled Modules</p>
                  <p className="mt-3 text-4xl font-black text-teal-900">{totalAIEnabledFeatures + 5}</p>
                  <p className="mt-2 text-sm text-teal-800">Adaptive roadmap, diagnostics, personalized plans, session planning, and runtime classroom generation.</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Execution Mode</p>
                  <p className="mt-3 text-xl font-extrabold text-sky-900">Real API Workflows</p>
                  <p className="mt-2 text-sm text-sky-800">Every AI action in this page sends requests to active API routes in your backend, not mock front-end logic.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            {SCHOOL_FEATURE_GROUPS.map((group) => (
              <article key={group.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">{group.icon}</span>
                  <h2 className="text-xl font-black text-gray-900">{group.title}</h2>
                </div>
                <div className="space-y-3">
                  {group.features.map((feature) => (
                    <Link
                      key={feature.name}
                      href={feature.href}
                      className="group block rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-cyan-200 hover:bg-cyan-50"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900">{feature.name}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                            feature.status === 'ai-enabled'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {feature.status === 'ai-enabled' ? 'AI' : 'Live'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cyan-700 opacity-0 transition group-hover:opacity-100">
                        Open Module
                      </p>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-gray-900">Real AI Operations Studio</h2>
              <p className="text-sm font-semibold text-gray-600">Run school AI workflows directly from UI</p>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {[
                { key: 'adaptive', label: 'Adaptive Roadmap' },
                { key: 'diagnostic', label: 'Diagnostic Builder' },
                { key: 'plan', label: 'Personalized Plan' },
                { key: 'session-plan', label: 'Constrained Session' },
                { key: 'classroom-runtime', label: 'AI Classroom Runtime' },
              ].map((item) => {
                const selected = activeWorkflow === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveWorkflow(item.key as AIWorkflow)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      selected
                        ? 'bg-cyan-600 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {activeWorkflow === 'adaptive' && (
              <div className="space-y-4 rounded-xl border border-cyan-100 bg-cyan-50 p-5">
                <h3 className="text-lg font-extrabold text-cyan-900">Adaptive Class Roadmap Generator</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-cyan-900">Subject</label>
                    <input
                      type="text"
                      value={adaptiveSubject}
                      onChange={(event) => setAdaptiveSubject(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-cyan-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cyan-900">Plan Type</label>
                    <select
                      value={adaptivePlanType}
                      onChange={(event) => setAdaptivePlanType(event.target.value as PlanType)}
                      className="mt-1 w-full rounded-lg border border-cyan-200 px-3 py-2"
                    >
                      <option value="simple">Simple</option>
                      <option value="core">Core</option>
                      <option value="harsh">Harsh</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-cyan-900">Teacher Syllabus (raw text)</label>
                  <textarea
                    value={adaptiveSyllabusText}
                    onChange={(event) => setAdaptiveSyllabusText(event.target.value)}
                    rows={8}
                    className="mt-1 w-full rounded-lg border border-cyan-200 px-3 py-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAdaptiveGenerate}
                  disabled={apiState.loading}
                  className="rounded-lg bg-cyan-700 px-5 py-2.5 font-bold text-white hover:bg-cyan-800 disabled:opacity-60"
                >
                  {apiState.loading ? 'Generating...' : 'Generate Adaptive Roadmap'}
                </button>
              </div>
            )}

            {activeWorkflow === 'diagnostic' && (
              <div className="space-y-4 rounded-xl border border-teal-100 bg-teal-50 p-5">
                <h3 className="text-lg font-extrabold text-teal-900">LearnAI Diagnostic Generator</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-teal-900">Student User ID</label>
                    <input
                      type="text"
                      value={diagnosticStudentUserId}
                      onChange={(event) => setDiagnosticStudentUserId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-teal-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-teal-900">Syllabus ID</label>
                    <input
                      type="text"
                      value={diagnosticSyllabusId}
                      onChange={(event) => setDiagnosticSyllabusId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-teal-200 px-3 py-2"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDiagnosticGenerate}
                  disabled={apiState.loading}
                  className="rounded-lg bg-teal-700 px-5 py-2.5 font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {apiState.loading ? 'Generating...' : 'Generate Diagnostic Test'}
                </button>
              </div>
            )}

            {activeWorkflow === 'plan' && (
              <div className="space-y-4 rounded-xl border border-amber-100 bg-amber-50 p-5">
                <h3 className="text-lg font-extrabold text-amber-900">Personalized Plan Builder</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-amber-900">Student User ID</label>
                    <input
                      type="text"
                      value={planStudentUserId}
                      onChange={(event) => setPlanStudentUserId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-900">Syllabus ID</label>
                    <input
                      type="text"
                      value={planSyllabusId}
                      onChange={(event) => setPlanSyllabusId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-900">Score Percent</label>
                    <input
                      type="number"
                      value={planScorePercent}
                      onChange={(event) => setPlanScorePercent(Number(event.target.value))}
                      className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-amber-900">Strengths (comma separated)</label>
                    <input
                      type="text"
                      value={planStrengths}
                      onChange={(event) => setPlanStrengths(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-900">Gaps (comma separated)</label>
                    <input
                      type="text"
                      value={planGaps}
                      onChange={(event) => setPlanGaps(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-900">Overconfidence Topics</label>
                    <input
                      type="text"
                      value={planOverconfidence}
                      onChange={(event) => setPlanOverconfidence(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-900">Underconfidence Topics</label>
                    <input
                      type="text"
                      value={planUnderconfidence}
                      onChange={(event) => setPlanUnderconfidence(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePersonalizedPlanGenerate}
                  disabled={apiState.loading}
                  className="rounded-lg bg-amber-700 px-5 py-2.5 font-bold text-white hover:bg-amber-800 disabled:opacity-60"
                >
                  {apiState.loading ? 'Generating...' : 'Generate Personalized Plan'}
                </button>
              </div>
            )}

            {activeWorkflow === 'session-plan' && (
              <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50 p-5">
                <h3 className="text-lg font-extrabold text-sky-900">Constrained Session Planner</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-sky-900">Student User ID</label>
                    <input
                      type="text"
                      value={sessionPlanStudentUserId}
                      onChange={(event) => setSessionPlanStudentUserId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-sky-900">Teacher User ID</label>
                    <input
                      type="text"
                      value={sessionPlanTeacherUserId}
                      onChange={(event) => setSessionPlanTeacherUserId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-sky-900">Syllabus ID</label>
                    <input
                      type="text"
                      value={sessionPlanSyllabusId}
                      onChange={(event) => setSessionPlanSyllabusId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-sky-900">Requested Topic ID</label>
                    <input
                      type="text"
                      value={sessionPlanTopicId}
                      onChange={(event) => setSessionPlanTopicId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-sky-900">Preferred Style</label>
                    <select
                      value={sessionPlanStyle}
                      onChange={(event) => setSessionPlanStyle(event.target.value as LearnAIStyle)}
                      className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2"
                    >
                      <option value="visual">Visual</option>
                      <option value="step_by_step">Step by Step</option>
                      <option value="story">Story</option>
                      <option value="practice_focused">Practice Focused</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-sky-900">Difficulty</label>
                    <select
                      value={sessionPlanDifficulty}
                      onChange={(event) => setSessionPlanDifficulty(event.target.value as LearnAIDifficulty)}
                      className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSessionPlanGenerate}
                  disabled={apiState.loading}
                  className="rounded-lg bg-sky-700 px-5 py-2.5 font-bold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {apiState.loading ? 'Generating...' : 'Generate Constrained Session Plan'}
                </button>
              </div>
            )}

            {activeWorkflow === 'classroom-runtime' && (
              <div className="space-y-4 rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-5">
                <h3 className="text-lg font-extrabold text-fuchsia-900">AI Classroom Runtime Session</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-fuchsia-900">Student ID</label>
                    <input
                      type="text"
                      value={runtimeStudentId}
                      onChange={(event) => setRuntimeStudentId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-fuchsia-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-fuchsia-900">Topic ID</label>
                    <input
                      type="text"
                      value={runtimeTopicId}
                      onChange={(event) => setRuntimeTopicId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-fuchsia-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-fuchsia-900">Duration (minutes)</label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={runtimeDuration}
                      onChange={(event) => setRuntimeDuration(Number(event.target.value))}
                      className="mt-1 w-full rounded-lg border border-fuchsia-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-fuchsia-900">Teaching Style</label>
                    <select
                      value={runtimeStyle}
                      onChange={(event) => setRuntimeStyle(event.target.value as RuntimeStyle)}
                      className="mt-1 w-full rounded-lg border border-fuchsia-200 px-3 py-2"
                    >
                      <option value="friendly">Friendly</option>
                      <option value="strict">Strict</option>
                      <option value="storytelling">Storytelling</option>
                      <option value="socratic">Socratic</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: 'Enable Video',
                      checked: runtimeEnableVideo,
                      onChange: setRuntimeEnableVideo,
                    },
                    {
                      label: 'Enable Audio',
                      checked: runtimeEnableAudio,
                      onChange: setRuntimeEnableAudio,
                    },
                    {
                      label: 'Enable Interaction',
                      checked: runtimeEnableInteraction,
                      onChange: setRuntimeEnableInteraction,
                    },
                    {
                      label: 'Enable Quiz',
                      checked: runtimeEnableQuiz,
                      onChange: setRuntimeEnableQuiz,
                    },
                  ].map((toggle) => (
                    <label key={toggle.label} className="flex items-center gap-2 rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-sm font-semibold text-fuchsia-900">
                      <input
                        type="checkbox"
                        checked={toggle.checked}
                        onChange={(event) => toggle.onChange(event.target.checked)}
                      />
                      {toggle.label}
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRuntimeSessionGenerate}
                  disabled={apiState.loading}
                  className="rounded-lg bg-fuchsia-700 px-5 py-2.5 font-bold text-white hover:bg-fuchsia-800 disabled:opacity-60"
                >
                  {apiState.loading ? 'Generating...' : 'Generate AI Classroom Session'}
                </button>
              </div>
            )}

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-bold text-gray-900">Workflow Response</p>
              {apiState.loading && <p className="text-sm text-cyan-700">Running AI workflow...</p>}
              {apiState.error && (
                <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{apiState.error}</p>
              )}
              {!apiState.loading && !apiState.error && apiState.result && (
                <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                  {JSON.stringify(apiState.result, null, 2)}
                </pre>
              )}
              {!apiState.loading && !apiState.error && !apiState.result && (
                <p className="text-sm text-gray-600">Run any workflow to view AI output here.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
