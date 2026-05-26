import type { LearnAIPlatformData } from '@/lib/types/learnai-school';

const now = new Date().toISOString();
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export const DEMO_LEARNAI_DATA: LearnAIPlatformData = {
  roles: [
    { id: 'role-saas-admin', key: 'saas_admin', label: 'SaaS Admin' },
    { id: 'role-principal', key: 'principal', label: 'Principal' },
    { id: 'role-teacher', key: 'teacher', label: 'Teacher' },
    { id: 'role-student', key: 'student', label: 'Student' },
    { id: 'role-parent', key: 'parent', label: 'Parent' },
    { id: 'role-accountant', key: 'accountant', label: 'Accountant' },
    { id: 'role-supervisor', key: 'supervisor', label: 'Supervisor' },
  ],
  schools: [
    {
      id: 'school-learnai-demo',
      name: 'LearnAI Demonstration School',
      code: 'LEARNAI-DEMO',
      timezone: 'UTC',
    },
  ],
  schoolProfiles: [
    {
      schoolId: 'school-learnai-demo',
      principalUserId: 'user-principal-demo',
      academicYear: '2026',
    },
  ],
  users: [
    {
      id: 'user-admin-demo',
      name: 'LearnAI SaaS Admin',
      email: 'admin@learnai.study',
      roleId: 'role-saas-admin',
    },
    {
      id: 'user-principal-demo',
      name: 'LearnAI Principal',
      email: 'principal@learnai.study',
      roleId: 'role-principal',
      schoolId: 'school-learnai-demo',
    },
    {
      id: 'user-teacher-demo',
      name: 'LearnAI Teacher',
      email: 'teacher@learnai.study',
      roleId: 'role-teacher',
      schoolId: 'school-learnai-demo',
    },
    {
      id: 'user-student-demo',
      name: 'LearnAI Student',
      email: 'student@learnai.study',
      roleId: 'role-student',
      schoolId: 'school-learnai-demo',
    },
    {
      id: 'user-parent-demo',
      name: 'LearnAI Parent',
      email: 'parent@learnai.study',
      roleId: 'role-parent',
      schoolId: 'school-learnai-demo',
    },
    {
      id: 'user-accountant-demo',
      name: 'LearnAI Accountant',
      email: 'accountant@learnai.study',
      roleId: 'role-accountant',
      schoolId: 'school-learnai-demo',
    },
    {
      id: 'user-supervisor-demo',
      name: 'LearnAI Supervisor',
      email: 'supervisor@learnai.study',
      roleId: 'role-supervisor',
      schoolId: 'school-learnai-demo',
    },
  ],
  memberships: [
    {
      id: 'membership-principal',
      schoolId: 'school-learnai-demo',
      userId: 'user-principal-demo',
      roleId: 'role-principal',
    },
    {
      id: 'membership-teacher',
      schoolId: 'school-learnai-demo',
      userId: 'user-teacher-demo',
      roleId: 'role-teacher',
    },
    {
      id: 'membership-student',
      schoolId: 'school-learnai-demo',
      userId: 'user-student-demo',
      roleId: 'role-student',
    },
    {
      id: 'membership-parent',
      schoolId: 'school-learnai-demo',
      userId: 'user-parent-demo',
      roleId: 'role-parent',
    },
    {
      id: 'membership-accountant',
      schoolId: 'school-learnai-demo',
      userId: 'user-accountant-demo',
      roleId: 'role-accountant',
    },
    {
      id: 'membership-supervisor',
      schoolId: 'school-learnai-demo',
      userId: 'user-supervisor-demo',
      roleId: 'role-supervisor',
    },
  ],
  principalProfiles: [{ userId: 'user-principal-demo', schoolId: 'school-learnai-demo' }],
  teacherProfiles: [
    {
      userId: 'user-teacher-demo',
      schoolId: 'school-learnai-demo',
      subjectIds: ['subject-math-demo'],
    },
  ],
  studentProfiles: [
    {
      userId: 'user-student-demo',
      schoolId: 'school-learnai-demo',
      gradeId: 'grade-6-demo',
      classId: 'class-6a-demo',
      parentUserId: 'user-parent-demo',
    },
  ],
  parentProfiles: [
    {
      userId: 'user-parent-demo',
      schoolId: 'school-learnai-demo',
      studentUserIds: ['user-student-demo'],
    },
  ],
  accountantProfiles: [{ userId: 'user-accountant-demo', schoolId: 'school-learnai-demo' }],
  supervisorProfiles: [{ userId: 'user-supervisor-demo', schoolId: 'school-learnai-demo' }],
  grades: [{ id: 'grade-6-demo', schoolId: 'school-learnai-demo', name: 'Grade 6', level: 6 }],
  classes: [
    {
      id: 'class-6a-demo',
      schoolId: 'school-learnai-demo',
      gradeId: 'grade-6-demo',
      name: 'Class 6-A',
      teacherUserId: 'user-teacher-demo',
    },
  ],
  subjects: [{ id: 'subject-math-demo', schoolId: 'school-learnai-demo', name: 'Mathematics' }],
  syllabi: [
    {
      id: 'syllabus-grade6-math',
      schoolId: 'school-learnai-demo',
      gradeId: 'grade-6-demo',
      classId: 'class-6a-demo',
      subjectId: 'subject-math-demo',
      teacherUserId: 'user-teacher-demo',
      enrichmentEnabled: false,
    },
  ],
  syllabusUnits: [
    { id: 'unit-fractions', syllabusId: 'syllabus-grade6-math', name: 'Fractions', order: 1 },
    { id: 'unit-decimals', syllabusId: 'syllabus-grade6-math', name: 'Decimals', order: 2 },
    { id: 'unit-ratios', syllabusId: 'syllabus-grade6-math', name: 'Ratios', order: 3 },
    {
      id: 'unit-percentages',
      syllabusId: 'syllabus-grade6-math',
      name: 'Percentages',
      order: 4,
    },
  ],
  topics: [
    { id: 'topic-fractions-basic', syllabusUnitId: 'unit-fractions', name: 'Fraction Basics', order: 1 },
    {
      id: 'topic-decimals-basic',
      syllabusUnitId: 'unit-decimals',
      name: 'Decimal Basics',
      order: 1,
    },
    { id: 'topic-ratios-basic', syllabusUnitId: 'unit-ratios', name: 'Ratio Basics', order: 1 },
    {
      id: 'topic-percentages-basic',
      syllabusUnitId: 'unit-percentages',
      name: 'Percentage Basics',
      order: 1,
    },
  ],
  topicDependencies: [
    {
      id: 'dep-decimals-after-fractions',
      topicId: 'topic-decimals-basic',
      prerequisiteTopicId: 'topic-fractions-basic',
    },
    {
      id: 'dep-ratios-after-decimals',
      topicId: 'topic-ratios-basic',
      prerequisiteTopicId: 'topic-decimals-basic',
    },
    {
      id: 'dep-percentages-after-ratios',
      topicId: 'topic-percentages-basic',
      prerequisiteTopicId: 'topic-ratios-basic',
    },
  ],
  learningObjectives: [
    {
      id: 'lo-fractions',
      topicId: 'topic-fractions-basic',
      description: 'Represent and compare fractions accurately.',
    },
    {
      id: 'lo-decimals',
      topicId: 'topic-decimals-basic',
      description: 'Convert between fractions and decimals.',
    },
    {
      id: 'lo-ratios',
      topicId: 'topic-ratios-basic',
      description: 'Interpret and simplify ratio statements.',
    },
    {
      id: 'lo-percentages',
      topicId: 'topic-percentages-basic',
      description: 'Apply percentages in real-world word problems.',
    },
  ],
  assignments: [{ id: 'assignment-1', syllabusId: 'syllabus-grade6-math', title: 'Fraction Practice Set' }],
  quizzes: [{ id: 'quiz-1', syllabusId: 'syllabus-grade6-math', title: 'Decimals Quick Check' }],
  exams: [{ id: 'exam-midterm', syllabusId: 'syllabus-grade6-math', title: 'Grade 6 Math Midterm' }],
  selfAssessments: [
    {
      id: 'self-assessment-1',
      studentUserId: 'user-student-demo',
      topicConfidence: {
        'topic-fractions-basic': 70,
        'topic-decimals-basic': 40,
        'topic-ratios-basic': 50,
        'topic-percentages-basic': 45,
      },
    },
  ],
  diagnosticTests: [
    {
      id: 'diagnostic-1',
      syllabusId: 'syllabus-grade6-math',
      studentUserId: 'user-student-demo',
      status: 'teacher_reviewed',
    },
  ],
  diagnosticQuestions: [
    {
      id: 'diag-q1',
      diagnosticTestId: 'diagnostic-1',
      topicId: 'topic-fractions-basic',
      prompt: 'What is 3/4 + 1/8?',
    },
    {
      id: 'diag-q2',
      diagnosticTestId: 'diagnostic-1',
      topicId: 'topic-decimals-basic',
      prompt: 'Convert 0.75 to a fraction.',
    },
  ],
  questionOptions: [
    { id: 'diag-q1-opt1', diagnosticQuestionId: 'diag-q1', text: '7/8', isCorrect: true },
    { id: 'diag-q1-opt2', diagnosticQuestionId: 'diag-q1', text: '4/12', isCorrect: false },
    { id: 'diag-q2-opt1', diagnosticQuestionId: 'diag-q2', text: '3/4', isCorrect: true },
    { id: 'diag-q2-opt2', diagnosticQuestionId: 'diag-q2', text: '1/3', isCorrect: false },
  ],
  teacherQuestionReviews: [
    {
      id: 'review-1',
      diagnosticTestId: 'diagnostic-1',
      teacherUserId: 'user-teacher-demo',
      approved: true,
      note: 'Approved for diagnostic release.',
    },
  ],
  testAttempts: [{ id: 'attempt-1', diagnosticTestId: 'diagnostic-1', studentUserId: 'user-student-demo', score: 50 }],
  testAnswers: [
    {
      id: 'attempt-1-answer-1',
      testAttemptId: 'attempt-1',
      diagnosticQuestionId: 'diag-q1',
      selectedOptionId: 'diag-q1-opt1',
    },
    {
      id: 'attempt-1-answer-2',
      testAttemptId: 'attempt-1',
      diagnosticQuestionId: 'diag-q2',
      selectedOptionId: 'diag-q2-opt2',
    },
  ],
  confidenceAnalyses: [
    {
      id: 'confidence-1',
      studentUserId: 'user-student-demo',
      overconfidenceTopics: ['topic-decimals-basic'],
      underconfidenceTopics: [],
    },
  ],
  learningPlans: [{ id: 'plan-1', studentUserId: 'user-student-demo', syllabusId: 'syllabus-grade6-math' }],
  learningPlanSteps: [
    {
      id: 'plan-step-1',
      learningPlanId: 'plan-1',
      topicId: 'topic-decimals-basic',
      teachingStyle: 'visual',
      difficulty: 'easy',
    },
    {
      id: 'plan-step-2',
      learningPlanId: 'plan-1',
      topicId: 'topic-ratios-basic',
      teachingStyle: 'step_by_step',
      difficulty: 'medium',
    },
  ],
  learningDNAs: [
    {
      id: 'dna-1',
      studentUserId: 'user-student-demo',
      preferredStyle: 'visual',
      confidenceTrend: 'medium',
      pace: 'medium',
    },
  ],
  topicMasteries: [
    { id: 'mastery-fractions', studentUserId: 'user-student-demo', topicId: 'topic-fractions-basic', mastery: 78 },
    { id: 'mastery-decimals', studentUserId: 'user-student-demo', topicId: 'topic-decimals-basic', mastery: 38 },
    { id: 'mastery-ratios', studentUserId: 'user-student-demo', topicId: 'topic-ratios-basic', mastery: 42 },
    {
      id: 'mastery-percentages',
      studentUserId: 'user-student-demo',
      topicId: 'topic-percentages-basic',
      mastery: 35,
    },
  ],
  studentProgress: [
    {
      id: 'progress-1',
      studentUserId: 'user-student-demo',
      completedStepIds: ['plan-step-1'],
      currentStepId: 'plan-step-2',
    },
  ],
  revisionSchedules: [
    {
      id: 'rev-1',
      studentUserId: 'user-student-demo',
      topicId: 'topic-decimals-basic',
      nextRevisionAt: new Date(Date.now() + TWO_DAYS_MS).toISOString(),
    },
  ],
  learnAISessions: [
    {
      id: 'learnai-session-1',
      studentUserId: 'user-student-demo',
      teacherUserId: 'user-teacher-demo',
      syllabusId: 'syllabus-grade6-math',
      learningPlanStepId: 'plan-step-2',
      openMAICClassroomId: 'demo-learnai-classroom-1',
      approvedTopicIds: [
        'topic-fractions-basic',
        'topic-decimals-basic',
        'topic-ratios-basic',
        'topic-percentages-basic',
      ],
    },
  ],
  sessionMedia: [
    {
      id: 'media-1',
      learnAISessionId: 'learnai-session-1',
      kind: 'video',
      url: '/api/classroom-media/demo-learnai-classroom-1/session.mp4',
    },
  ],
  sessionTranscripts: [
    {
      id: 'transcript-1',
      learnAISessionId: 'learnai-session-1',
      transcript:
        'LearnAI teacher explains decimals with visual blocks and asks check-point questions.',
    },
  ],
  sessionInteractionLogs: [
    {
      id: 'interaction-1',
      learnAISessionId: 'learnai-session-1',
      eventType: 'quiz',
      payload: JSON.stringify({ questionId: 'diag-q2', correct: false }),
    },
  ],
  sessionQuizResults: [
    {
      id: 'session-quiz-1',
      learnAISessionId: 'learnai-session-1',
      score: 6,
      total: 10,
    },
  ],
  subscriptions: [
    {
      id: 'subscription-1',
      schoolId: 'school-learnai-demo',
      plan: 'Pro School',
      status: 'active',
    },
  ],
  payments: [
    {
      id: 'payment-1',
      schoolId: 'school-learnai-demo',
      amount: 299,
      currency: 'USD',
      status: 'paid',
    },
  ],
  apiKeys: [
    {
      id: 'key-1',
      schoolId: 'school-learnai-demo',
      provider: 'openai',
      maskedKey: 'sk-****demo',
    },
  ],
  auditLogs: [
    {
      id: 'audit-1',
      actorUserId: 'user-teacher-demo',
      action: 'Approved diagnostic question set for Grade 6 Math.',
      createdAt: now,
    },
  ],
  notifications: [
    {
      id: 'notification-1',
      userId: 'user-parent-demo',
      title: 'Progress update',
      body: 'LearnAI reports improved confidence in fractions this week.',
      createdAt: now,
    },
  ],
};
