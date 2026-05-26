import { LearnAIRepository } from '@/lib/server/learnai/repository';
import type {
  DiagnosticGenerationInput,
  DiagnosticInsight,
  DiagnosticSubmissionInput,
  DashboardSeriesPoint,
  LearningPlanStep,
  LearnAIRole,
  PersonalizedPlanInput,
  RoleDashboardData,
  SessionGenerationInput,
} from '@/lib/types/learnai-school';

export class LearnAIService {
  constructor(private readonly repository: LearnAIRepository = new LearnAIRepository()) {}

  getBootstrap() {
    return this.repository.getBootstrapData();
  }

  getRoleDashboard(role: LearnAIRole): RoleDashboardData {
    const data = this.repository.getBootstrapData();

    const roleDashboardMap: Record<LearnAIRole, RoleDashboardData> = {
      saas_admin: {
        role,
        title: 'LearnAI SaaS Admin Dashboard',
        metrics: [
          { label: 'Schools', value: data.schools.length },
          { label: 'Subscriptions', value: data.subscriptions.length },
          { label: 'Monthly Revenue (USD)', value: data.payments.reduce((acc, p) => acc + p.amount, 0) },
          { label: 'Active AI Sessions', value: data.learnAISessions.length },
        ],
        weakTopicHeatmap: this.buildWeakTopicHeatmap(),
        masteryTrend: this.buildMasteryTrend(),
      },
      principal: {
        role,
        title: 'LearnAI Principal Dashboard',
        metrics: [
          { label: 'Students', value: data.studentProfiles.length },
          { label: 'Teachers', value: data.teacherProfiles.length },
          { label: 'Classes', value: data.classes.length },
          { label: 'Syllabus Completion (%)', value: this.getSyllabusCompletionPercent() },
        ],
        weakTopicHeatmap: this.buildWeakTopicHeatmap(),
        masteryTrend: this.buildMasteryTrend(),
      },
      teacher: {
        role,
        title: 'LearnAI Teacher Dashboard',
        metrics: [
          { label: 'Syllabus Units', value: data.syllabusUnits.length },
          { label: 'Questions Pending Review', value: data.diagnosticQuestions.length },
          { label: 'Learning Plans', value: data.learningPlans.length },
          { label: 'Risk Students', value: this.getRiskStudentCount() },
        ],
        weakTopicHeatmap: this.buildWeakTopicHeatmap(),
        masteryTrend: this.buildMasteryTrend(),
      },
      student: {
        role,
        title: 'LearnAI Student Dashboard',
        metrics: [
          { label: 'Plan Steps', value: data.learningPlanSteps.length },
          {
            label: 'Completed Steps',
            value: data.studentProgress.reduce((acc, item) => acc + item.completedStepIds.length, 0),
          },
          { label: 'Average Mastery (%)', value: this.getAverageMastery() },
          { label: 'Confidence Mismatch Topics', value: this.getConfidenceMismatchCount() },
        ],
        weakTopicHeatmap: this.buildWeakTopicHeatmap(),
        masteryTrend: this.buildMasteryTrend(),
      },
      parent: {
        role,
        title: 'LearnAI Parent Dashboard',
        metrics: [
          { label: 'Children Tracked', value: data.parentProfiles[0]?.studentUserIds.length ?? 0 },
          { label: 'Progress Notes', value: data.notifications.length },
          { label: 'Fee Records', value: data.payments.length },
          { label: 'Upcoming Revision Sessions', value: data.revisionSchedules.length },
        ],
        weakTopicHeatmap: this.buildWeakTopicHeatmap(),
        masteryTrend: this.buildMasteryTrend(),
      },
      accountant: {
        role,
        title: 'LearnAI Accountant Dashboard',
        metrics: [
          { label: 'Subscription Plans', value: data.subscriptions.length },
          { label: 'Payments Logged', value: data.payments.length },
          { label: 'Paid Invoices', value: data.payments.filter((payment) => payment.status === 'paid').length },
          { label: 'Due Invoices', value: data.payments.filter((payment) => payment.status === 'due').length },
        ],
        weakTopicHeatmap: this.buildWeakTopicHeatmap(),
        masteryTrend: this.buildMasteryTrend(),
      },
      supervisor: {
        role,
        title: 'LearnAI Supervisor Dashboard',
        metrics: [
          { label: 'Observed Classes', value: data.classes.length },
          { label: 'AI Session Logs', value: data.sessionInteractionLogs.length },
          { label: 'Assessments', value: data.diagnosticTests.length },
          { label: 'Audit Entries', value: data.auditLogs.length },
        ],
        weakTopicHeatmap: this.buildWeakTopicHeatmap(),
        masteryTrend: this.buildMasteryTrend(),
      },
    };

    return roleDashboardMap[role];
  }

  createConstrainedSession(input: SessionGenerationInput) {
    const syllabus = this.repository.getSyllabusById(input.syllabusId);
    if (!syllabus) {
      return { ok: false as const, error: 'Syllabus not found.' };
    }

    const topicIds = this.repository.getTopicsBySyllabusId(input.syllabusId).map((topic) => topic.id);

    if (!topicIds.includes(input.requestedTopicId)) {
      if (!syllabus.enrichmentEnabled) {
        return {
          ok: false as const,
          error:
            'Requested topic is outside teacher-approved syllabus boundaries. Enable enrichment mode to extend scope.',
        };
      }

      topicIds.push(input.requestedTopicId);
    }

    const selectedStep: LearningPlanStep = {
      id: `generated-step-${input.studentUserId}-${input.requestedTopicId}`,
      learningPlanId: `generated-plan-${input.studentUserId}`,
      topicId: input.requestedTopicId,
      teachingStyle: input.preferredStyle,
      difficulty: input.difficulty,
    };

    return {
      ok: true as const,
      payload: {
        classroomEngineRequest: {
          approvedTopic: input.requestedTopicId,
          studentProfile: {
            studentUserId: input.studentUserId,
            teachingStyle: input.preferredStyle,
            difficulty: input.difficulty,
          },
          learningPlanStep: selectedStep,
          syllabusConstraints: {
            enrichmentEnabled: syllabus.enrichmentEnabled,
            allowedTopicIds: topicIds,
          },
        },
        systemOfRecord: {
          studentUserId: input.studentUserId,
          teacherUserId: input.teacherUserId,
          syllabusId: input.syllabusId,
          learningPlanStepId: selectedStep.id,
          createdAt: new Date().toISOString(),
        },
      },
    };
  }

  generateDiagnosticTest(input: DiagnosticGenerationInput) {
    const data = this.repository.getBootstrapData();
    const student = data.studentProfiles.find((profile) => profile.userId === input.studentUserId);
    if (!student) {
      return { ok: false as const, error: 'Student profile not found.' };
    }

    const test = data.diagnosticTests.find(
      (item) => item.studentUserId === input.studentUserId && item.syllabusId === input.syllabusId,
    );
    if (!test) {
      return { ok: false as const, error: 'Diagnostic test not found for student and syllabus.' };
    }

    const questions = data.diagnosticQuestions
      .filter((question) => question.diagnosticTestId === test.id)
      .map((question) => ({
        id: question.id,
        topicId: question.topicId,
        prompt: question.prompt,
        options: data.questionOptions
          .filter((option) => option.diagnosticQuestionId === question.id)
          .map((option) => ({ id: option.id, text: option.text })),
      }));

    const review = data.teacherQuestionReviews.find((item) => item.diagnosticTestId === test.id);

    return {
      ok: true as const,
      payload: {
        testId: test.id,
        status: test.status,
        teacherApproved: Boolean(review?.approved),
        questions,
      },
    };
  }

  analyzeDiagnosticSubmission(input: DiagnosticSubmissionInput) {
    const data = this.repository.getBootstrapData();
    const test = data.diagnosticTests.find(
      (item) => item.id === input.diagnosticTestId && item.studentUserId === input.studentUserId,
    );
    if (!test) {
      return { ok: false as const, error: 'Diagnostic test not found for student.' };
    }

    const questions = data.diagnosticQuestions.filter(
      (question) => question.diagnosticTestId === input.diagnosticTestId,
    );
    if (questions.length === 0) {
      return { ok: false as const, error: 'No diagnostic questions found for test.' };
    }

    const topicById = new Map(data.topics.map((topic) => [topic.id, topic.name]));
    const confidence = data.selfAssessments.find((item) => item.studentUserId === input.studentUserId);
    const overconfidenceTopics: string[] = [];
    const underconfidenceTopics: string[] = [];
    const strengths: string[] = [];
    const gaps: string[] = [];
    let correct = 0;

    for (const question of questions) {
      const chosen = input.answers[question.id];
      const options = data.questionOptions.filter((item) => item.diagnosticQuestionId === question.id);
      const correctOption = options.find((option) => option.isCorrect);
      const isCorrect = Boolean(chosen && correctOption && chosen === correctOption.id);
      const topicName = topicById.get(question.topicId) ?? question.topicId;

      if (isCorrect) {
        correct += 1;
        strengths.push(topicName);
      } else {
        gaps.push(topicName);
      }

      const confidenceScore = confidence?.topicConfidence[question.topicId] ?? 50;
      if (!isCorrect && confidenceScore >= 70) {
        overconfidenceTopics.push(topicName);
      } else if (isCorrect && confidenceScore <= 40) {
        underconfidenceTopics.push(topicName);
      }
    }

    const scorePercent = Math.round((correct / questions.length) * 100);
    const insight: DiagnosticInsight = {
      scorePercent,
      strengths: [...new Set(strengths)],
      gaps: [...new Set(gaps)],
      overconfidenceTopics: [...new Set(overconfidenceTopics)],
      underconfidenceTopics: [...new Set(underconfidenceTopics)],
    };

    return {
      ok: true as const,
      payload: {
        diagnosticTestId: input.diagnosticTestId,
        insight,
      },
    };
  }

  buildPersonalizedLearningPlan(input: PersonalizedPlanInput) {
    const syllabus = this.repository.getSyllabusById(input.syllabusId);
    if (!syllabus) {
      return { ok: false as const, error: 'Syllabus not found.' };
    }

    const allowedTopics = this.repository.getTopicsBySyllabusId(input.syllabusId);
    const topicNameToId = new Map(allowedTopics.map((topic) => [topic.name, topic.id]));
    const prioritizedGapTopicIds = input.insight.gaps
      .map((name) => topicNameToId.get(name))
      .filter((topicId): topicId is string => Boolean(topicId));

    const fallbackTopicIds = allowedTopics
      .map((topic) => topic.id)
      .filter((topicId) => !prioritizedGapTopicIds.includes(topicId));

    const orderedTopicIds = [...prioritizedGapTopicIds, ...fallbackTopicIds];
    const stepStyles: LearningPlanStep['teachingStyle'][] = [
      'visual',
      'step_by_step',
      'practice_focused',
      'story',
    ];

    const steps = orderedTopicIds.map((topicId, index) => ({
      id: `personalized-step-${input.studentUserId}-${index + 1}`,
      learningPlanId: `personalized-plan-${input.studentUserId}`,
      topicId,
      teachingStyle: stepStyles[index % stepStyles.length],
      difficulty:
        input.insight.scorePercent < 45
          ? 'easy'
          : input.insight.scorePercent < 70
            ? 'medium'
            : 'hard',
    }));

    return {
      ok: true as const,
      payload: {
        planId: `personalized-plan-${input.studentUserId}`,
        constrainedBySyllabus: true,
        orderedTopicIds,
        steps,
        rationale: {
          strengths: input.insight.strengths,
          gaps: input.insight.gaps,
          overconfidenceTopics: input.insight.overconfidenceTopics,
          underconfidenceTopics: input.insight.underconfidenceTopics,
        },
      },
    };
  }

  private getAverageMastery(): number {
    const masteries = this.repository.getBootstrapData().topicMasteries;
    if (masteries.length === 0) return 0;
    const sum = masteries.reduce((acc, item) => acc + item.mastery, 0);
    return Math.round(sum / masteries.length);
  }

  private getConfidenceMismatchCount(): number {
    const analyses = this.repository.getBootstrapData().confidenceAnalyses;
    return analyses.reduce(
      (acc, item) => acc + item.overconfidenceTopics.length + item.underconfidenceTopics.length,
      0,
    );
  }

  private getRiskStudentCount(): number {
    const data = this.repository.getBootstrapData();
    const masteryByStudent = new Map<string, number[]>();

    for (const row of data.topicMasteries) {
      const list = masteryByStudent.get(row.studentUserId) ?? [];
      list.push(row.mastery);
      masteryByStudent.set(row.studentUserId, list);
    }

    let riskCount = 0;
    for (const scores of masteryByStudent.values()) {
      const avg = scores.reduce((acc, value) => acc + value, 0) / scores.length;
      if (avg < 50) riskCount += 1;
    }

    return riskCount;
  }

  private getSyllabusCompletionPercent(): number {
    const data = this.repository.getBootstrapData();
    const total = data.learningPlanSteps.length;
    if (total === 0) return 0;
    const completed = data.studentProgress.reduce(
      (acc, progress) => acc + progress.completedStepIds.length,
      0,
    );
    return Math.round((completed / total) * 100);
  }

  private buildWeakTopicHeatmap(): DashboardSeriesPoint[] {
    const data = this.repository.getBootstrapData();
    const topicNameById = new Map(data.topics.map((topic) => [topic.id, topic.name]));

    return data.topicMasteries
      .filter((item) => item.mastery < 60)
      .map((item) => ({
        label: topicNameById.get(item.topicId) ?? item.topicId,
        value: item.mastery,
      }));
  }

  private buildMasteryTrend(): DashboardSeriesPoint[] {
    const score = this.getAverageMastery();

    return [
      { label: 'Week 1', value: Math.max(score - 12, 0) },
      { label: 'Week 2', value: Math.max(score - 8, 0) },
      { label: 'Week 3', value: Math.max(score - 4, 0) },
      { label: 'Week 4', value: score },
      { label: 'Week 5 Forecast', value: Math.min(score + 5, 100) },
      { label: 'Week 6 Forecast', value: Math.min(score + 8, 100) },
    ];
  }
}
