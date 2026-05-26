# AI School Platform - Implementation Guide

This document describes the multi-tenant AI school platform built on top of LearnAI, with authentication, curriculum management, student onboarding, and adaptive learning.

## Architecture Overview

### Layers

```
┌─────────────────────────────────────────────┐
│  UI Layer (Dashboards & Student Interfaces) │
├─────────────────────────────────────────────┤
│  API Layer (REST endpoints for all roles)   │
├─────────────────────────────────────────────┤
│  Service Layer (Business Logic)             │
│  ├─ Auth Service                            │
│  ├─ School Management                       │
│  ├─ Curriculum & Topics                     │
│  ├─ Student Profiles                        │
│  ├─ Learning Journey Engine                 │
│  ├─ Progress Tracking                       │
│  └─ Personalized Lesson Generation          │
├─────────────────────────────────────────────┤
│  LearnAI Core (Reused)                     │
│  ├─ Lesson Generation Engine                │
│  ├─ Multi-Agent Orchestration               │
│  ├─ Scene Rendering                         │
│  └─ Media Generation                        │
├─────────────────────────────────────────────┤
│  Data Layer                                 │
│  ├─ PostgreSQL (structured data)            │
│  ├─ IndexedDB (browser playback state)      │
│  └─ File Storage (PPTX exports)             │
└─────────────────────────────────────────────┘
```

## Core Components Implemented

### 1. Authentication & Authorization (✅ Complete)

**Files**:
- `lib/auth/jwt.ts` - JWT generation and verification
- `lib/auth/password.ts` - Password hashing and verification
- `lib/middleware/auth.ts` - Auth middleware for API routes
- `lib/types/auth.ts` - Authentication types
- `app/api/auth/login/route.ts` - Login endpoint
- `app/api/auth/signup/route.ts` - Registration endpoint
- `app/api/auth/refresh/route.ts` - Token refresh
- `app/api/auth/logout/route.ts` - Logout endpoint

**Features**:
- JWT-based authentication with 24h token, 7d refresh token
- Role-based access control (RBAC): `saas_admin`, `principal`, `teacher`, `student`
- Password hashing with bcryptjs (or fallback crypto)
- Session tracking and audit logging
- Multi-school support with scoped login

**Usage**:
```bash
# Login
POST /api/auth/login
{
  "email": "student@school.edu",
  "password": "password123",
  "schoolId": "uuid"
}

# Response
{
  "token": "jwt...",
  "refreshToken": "refresh...",
  "user": { id, email, role, schoolId, ... },
  "expiresIn": 86400
}
```

### 2. Database Schema (✅ Complete)

**File**: `db/schema.sql`

**Tables** (Multi-tenant SaaS with tenant_id isolation):
- `schools` - Schools/tenants
- `users` - All roles (student, teacher, principal, etc.)
- `student_profiles` - Student learning profiles
- `classes` - Student groupings
- `curriculum` - Curriculum sets by school/teacher
- `topics` - Individual learning topics
- `topic_mastery` - Student mastery tracking per topic
- `learning_plans` - Personalized learning journeys
- `lessons` - AI-generated lessons
- `quiz_attempts` - Student quiz history
- `engagement_signals` - Student engagement metrics
- `user_sessions` - Session tracking
- `audit_logs` - Action logging for compliance

**Key Principles**:
- All school-owned data has `school_id` for tenant isolation
- Strong foreign keys and indexes for performance
- Soft deletes where needed (deleted_at)
- Audit logging for compliance

### 3. Tenant Isolation (✅ Complete)

**File**: `lib/middleware/tenant.ts`

**Features**:
- Automatic tenant scoping via `withTenant` middleware
- Cross-tenant access prevention
- SaaS admin bypass (full data access)
- Tenant filter helpers for queries

### 4. School Management Service (✅ Complete)

**File**: `lib/school/school-service.ts`

**Functions**:
- `getSchool(schoolId)` - Fetch school data
- `createSchool(req)` - SaaS admin creates school
- `getSchoolStats(schoolId)` - Student/teacher/class counts
- `listSchoolUsers(schoolId, role)` - List users by role

### 5. Student Service (✅ Complete)

**File**: `lib/student/student-service.ts`

**Functions**:
- `getStudentProfile(studentId)` - Fetch profile
- `completeOnboarding(studentId, input)` - Finish onboarding workflow
- `setDiagnosticScore(studentId, score)` - Save diagnostic quiz score
- `listStudents(schoolId)` - List all students in school

**Onboarding Data**:
- Grade level
- Interests (array)
- Strengths (array)
- Weak areas (array)
- Learning style (visual, auditory, kinesthetic, reading)
- Language preference

### 6. Curriculum Management (✅ Complete)

**File**: `lib/curriculum/curriculum-service.ts`

**Functions**:
- `createCurriculum(schoolId, name, subject, gradeLevel)` - Create curriculum
- `createTopic(curriculumId, title, learningObjectives, gradeLevel, order)` - Add topic
- `getTopic(topicId)` - Fetch topic
- `listTopics(curriculumId)` - List all topics in curriculum
- `listCurricula(schoolId)` - List all curricula

**Structure**:
```
School
  └─ Curriculum (e.g., "Grade 5 Math")
      └─ Topics (e.g., "Fractions", "Decimals")
          ├─ Learning Objectives
          ├─ Grade Level
          ├─ Prerequisites
          └─ Estimated Duration
```

### 7. Progress Tracking (✅ Complete)

**File**: `lib/progress/progress-service.ts`

**Functions**:
- `recordQuizAttempt(...)` - Log quiz submission
- `updateTopicMastery(...)` - Update mastery score
- `getTopicMastery(studentId, topicId)` - Fetch mastery
- `getStudentQuizAttempts(studentId)` - Quiz history
- `getClassProgressSummary(classId)` - Class-level analytics

**Mastery Calculation**:
- Scores start at 0, increase with quiz attempts
- Confidence = % of correct attempts
- Mastered when score >= 80
- Average of all attempts tracked

### 8. Learning Journey Engine (✅ Complete)

**File**: `lib/student/learning-journey.ts`

**Functions**:
- `getNextRecommendedTopic(studentId, curriculumId)` - Recommend next topic
- `updateLearningPlan(studentId)` - Update student's plan
- `getProgressSummary(studentId, curriculumId)` - Overall progress
- `estimateCompletionDate(topicsRemaining, avgMastery)` - Predict end date

**Algorithm**:
1. Find first unmasteredtopic in curriculum order
2. Check prerequisites are met
3. If all topics mastered: suggest revision (low scores) or enrichment (excellent)
4. Adapt pacing based on mastery: slower if struggling, faster if excelling

### 9. Personalized Lesson Generation (✅ Complete)

**File**: `lib/generation/personalized-generator.ts`

**Functions**:
- `generatePersonalizedLessonOutlines(topic, studentProfile, ...)` - Generate adapted scenes
- `getPersonalizedTeacherPrompt(studentProfile)` - Customize AI teacher persona
- `generateRemediationLesson(topic, studentProfile, failedConcepts)` - Simplified content
- `generateEnrichmentLesson(topic, studentProfile)` - Advanced content

**Adaptation Factors**:
- Grade level-based difficulty (1-10 scale)
- Learning style (visual, auditory, kinesthetic, reading)
- Student interests (integrated into examples)
- Strengths/weaknesses (adjusted complexity)
- Current mastery score (adaptive difficulty)
- Language preference

**Example Prompt Injection**:
```
Student Level: Grade 5
Interests: sports, space, cooking
Learning Style: visual
Mastery: 45% (struggling)

→ Difficulty: 3/10
→ Extra visual examples
→ Simpler language
→ More practice steps
→ Sports/space references
```

### 10. API Endpoints (✅ Complete)

**Authentication**:
- `POST /api/auth/login` - Student/teacher login
- `POST /api/auth/signup` - New user registration
- `POST /api/auth/refresh` - Refresh JWT
- `POST /api/auth/logout` - Logout and audit

**Student Profile**:
- `GET /api/students/profile` - Get student profile
- `POST /api/students/onboarding` - Complete onboarding

**Progress**:
- `GET /api/students/progress` - Quiz history and mastery

**Lessons**:
- `POST /api/lessons/generate` - Generate personalized lesson

## Setup Guide

### Prerequisites
- Node.js 20+
- PostgreSQL 13+
- npm/pnpm

### Installation

1. **Install dependencies**:
```bash
pnpm install
npm install bcryptjs pg jose  # Additional packages
```

2. **Create database**:
```bash
createdb ai_school_db
```

3. **Run migrations**:
```bash
psql ai_school_db < db/schema.sql
```

4. **Configure environment**:
```bash
cp .env.school .env.local
# Edit .env.local with your credentials
```

5. **Initialize database**:
```bash
# In your Next.js app startup:
import { initializeDatabase } from '@/lib/db';
await initializeDatabase();
```

6. **Start development**:
```bash
pnpm dev
```

## Usage Examples

### As a SaaS Admin: Create School

```typescript
import { createSchool } from '@/lib/school/school-service';

const school = await createSchool({
  name: 'Lincoln Elementary',
  domain: 'lincoln.aischool.edu',
  subscriptionTier: 'premium',
  maxStudents: 500,
  maxTeachers: 50,
});
```

### As a Teacher: Create Curriculum

```typescript
import { createCurriculum, createTopic } from '@/lib/curriculum/curriculum-service';

const curriculum = await createCurriculum(
  schoolId,
  'Grade 5 Mathematics',
  'math',
  '5'
);

const topic = await createTopic(
  curriculum.id,
  'Fractions',
  ['Understand numerators and denominators', 'Add fractions', 'Multiply fractions'],
  '5',
  1 // order index
);
```

### As a Student: Complete Onboarding

```typescript
import { completeOnboarding } from '@/lib/student/student-service';

const profile = await completeOnboarding(studentId, schoolId, {
  gradeLevel: '5',
  interests: ['sports', 'art', 'space'],
  strengths: ['visual learning', 'creativity'],
  weakAreas: ['math computation'],
  learningStyle: 'visual',
  languagePreference: 'en-US',
});
```

### Generate Personalized Lesson

```typescript
import { generatePersonalizedLessonOutlines } from '@/lib/generation/personalized-generator';

const outlines = await generatePersonalizedLessonOutlines(
  topic,
  studentProfile,
  'Focus on real-world applications'
);
// Returns array of SceneOutline objects from LearnAI
```

### Track Progress

```typescript
import { recordQuizAttempt } from '@/lib/progress/progress-service';

await recordQuizAttempt(
  studentId,
  lessonId,
  schoolId,
  topicId,
  85, // score
  100, // maxScore
 600, // timeTaken (seconds)
  responses,
  feedback
);
// Automatically updates mastery score
```

## Security Considerations

1. **Multi-Tenancy**:
   - All queries filtered by `school_id`
   - Middleware enforces tenant isolation
   - SaaS admin bypass for administration

2. **Authentication**:
   - JWT signed with secret (change in production!)
   - 24-hour expiry for access tokens
   - 7-day refresh tokens
   - Refresh tokens should be stored securely (HTTP-only cookies recommended)

3. **Authorization**:
   - Role-based access control via middleware
   - Endpoint-level permission checks
   - Audit logging for compliance

4. **Data Protection**:
   - Use HTTPS in production
   - Encrypt passwords with bcryptjs
   - Implement rate limiting on auth endpoints
   - Consider GDPR/COPPA compliance for student data

## Next Steps (Not Yet Implemented)

1. **UI Layer**: Build dashboards for all roles
2. **Teacher Dashboard**: Lesson management, progress monitoring, class oversight
3. **Student Dashboard**: Learning journey, lessons, quizzes, progress visualization
4. **Admin Dashboard**: Analytics, user management, subscription management
5. **Engagement Signals**: Detect and respond to low engagement
6. **Parent Portal**: Guardian access (read-only) to student progress
7. **Integration Tests**: Comprehensive test suite
8. **Production Deployment**: Docker, load testing, monitoring

## Database Maintenance

### Backup
```bash
pg_dump ai_school_db > backup.sql
```

### Restore
```bash
psql ai_school_db < backup.sql
```

### Monitoring Queries
```sql
-- Check per-school stats
SELECT s.name, COUNT(DISTINCT u.id) as users, COUNT(DISTINCT l.id) as lessons
FROM schools s
LEFT JOIN users u ON s.id = u.school_id
LEFT JOIN lessons l ON s.id = l.school_id
GROUP BY s.id;

-- Check student progress
SELECT u.first_name, COUNT(tm.id) as topics_mastered, AVG(tm.mastery_score) as avg_score
FROM users u
LEFT JOIN topic_mastery tm ON u.id = tm.student_id
WHERE u.school_id = $1 AND u.role = 'student'
GROUP BY u.id;
```

## Troubleshooting

### "Token verification failed"
- Check JWT_SECRET is same across restarts
- Verify token hasn't expired
- Ensure Authorization header uses "Bearer " prefix

### "Cross-tenant access"
- Check schoolId in auth context
- Verify all queries include school_id filter
- Use middleware helpers for automatic filtering

### "Student profile not found"
- Ensure profile was created during signup
- Check student_profiles table has entry
- Verify student exists and is active

## License
AGPL-3.0 (same as LearnAI)
