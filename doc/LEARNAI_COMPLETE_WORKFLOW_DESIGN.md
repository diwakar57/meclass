# LearnAI Complete Workflow Implementation Design

**Version:** 1.0  
**Status:** Design Phase  
**Date:** March 26, 2026

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Data Models](#data-models)
3. [API Design](#api-design)
4. [Frontend Components](#frontend-components)
5. [Frontend Pages](#frontend-pages)
6. [Workflow Implementation Order](#workflow-implementation-order)
7. [Code Changes by Module](#code-changes-by-module)
8. [Integration Points](#integration-points)

---

## System Overview

### High-Level User Journeys

#### 1. Teacher Course Creation Workflow
```
Teacher Login 
  → Dashboard 
  → "Create Course" 
  → Course Details (grade, class, subject)
  → Upload/Create Syllabus
  → Define Topics, Order, Dependencies, Estimated Sessions
  → Define Course Calendar (add school/teacher holidays)
  → Save Course
  → Course Published
```

#### 2. Student Onboarding Workflow
```
Student First Login
  → Redirect to Onboarding (if not completed)
  → Step 1: Self-Assessment
    - Current Grade Selection
    - Previous Grade Selection  
    - Self-Rate Strengths/Weaknesses
    - Confidence Score Entry
  → Step 2: Diagnostic Test
    - System generates test from previous-grade content
    - Student takes test
    - Results stored
  → Step 3: Learning DNA Analysis
    - Backend compares test results + confidence score
    - Generates learning DNA profile
    - Pace type, mistake patterns, preferred style identified
  → Step 4: Personalized Plan
    - Backend generates personalized syllabus
    - Adds remediation topics based on gaps
    - Schedules classes respecting calendar
    - Skips: Saturday, Sunday, holidays, no-class dates
  → Step 5: Completion
    - Learning plan assigned
    - Student can start learning
```

#### 3. Classroom Generation Workflow (OpenMAIC Integration)
```
Student Access Scheduled Class
  → System prepares context (topic, grade, learning DNA)
  → Call OpenMAIC API with context
  → OpenMAIC returns classroom session data
  → System stores session in ai_classroom_sessions
  → Student views classroom
  → Takes quiz/assignments
  → System tracks engagement and mastery
```

#### 4. Progress Tracking Workflow
```
Teacher/Principal/Parent
  → View Student Progress Dashboard
  → See: Quiz grades, topic mastery, learning DNA match
  → View: Progress over time, risk indicators
  → Export: Reports, analytics
```

---

## Data Models

### 1. Course Management Models

#### Course (Enhanced)
**Location:** `db/schema.sql` → `courses` table  
**Current Status:** PARTIALLY EXISTS - needs enhancement  

**Model:**
```typescript
interface Course {
  id: UUID;                              // PK
  schoolId: UUID;                        // FK schools
  teacherId: UUID;                       // FK users (teacher)
  gradeId: UUID;                         // FK grade_levels
  classId?: UUID;                        // FK classes (optional - can be whole grade)
  subjectId: UUID;                       // FK subjects
  title: string;                         // e.g., "Grade 5 Mathematics"
  description: string;
  syllabusId?: UUID;                     // FK syllabi (when based on syllabus)
  status: 'draft' | 'published' | 'archived';
  startDate: Date;
  endDate: Date;
  totalEstimatedSessions: number;        // Sum of topic estimated sessions
  version: number;                       // For tracking updates
  metadata: {
    objectives: string[];
    prerequisites: string[];
    alignments?: string[];               // e.g., "Common Core"
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Course Calendar (New)
**Location:** `db/schema.sql` → `course_calendars` table  

**Model:**
```typescript
interface CourseCalendar {
  id: UUID;
  schoolId: UUID;
  courseId: UUID;
  
  // Regular schedule
  classSchedule: {
    monday?: TimeRange[];
    tuesday?: TimeRange[];
    // ... up to sunday
  };
  
  // Exclusions
  holidays: HolidayPeriod[];            // e.g., winter break
  noClassDates: Date[];                  // School/teacher specific no-class days
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface HolidayPeriod {
  name: string;                          // e.g., "Winter Break"
  startDate: Date;
  endDate: Date;
  type: 'school' | 'teacher' | 'public';
}

interface TimeRange {
  startTime: string;                     // HH:MM
  endTime: string;                       // HH:MM
}
```

#### Course Topic (Enhanced)
**Location:** `db/schema.sql` → `course_topics` table [NEW]  

**Model:**
```typescript
interface CourseTopic {
  id: UUID;
  courseId: UUID;
  topicId: UUID;                         // Reference to syllabus_topics
  schoolId: UUID;
  
  // Sequencing
  orderIndex: number;                    // Sequence within course
  estimatedSessions: number;             // How many classes to teach this
  dependsOnTopicIds: UUID[];             // Topic prerequisites
  
  // Content
  learningObjectives: string[];
  assessmentStrategy: 'quiz' | 'assignment' | 'both' | 'project';
  
  // Status
  status: 'planned' | 'in-progress' | 'completed';
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. Student Onboarding & Assessment Models

#### Student Profile (Enhanced)
**Location:** `db/schema.sql` → `student_profiles` table  
**Current Status:** PARTIALLY EXISTS - needs more fields

**Fields to Add:**
```typescript
interface StudentProfile {
  // ... existing fields ...
  
  // Onboarding
  onboardingCompleted: boolean;
  onboardingCompletedAt?: Timestamp;
  onboardingStep?: number;              // 1-5
  
  // Assessment
  currentGrade: string;                 // Current operational grade
  previousGrade: string;                // For diagnostic test
  selfRatedStrengths: string[];         // Student self-assessment
  selfRatedWeaknesses: string[];        // Student self-assessment
  confidenceScore: decimal (0-100);     // Student confidence in previous knowledge
  
  // Diagnostic test result
  diagnosticTestId?: UUID;              // Link to diagnostic test taken
  diagnosticScore?: decimal (0-100);
  diagnosticCompletedAt?: Timestamp;
  
  // Generated plan
  generatedLearningPlanId?: UUID;       // FK learning_plans
  planGeneratedAt?: Timestamp;
}
```

#### Student Onboarding Record (New)
**Location:** `db/schema.sql` → `student_onboardings` table [NEW]

**Model:**
```typescript
interface StudentOnboarding {
  id: UUID;
  studentId: UUID;                      // FK users
  schoolId: UUID;
  
  // Step tracking
  currentStep: number;                  // 1-5
  completedSteps: number[];             // [1, 2, 3, ...]
  
  // Step 1: Self-Assessment
  currentGrade: string;
  previousGrade: string;
  selfAssessment: {
    strengths: string[];
    weaknesses: string[];
    confidenceScore: number;
  };
  
  // Step 2: Diagnostic Test
  diagnosticTestId?: UUID;
  diagnosticScore?: number;
  diagnosticCompletedAt?: Timestamp;
  
  // Step 3: Learning DNA (Generated by backend)
  learningDnaId?: UUID;
  
  // Step 4: Learning Plan (Generated by backend)
  learningPlanId?: UUID;
  
  // Status
  status: 'in_progress' | 'completed';
  completedAt?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Diagnostic Test (Enhanced)
**Location:** `db/schema.sql` → `diagnostic_tests` table  
**Current Status:** EXISTS - needs enhancement

**Fields to Add:**
```typescript
interface DiagnosticTest {
  // ... existing fields ...
  
  studentId: UUID;                      // Link to student
  previousGradeId: UUID;                // Grade content to test
  sourceGrade: string;                  // For reference
  
  // Questions generated from previous-grade curriculum
  questions: {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    topic: string;                      // Which previous-grade topic
  }[];
  
  // Student responses
  studentResponses: {
    questionId: string;
    selectedOptionIndex: number;
    responseTime: number;                // Seconds to answer
    isCorrect: boolean;
  }[];
  
  // Analysis
  analysisResult: {
    totalQuestions: number;
    correctAnswers: number;
    score: number;                       // 0-100
    topicScores: Record<string, number>; // e.g., {addition: 85, subtraction: 60}
    weakAreas: string[];                 // Topics with <70% accuracy
    strongAreas: string[];               // Topics with >80% accuracy
  };
  
  completedAt?: Timestamp;
  tookTime: number;                      // Minutes
}
```

#### Learning DNA (Enhanced)
**Location:** `db/schema.sql` → `learning_dna` table  
**Current Status:** EXISTS - needs more fields

**Fields to Add:**
```typescript
interface LearningDNA {
  // ... existing fields ...
  
  // Derived from diagnostic test + self-assessment
  generationMethod: 'diagnostic' | 'initial_assessment' | 'manual';
  
  // Confidence alignment
  diagnosticConfidence: number;         // How confident was student in test?
  reportedConfidence: number;           // How confident did they claim to be?
  confidenceAlignment: 'aligned' | 'underestimated' | 'overestimated';
  
  // Detailed learning profile
  learningProfile: {
    paceType: 'fast' | 'medium' | 'slow';
    mistakeType: 'conceptual' | 'careless' | 'mixed';
    preferredStyle: 'visual' | 'text' | 'interactive' | 'story';
    recommendedTeachingStyle: 'friendly_tutor' | 'strict_instructor' | 'storyteller' | 'socratic';
  };
  
  // Remediation needs
  remediationNeeded: {
    topicId: UUID;
    reason: string;                     // 'scored_below_70' or similar
    priority: 'high' | 'medium' | 'low';
  }[];
  
  generatedAt: Timestamp;
  version: number;                      // For updates
}
```

#### Learning Plan (Enhanced)
**Location:** `db/schema.sql` → `learning_plans` table  
**Current Status:** EXISTS - needs enhancement

**Fields to Add:**
```typescript
interface LearningPlan {
  // ... existing fields ...
  
  studentId: UUID;
  schoolId: UUID;
  courseId: UUID;                       // FK courses
  learningDnaId: UUID;                  // FK learning_dna
  basedOnSyllabusId: UUID;              // Teacher's original syllabus
  
  // Original + Personalized
  originalSyllabus: SyllabusSnapshot;   // Teacher's syllabus structure
  personalizedSyllabus: {
    remediationTopics: {
      topicId: UUID;
      title: string;
      prerequisiteOf: UUID;             // Which main topic it remediates for
      position: 'before' | 'parallel';
      estimatedDays: number;
    }[];
    mainTopics: {
      topicId: UUID;
      title: string;
      estimatedDays: number;
      adjustedDifficulty: number;       // 1-10
      differentiation: string;          // How it's differentiated for this student
    }[];
  };
  
  // Schedule
  scheduledSessions: ScheduledClass[];
  
  // Status
  status: 'active' | 'completed' | 'paused';
  startDate: Date;
  projectedCompletionDate: Date;
  
  generatedAt: Timestamp;
}

interface ScheduledClass {
  id: UUID;
  learningPlanId: UUID;
  topicId: UUID;
  scheduledDate: Date;
  scheduledTime: TimeRange;
  isRemediationClass: boolean;
  estimatedDuration: number;            // Minutes
  status: 'scheduled' | 'completed' | 'skipped' | 'rescheduled';
}
```

---

## API Design

### 1. Course Management APIs

#### Teacher Course APIs

**POST /api/teacher/courses**
```typescript
// Create new course
Request: {
  gradeId: UUID;
  classId?: UUID;
  subjectId: UUID;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  syllabusId?: UUID;
}

Response: {
  success: boolean;
  course: Course;
  message: string;
}

Roles: ['teacher', 'principal']
School Isolation: ✓
```

**GET /api/teacher/courses**
```typescript
// List teacher's courses
Query: {
  limit?: number;
  offset?: number;
  gradeId?: UUID;
  status?: 'draft' | 'published' | 'archived';
}

Response: {
  success: boolean;
  courses: Course[];
  pagination: { total, limit, offset, hasMore };
}

Roles: ['teacher', 'principal']
```

**GET /api/teacher/courses/[courseId]**
```typescript
// Get single course with full details
Response: {
  success: boolean;
  course: Course;
  calendar: CourseCalendar;
  topics: CourseTopic[];
  enrolledStudents: number;
}

Roles: ['teacher', 'principal']
```

**PUT /api/teacher/courses/[courseId]**
```typescript
// Update course
Request: {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

Response: {
  success: boolean;
  course: Course;
}

Roles: ['teacher']
Ownership: teacherId === auth.userId
```

**POST /api/teacher/courses/[courseId]/topics**
```typescript
// Add/update topics in course
Request: {
  topics: {
    topicId: UUID;
    orderIndex: number;
    estimatedSessions: number;
    dependsOnTopicIds?: UUID[];
    assessmentStrategy?: string;
  }[];
}

Response: {
  success: boolean;
  topics: CourseTopic[];
}

Roles: ['teacher']
```

**POST /api/teacher/courses/[courseId]/calendar**
```typescript
// Setup course calendar
Request: {
  classSchedule: { monday?: TimeRange[] };
  holidays: HolidayPeriod[];
  noClassDates: Date[];
}

Response: {
  success: boolean;
  calendar: CourseCalendar;
}

Roles: ['teacher', 'principal']
```

#### Students Courses APIs

**GET /api/student/courses**
```typescript
// List student's enrolled courses
Response: {
  success: boolean;
  courses: (Course & { progress: StudentCourseProgress })[];
}

Roles: ['student']
School Isolation: auth.schoolId
```

**GET /api/student/courses/[courseId]/progress**
```typescript
// Get student progress in course
Response: {
  success: boolean;
  progress: {
    courseId: UUID;
    studentId: UUID;
    totalTopics: number;
    completedTopics: number;
    averageMastery: number;
    estimatedCompletionDate: Date;
    nextScheduledClass: ScheduledClass;
    recentQuizzes: QuizAttempt[];
  };
}

Roles: ['student']
```

### 2. Student Onboarding APIs

**GET /api/students/onboarding/status**
```typescript
// Check onboarding status
Response: {
  success: boolean;
  onboarding: {
    completed: boolean;
    currentStep?: number;
    completedSteps: number[];
  };
}

Roles: ['student']
```

**POST /api/students/onboarding/step1**
```typescript
// Step 1: Self-Assessment
Request: {
  currentGrade: string;
  previousGrade: string;
  selfAssessment: {
    strengths: string[];
    weaknesses: string[];
    confidenceScore: number;
  };
}

Response: {
  success: boolean;
  currentStep: number;
  message: string;
}

Roles: ['student']
```

**GET /api/students/onboarding/diagnostic-test**
```typescript
// Step 2: Get diagnostic test
Response: {
  success: boolean;
  test: {
    id: UUID;
    questions: {
      id: string;
      text: string;
      options: string[];
    }[];
  };
}

Roles: ['student']
```

**POST /api/students/onboarding/diagnostic-test/submit**
```typescript
// Submit diagnostic test responses
Request: {
  testId: UUID;
  responses: {
    questionId: string;
    selectedOptionIndex: number;
    responseTime: number;
  }[];
}

Response: {
  success: boolean;
  testResult: {
    score: number;
    topicScores: Record<string, number>;
    weakAreas: string[];
  };
  currentStep: number;
}

Roles: ['student']
```

**POST /api/students/onboarding/complete**
```typescript
// Step 4-5: Generate learning DNA + plan, then complete
Request: {
  // Empty - backend generates everything
}

Response: {
  success: boolean;
  learningDna: LearningDNA;
  learningPlan: LearningPlan;
  message: string;
}

Roles: ['student']
```

### 3. Learning Plan APIs

**GET /api/student/learning-plan**
```typescript
// Get student's current learning plan
Response: {
  success: boolean;
  plan: LearningPlan;
  nextClass: ScheduledClass;
  progressMetrics: {
    topicsCompleted: number;
    topicsInProgress: number;
    estimatedDaysRemaining: number;
  };
}

Roles: ['student']
```

**GET /api/student/learning-plan/schedule**
```typescript
// Get scheduled classes
Query: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

Response: {
  success: boolean;
  scheduledClasses: ScheduledClass[];
}

Roles: ['student']
```

### 4. Diagnostic Test APIs

**POST /api/diagnostic-tests/generate**
```typescript
// Generate diagnostic test from previous-grade curriculum
Request: {
  previousGradeId: UUID;
  numQuestions?: number;  // Default 30
  topicFilter?: string[]; // Specific topics to test
}

Response: {
  success: boolean;
  test: DiagnosticTest;
  message: string;
}

Roles: ['admin', 'teacher']  // For creating templates
```

### 5. Learning DNA APIs

**POST /api/learning-dna/generate**
```typescript
// Generate learning DNA from diagnostic test + self-assessment
Request: {
  studentId: UUID;
  diagnosticTestId: UUID;
  selfAssessmentData: {
    strengths: string[];
    weaknesses: string[];
    confidenceScore: number;
  };
}

Response: {
  success: boolean;
  learningDna: LearningDNA;
}

Roles: ['admin', 'teacher', 'supervisor']
```

### 6. Learning Plan Generation API

**POST /api/learning-plans/generate**
```typescript
// Generate personalized learning plan
Request: {
  studentId: UUID;
  courseId: UUID;
  learningDnaId: UUID;
  originallySyllabusId: UUID;
}

Response: {
  success: boolean;
  learningPlan: LearningPlan;
  scheduledSessionsCount: number;
}

Roles: ['admin', 'teacher', 'supervisor']
```

### 7. OpenMAIC Integration APIs

**POST /api/classroom/generate-session**
```typescript
// Generate classroom session via OpenMAIC
Request: {
  studentId: UUID;
  topicId: UUID;
  scheduledClassId: UUID;
  learningDnaId: UUID;
  difficulty?: number;  // 1-10
}

Response: {
  success: boolean;
  session: {
    id: UUID;
    classroomHtml: string;  // Rendered classroom
    transcript: string;
    videoUrl?: string;
    audioUrl?: string;
    metadata: {
      difficulty: number;
      teachingStyle: string;
      generatedAt: Timestamp;
    };
  };
}

Roles: ['student']
```

### 8. Progress & Analytics APIs

**GET /api/teacher/students/[studentId]/progress**
```typescript
// Teacher view of student progress
Response: {
  success: boolean;
  progress: {
    student: StudentProfile;
    enrolledCourses: Course[];
    learningPlan: LearningPlan;
    topicMastery: TopicMastery[];
    recentQuizzes: QuizAttempt[];
    learningDna: LearningDNA;
    riskIndicators: string[];
  };
}

Roles: ['teacher', 'principal']
```

**GET /api/principal/students/progress**
```typescript
// Principal view of all students
Query: {
  limit?: number;
  offset?: number;
  status?: 'on-track' | 'at-risk' | 'advanced';
}

Response: {
  success: boolean;
  students: StudentProgress[];
  pagination: Pagination;
}

Roles: ['principal']
```

**GET /api/parent/student/[childId]/progress**
```typescript
// Parent view of child's progress
Response: {
  success: boolean;
  progress: {
    studentName: string;
    courses: Course[];
    topicMastery: TopicMastery[];
    nextClassDate: Date;
    recentGrades: Grade[];
    learningDnaMatch: string;  // Summary
  };
}

Roles: ['parent']
```

---

## Frontend Components

### 1. Onboarding Components

#### OnboardingWizard (_components/onboarding/OnboardingWizard.tsx_)
```typescript
interface Props {
  studentId: string;
  onComplete: () => void;
}

// Manages multi-step wizard
// Renders appropriate step component based on currentStep
// Handles API calls between steps
```

#### Step1SelfAssessment (_components/onboarding/Step1SelfAssessment.tsx_)
```typescript
// Current Grade, Previous Grade Selection
// Self-rate Strengths/Weaknesses (checkboxes)
// Confidence Score Slider (0-100)
```

#### Step2DiagnosticTest (_components/onboarding/Step2DiagnosticTest.tsx_)
```typescript
// Display test questions
// Question: { text, options[], id }
// Track responses + response times
// Progress bar
// Submit button
```

#### Step3ReviewResults (_components/onboarding/Step3ReviewResults.tsx_)
```typescript
// Show diagnostic test results
// Display: Score, topic breakdowns, weak areas
// Show learning DNA generated
// Allow proceeding to learning plan
```

#### Step4ReviewPlan (_components/onboarding/Step4ReviewPlan.tsx_)
```typescript
// Show generated learning plan
// Display: Original syllabus vs. personalized
// Show remediation topics
// Show schedule
// Allow adjustments or approval
```

### 2. Course Management Components

#### CourseForm (_components/teacher/CourseForm.tsx_)
```typescript
// Form for creating/editing courses
// Grade selector, Subject selector, Class selector
// Date pickers (start, end)
// Syllabus upload or selection
```

#### CourseTopicManager (_components/teacher/CourseTopicManager.tsx_)
```typescript
// Add/reorder topics in course
// Drag-and-drop reordering
// Set: estSessions, dependencies, assessment strategy
// Preview course schedule
```

#### CourseCalendarManager (_components/teacher/CourseCalendarManager.tsx_)
```typescript
// Setup class schedule (weekly timetable)
// Add school holidays
// Add teacher no-class dates
// Preview calendar view
```

#### CourseList (_components/teacher/CourseList.tsx_)
```typescript
// Table of teacher's courses
// Columns: title, grade, status, students, progress
// Allow filter by status, grade
// Link to course details
```

### 3. Student Learning Plan Components

#### LearningPlanOverview (_components/student/LearningPlanOverview.tsx_)
```typescript
// Show personalized learning plan
// Original vs. personalized syllabus comparison
// Progress through topics
// Next scheduled class
```

#### LearningSchedule (_components/student/LearningSchedule.tsx_)
```typescript
// Calendar view of scheduled classes
// Timeline view
// Show: topic, date, time, status
// Link to join class
```

#### LearningDNADisplay (_components/student/LearningDNADisplay.tsx_)
```typescript
// Show learning DNA profile
// Display: pace type, mistake type, preferred style
// Recommended teaching approach
// Tips based on DNA
```

### 4. Progress Tracking Components

#### StudentProgressCard (_components/dashboard/StudentProgressCard.tsx_)
```typescript
// Show student's overall progress
// Topics completed: x/y
// Average mastery: x%
// Next class: date, time, topic
```

#### TopicMasteryGauge (_components/visualization/TopicMasteryGauge.tsx_)
```typescript
// Circular gauge for single topic
// Color-coded by performance
// Show attempts, last attempt date
```

#### QuizGradesList (_components/student/QuizGradesList.tsx_)
```typescript
// Table of quiz attempts
// Columns: topic, date, score, time
// Allow filter by date range
// Show trends
```

#### StudentRiskIndicator (_components/teacher/StudentRiskIndicator.tsx_)
```typescript
// Red/yellow/green indicator
// Show risk factors
// Recommendations for intervention
```

---

## Frontend Pages

### 1. Teacher Pages

#### /app/dashboard/teacher/courses/page.tsx
- List teacher's courses
- Create new course button
- Filter by status, grade
- Link to course details

#### /app/dashboard/teacher/courses/[courseId]/page.tsx
- Course details, stats
- Edit course info
- Manage topics (drag-drop)
- Manage calendar
- View enrolled students

#### /app/dashboard/teacher/courses/[courseId]/students/page.tsx
- List students in course
- Individual progress view
- Generate learning plans manually (if needed)
- View learning DNA

#### /app/dashboard/teacher/students/[studentId]/progress/page.tsx
- Comprehensive view of student progress
- All courses, topics, grades
- Learning DNA match summary
- Recommendations

### 2. Student Pages

#### /app/dashboard/student/onboarding/page.tsx
- Multi-step onboarding wizard
- Renders based on currentStep
- Progress tracking

#### /app/dashboard/student/learning-plan/page.tsx
- Show personalized learning plan
- Original vs. customized topics
- Schedule overview
- Next class info

#### /app/dashboard/student/schedule/page.tsx
- Calendar of scheduled classes
- Upcoming classes
- Join/start class button
- Reschedule options

#### /app/dashboard/student/progress/page.tsx
- Topic mastery overview
- Quiz grades history
- Learning patterns
- Time investment

#### /app/dashboard/student/learning-dna/page.tsx
- Display learning DNA
- Recommendations based on DNA
- Tips for optimal learning
- Comparison with class average

### 3. Principal Pages

#### /app/dashboard/principal/students/progress/page.tsx
- Overview of all students
- Filter by status: on-track, at-risk, advanced
- Sort by mastery, engagement
- Bulk actions: message, export

#### /app/dashboard/principal/courses/page.tsx
- All courses across school
- Enrolment numbers
- Completion rates
- Teacher filters

### 4. Parent Pages

#### /app/dashboard/parent/child/[childId]/progress/page.tsx
- Child's course progress
- Topic-wise mastery
- Recent grades
- Next scheduled class

---

## Workflow Implementation Order

### Phase 1: Foundation (Week 1)
1. **Database Migrations**
   - Add missing columns to student_profiles
   - Create course_calendars table
   - Create course_topics table
   - Create student_onboardings table
   - Enhance diagnostic_tests table
   - Enhance learning_dna table
   - Enhance learning_plans table

2. **Models**
   - Create course-models.ts with all interfaces
   - Extend student-models.ts
   - Create onboarding-models.ts

3. **Repositories** (Data Access)
   - course-repository.ts: CRUD for courses
   - course-calendar-repository.ts: Calendar scheduling
   - course-topic-repository.ts: Topic ordering
   - student-onboarding-repository.ts: Onboarding tracking

### Phase 2: Services (Week 2)
1. **Core Services**
   - course-service.ts: Create, list, update courses
   - course-calendar-service.ts: Calendar logic, holiday handling
   - course-topic-service.ts: Topic ordering, dependencies
   - student-onboarding-service.ts: Multi-step tracking

2. **Diagnostic & Learning DNA**
   - diagnostic-test-service.ts: Generate tests, score, analyze
   - learning-dna-service.ts: Generate DNA from test + self-assessment

3. **Learning Plan**
   - learning-plan-generation-service.ts: Core plan generation logic
   - personalized-syllabus-service.ts: Add remediation, adjust schedule
   - schedule-generation-service.ts: Respect calendar, create schedule

### Phase 3: Backend APIs (Week 3)
1. **Teacher Course APIs**
   - POST /api/teacher/courses (create)
   - GET /api/teacher/courses (list)
   - GET /api/teacher/courses/[courseId] (get)
   - PUT /api/teacher/courses/[courseId] (update)
   - POST /api/teacher/courses/[courseId]/topics (manage topics)
   - POST /api/teacher/courses/[courseId]/calendar (set calendar)

2. **Student Onboarding APIs**
   - GET /api/students/onboarding/status
   - POST /api/students/onboarding/step1
   - GET /api/students/onboarding/diagnostic-test
   - POST /api/students/onboarding/diagnostic-test/submit
   - POST /api/students/onboarding/complete

3. **Learning Plan APIs**
   - GET /api/student/learning-plan
   - GET /api/student/learning-plan/schedule
   - POST /api/learning-plans/generate (internal/admin)

4. **Progress APIs**
   - GET /api/teacher/students/[studentId]/progress
   - GET /api/principal/students/progress
   - GET /api/parent/student/[childId]/progress

### Phase 4: Frontend Components (Week 4)
1. **Onboarding Components**
   - OnboardingWizard
   - Step1SelfAssessment
   - Step2DiagnosticTest
   - Step3ReviewResults
   - Step4ReviewPlan

2. **Course Management Components**
   - CourseForm
   - CourseTopicManager
   - CourseCalendarManager
   - CourseList

3. **Student Components**
   - LearningPlanOverview
   - LearningSchedule
   - LearningDNADisplay

4. **Progress Components**
   - StudentProgressCard
   - TopicMasteryGauge
   - QuizGradesList
   - StudentRiskIndicator

### Phase 5: Frontend Pages (Week 5)
1. **Teacher Pages**
   - /dashboard/teacher/courses
   - /dashboard/teacher/courses/[courseId]
   - /dashboard/teacher/courses/[courseId]/students
   - /dashboard/teacher/students/[studentId]/progress

2. **Student Pages**
   - /dashboard/student/onboarding
   - /dashboard/student/learning-plan
   - /dashboard/student/schedule
   - /dashboard/student/progress

3. **Principal/Parent Pages**
   - /dashboard/principal/students/progress
   - /dashboard/parent/child/[childId]/progress

### Phase 6: OpenMAIC Integration (Week 6)
1. **Classroom Session Generation**
   - openmaic-classroom-service.ts: Integration service
   - POST /api/classroom/generate-session: Frontend API
   - Store session in ai_classroom_sessions

2. **Classroom Page**
   - /dashboard/student/classroom/[sessionId]
   - Render classroom output

### Phase 7: Testing & Polish (Week 7)
1. **End-to-End Testing**
   - Teacher creates course workflow
   - Student onboarding end-to-end
   - Learning plan generation
   - Progress tracking

2. **Performance Optimization**
   - Index optimization
   - Query optimization
   - Caching

3. **Polish & Documentation**
   - Error handling improvements
   - User guidance
   - Documentation

---

## Code Changes by Module

### Database Layer
- `db/schema.sql`: Add new tables + migrate existing
- Migrations scripts (structure varies by ORM)

### Model Layer
- `lib/models/course-models.ts` (NEW)
- `lib/models/onboarding-models.ts` (NEW)
- `lib/models/entity-models.ts` (EXTEND)

### Repository Layer
- `lib/repositories/course-repository.ts` (NEW)
- `lib/repositories/course-topic-repository.ts` (NEW)
- `lib/repositories/course-calendar-repository.ts` (NEW)
- `lib/repositories/student-onboarding-repository.ts` (NEW)
- `lib/repositories/diagnostic-test-repository.ts` (EXTEND)

### Service Layer
- `lib/services/course-service.ts` (NEW)
- `lib/services/course-calendar-service.ts` (NEW)
- `lib/services/diagnostic-test-service.ts` (EXTEND)
- `lib/services/learning-dna-service.ts` (EXTEND)
- `lib/services/learning-plan-generation-service.ts` (ENHANCE)
- `lib/services/personalized-syllabus-service.ts` (NEW)
- `lib/services/student-onboarding-service.ts` (ENHANCE)

### API Layer
- `app/api/teacher/courses/route.ts` (NEW)
- `app/api/teacher/courses/[courseId]/route.ts` (NEW)
- `app/api/teacher/courses/[courseId]/topics/route.ts` (NEW)
- `app/api/teacher/courses/[courseId]/calendar/route.ts` (NEW)
- `app/api/students/onboarding/step1/route.ts` (NEW)
- `app/api/students/onboarding/diagnostic-test/route.ts` (NEW)
- `app/api/students/onboarding/diagnostic-test/submit/route.ts` (NEW)
- `app/api/student/learning-plan/route.ts` (NEW)
- `app/api/student/learning-plan/schedule/route.ts` (NEW)
- `app/api/learning-plans/generate/route.ts` (NEW)
- `app/api/classroom/generate-session/route.ts` (NEW/ENHANCE)
- `app/api/teacher/students/[studentId]/progress/route.ts` (NEW)
- `app/api/principal/students/progress/route.ts` (NEW)

### Frontend Components
- `components/onboarding/OnboardingWizard.tsx` (NEW)
- `components/onboarding/Step1SelfAssessment.tsx` (NEW)
- `components/onboarding/Step2DiagnosticTest.tsx` (NEW)
- `components/onboarding/Step3ReviewResults.tsx` (NEW)
- `components/onboarding/Step4ReviewPlan.tsx` (NEW)
- `components/teacher/CourseForm.tsx` (NEW)
- `components/teacher/CourseTopicManager.tsx` (NEW)
- `components/teacher/CourseCalendarManager.tsx` (NEW)
- `components/teacher/CourseList.tsx` (NEW)
- `components/student/LearningPlanOverview.tsx` (NEW)
- `components/student/LearningSchedule.tsx` (NEW)
- `components/student/LearningDNADisplay.tsx` (NEW)
- `components/dashboard/StudentProgressCard.tsx` (NEW)
- `components/visualization/TopicMasteryGauge.tsx` (NEW)

### Frontend Pages
- `app/dashboard/student/onboarding/page.tsx` (NEW/ENHANCE)
- `app/dashboard/student/learning-plan/page.tsx` (NEW)
- `app/dashboard/student/schedule/page.tsx` (NEW)
- `app/dashboard/student/progress/page.tsx` (NEW)
- `app/dashboard/student/learning-dna/page.tsx` (NEW)
- `app/dashboard/teacher/courses/page.tsx` (NEW)
- `app/dashboard/teacher/courses/[courseId]/page.tsx` (NEW)
- `app/dashboard/teacher/courses/[courseId]/students/page.tsx` (NEW)
- `app/dashboard/teacher/students/[studentId]/progress/page.tsx` (NEW)
- `app/dashboard/principal/students/progress/page.tsx` (NEW)
- `app/dashboard/principal/courses/page.tsx` (NEW)
- `app/dashboard/parent/child/[childId]/progress/page.tsx` (NEW)
- `app/dashboard/student/classroom/[sessionId]/page.tsx` (NEW)

### Middleware/Auth
- `lib/middleware/auth.ts` (EXTEND - handle onboarding redirect)

---

## Integration Points

### 1. With Existing Syllabus System
- Leverage `syllabi`, `syllabus_topics`, `syllabus_units` tables
- Use `syllabus-service.ts` for parsing teachersyllabi uploads
- Reference topics instead of creating new ones

### 2. With Existing AI Classroom
- Use `ai_classroom_sessions` table
- Integrate with OpenMAIC API (openmaic-session-service.ts)
- Pass learning DNA and student context to classroom generation

### 3. With Existing Quiz/Assessment System
- Link to `quiz_attempts` for grade tracking
- Use `topic_mastery` for progress measurement
- Continue using existing quizzes for assessment

### 4. With Existing Learning DNA System
- Enhance existing `learning_dna` table
- Build on `learning-dna-service.ts`
- Save learning DNA alignment from diagnostic test

### 5. With Existing Auth System
- Use `withRole()` middleware for API protection
- Leverage existing JWT/session system
- Extend schools/users tables (no schema changes for auth)

### 6. With Existing Dashboard
- Use existing layout, navigation, components
- Follow established patterns (useEffect, fetch, state management)
- Maintain consistent styling with TailwindCSS

---

## Success Criteria

- [ ] Teachers can create courses with full syllabus management
- [ ] Course calendar respects holidays and no-class dates
- [ ] New students trigger onboarding automatically
- [ ] Students complete 5-step onboarding
- [ ] Diagnostic test generates and scores correctly
- [ ] Learning DNA profile created from diagnostic + self-assessment
- [ ] Personalized learning plan generated with remediation
- [ ] Schedule respects calendar exclusions
- [ ] OpenMAIC classroom sessions generate correctly
- [ ] All roles can view appropriate progress dashboards
- [ ] System is production-ready with error handling
- [ ] Documentation complete

