'use client';

import { useMemo, useState } from 'react';
import type { LearnAIRole } from '@/lib/types/learnai-school';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const roles: LearnAIRole[] = [
  'saas_admin',
  'principal',
  'teacher',
  'student',
  'parent',
  'accountant',
  'supervisor',
];

const roleLabels: Record<LearnAIRole, string> = {
  saas_admin: 'SaaS Admin',
  principal: 'Principal',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  accountant: 'Accountant',
  supervisor: 'Supervisor',
};

interface Metric {
  label: string;
  value: number;
}

interface SeriesPoint {
  label: string;
  value: number;
}

interface DashboardResponse {
  success: boolean;
  branding: string;
  dashboard: {
    role: LearnAIRole;
    title: string;
    metrics: Metric[];
    weakTopicHeatmap: SeriesPoint[];
    masteryTrend: SeriesPoint[];
  };
}

interface DiagnosticQuestionView {
  id: string;
  topicId: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
}

interface DiagnosticGenerateResponse {
  success: boolean;
  diagnostic: {
    testId: string;
    status: string;
    teacherApproved: boolean;
    questions: DiagnosticQuestionView[];
  };
}

interface DiagnosticSubmitResponse {
  success: boolean;
  analysis: {
    diagnosticTestId: string;
    insight: {
      scorePercent: number;
      strengths: string[];
      gaps: string[];
      overconfidenceTopics: string[];
      underconfidenceTopics: string[];
    };
  };
}

interface LearningPlanResponse {
  success: boolean;
  learningPlan: {
    planId: string;
    constrainedBySyllabus: boolean;
    orderedTopicIds: string[];
    steps: Array<{ id: string; topicId: string; teachingStyle: string; difficulty: string }>;
  };
}

function toPercent(value: number) {
  return `${Math.max(Math.min(value, 100), 0)}%`;
}

export default function LearnAIPage() {
  const [selectedRole, setSelectedRole] = useState<LearnAIRole>('teacher');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticGenerateResponse['diagnostic'] | null>(null);
  const [analysis, setAnalysis] = useState<DiagnosticSubmitResponse['analysis'] | null>(null);
  const [learningPlan, setLearningPlan] = useState<LearningPlanResponse['learningPlan'] | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);

  const roleTitle = useMemo(() => roleLabels[selectedRole], [selectedRole]);

  const loadDashboard = async (role: LearnAIRole) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/learnai/dashboard?role=${role}`);
      const payload = (await response.json()) as DashboardResponse;

      if (!response.ok || !payload.success) {
        throw new Error('Unable to load LearnAI dashboard data.');
      }

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const runPersonalizationWorkflow = async () => {
    setWorkflowLoading(true);
    setError(null);

    try {
      const diagnosticResponse = await fetch('/api/learnai/diagnostic/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentUserId: 'user-student-demo',
          syllabusId: 'syllabus-grade6-math',
        }),
      });
      const diagnosticPayload = (await diagnosticResponse.json()) as DiagnosticGenerateResponse;
      if (!diagnosticResponse.ok || !diagnosticPayload.success) {
        throw new Error('Failed to generate diagnostic test.');
      }
      setDiagnostic(diagnosticPayload.diagnostic);

      const answers = Object.fromEntries(
        diagnosticPayload.diagnostic.questions.map((question) => [
          question.id,
          question.options[0]?.id ?? '',
        ]),
      );

      const analysisResponse = await fetch('/api/learnai/diagnostic/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentUserId: 'user-student-demo',
          diagnosticTestId: diagnosticPayload.diagnostic.testId,
          answers,
        }),
      });
      const analysisPayload = (await analysisResponse.json()) as DiagnosticSubmitResponse;
      if (!analysisResponse.ok || !analysisPayload.success) {
        throw new Error('Failed to analyze diagnostic test submission.');
      }
      setAnalysis(analysisPayload.analysis);

      const planResponse = await fetch('/api/learnai/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentUserId: 'user-student-demo',
          syllabusId: 'syllabus-grade6-math',
          insight: analysisPayload.analysis.insight,
        }),
      });
      const planPayload = (await planResponse.json()) as LearningPlanResponse;
      if (!planResponse.ok || !planPayload.success) {
        throw new Error('Failed to generate personalized learning plan.');
      }
      setLearningPlan(planPayload.learningPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run personalization workflow.');
    } finally {
      setWorkflowLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>LearnAI School Platform Demo</CardTitle>
                <CardDescription>
                  Traditional school structure with AI classroom delivery using the LearnAI classroom engine.
                </CardDescription>
              </div>
              <Badge variant="secondary">Designed and operated by LearnAI.study</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as LearnAIRole)}
            >
              <SelectTrigger className="w-full md:w-[260px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem value={role} key={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => loadDashboard(selectedRole)} disabled={loading}>
              {loading ? 'Loading…' : `Load ${roleTitle} Dashboard`}
            </Button>
            <Button
              variant="outline"
              onClick={runPersonalizationWorkflow}
              disabled={workflowLoading}
            >
              {workflowLoading ? 'Running workflow…' : 'Run diagnostic → plan workflow'}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{data.dashboard.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {data.dashboard.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border bg-card p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Weak-topic heatmap</CardTitle>
                  <CardDescription>Lower mastery topics requiring intervention.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.dashboard.weakTopicHeatmap.map((point) => (
                    <div key={point.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{point.label}</span>
                        <span>{toPercent(point.value)}</span>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div
                          className={cn(
                            'h-full rounded',
                            point.value < 40 ? 'bg-destructive' : 'bg-amber-500',
                          )}
                          style={{ width: toPercent(point.value) }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mastery trend</CardTitle>
                  <CardDescription>Progress trajectory for planning interventions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.dashboard.masteryTrend.map((point) => (
                    <div key={point.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{point.label}</span>
                        <span>{toPercent(point.value)}</span>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div className="h-full rounded bg-primary" style={{ width: toPercent(point.value) }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {(diagnostic || analysis || learningPlan) && (
          <Card>
            <CardHeader>
              <CardTitle>Personalized workflow output</CardTitle>
              <CardDescription>
                Diagnostic generation, confidence analysis, and syllabus-constrained plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {diagnostic && (
                <div className="rounded-md border p-3">
                  <p className="font-medium">Diagnostic</p>
                  <p>Test ID: {diagnostic.testId}</p>
                  <p>Status: {diagnostic.status}</p>
                  <p>Teacher approved: {diagnostic.teacherApproved ? 'Yes' : 'No'}</p>
                  <p>Questions: {diagnostic.questions.length}</p>
                </div>
              )}
              {analysis && (
                <div className="rounded-md border p-3">
                  <p className="font-medium">Confidence vs performance analysis</p>
                  <p>Score: {analysis.insight.scorePercent}%</p>
                  <p>Strengths: {analysis.insight.strengths.join(', ') || 'None'}</p>
                  <p>Gaps: {analysis.insight.gaps.join(', ') || 'None'}</p>
                  <p>
                    Overconfidence: {analysis.insight.overconfidenceTopics.join(', ') || 'None'}
                  </p>
                  <p>
                    Underconfidence: {analysis.insight.underconfidenceTopics.join(', ') || 'None'}
                  </p>
                </div>
              )}
              {learningPlan && (
                <div className="rounded-md border p-3">
                  <p className="font-medium">Learning plan</p>
                  <p>Plan ID: {learningPlan.planId}</p>
                  <p>Constrained by syllabus: {learningPlan.constrainedBySyllabus ? 'Yes' : 'No'}</p>
                  <p>Ordered topics: {learningPlan.orderedTopicIds.join(', ')}</p>
                  <p>Steps: {learningPlan.steps.length}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
