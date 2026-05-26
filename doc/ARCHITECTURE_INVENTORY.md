# LearnAI Codebase - Complete Architecture Inventory

**Date**: March 22, 2026  
**Analyzed**: Full codebase across lib/, app/api/, db/, and docs/  
**Focus**: Multi-tenant AI education SaaS platform built on LearnAI core

---

## 📊 QUICK REFERENCE TABLE

| Layer | Component | Status | Coverage |
|-------|-----------|--------|----------|
| **Data Models** | Users/Roles | ✅ Complete | 5 roles, multi-tenant |
| **Data Models** | Schools | ✅ Complete | Tenant isolation ready |
| **Data Models** | Students/Profiles | ✅ Complete | Full onboarding flow |
| **Data Models** | Curriculum/Topics | ✅ Complete | Hierarchical structure |
| **Data Models** | Assessment/Mastery | ✅ Complete | Progress tracking |
| **Data Models** | Lessons/Generation | ✅ Complete | With LearnAI integration |
| **Data Models** | Engagement/Signals | ⚠️ Table only | No service layer |
| **Data Models** | Billing/Payments | ⚠️ Scaffolded | Stripe integration partial |
| **Data Models** | API Keys/Security | ✅ Complete | Full lifecycle |
| **Data Access** | DB Connection | ✅ Complete | Pooled, transactional |
| **Data Access** | Service Layer | ⚠️ Functional | No repository pattern |
| **Data Access** | Query Building | 🔴 Missing | Raw SQL strings |
| **Data Access** | Caching | 🔴 Missing | No Redis layer |
| **Services** | Authentication | ✅ 90% | JWT, passwords, no 2FA |
| **Services** | School Management | ✅ 80% | CRUD + stats, no limits |
| **Services** | Student Management | ✅ 75% | CRUD, no bulk import |
| **Services** | Curriculum | ✅ 70% | CRUD, no validation |
| **Services** | Progress/Mastery | ✅ 85% | Tracking + updates |
| **Services** | Learning Journeys | 🟡 50% | Skeleton architecture |
| **Services** | Personalization | ✅ 85% | Adaptive generation |
| **Services** | Engagement | 🔴 0% | Missing entirely |
| **Services** | Analytics | 🔴 0% | Missing |
| **Services** | Notifications | 🔴 0% | Missing |
| **API Routes** | Auth | ✅ Complete | Signup, login, logout, refresh |
| **API Routes** | Students | ✅ 80% | Onboarding, progress |
| **API Routes** | Lessons | ✅ 80% | Generate, fetch |
| **API Routes** | School Mgmt | ✅ 85% | Classes, students, payments |
| **API Routes** | Billing | ✅ 80% | Plans, invoices, checkout |
| **Middleware** | Authentication | ✅ Complete | JWT validation |
| **Middleware** | Authorization (RBAC) | ✅ Complete | 5 roles enforced |
| **Middleware** | Tenant Isolation | ✅ Complete | school_id filtering |
| **Middleware** | Rate Limiting | 🔴 Missing | Not implemented |
| **Middleware** | Input Validation | 🔴 Missing | No schema validation |

---

## 1️⃣ EXISTING DATA MODELS

### 1.1 Users & Authentication

**Location**: `lib/types/auth.ts`, `db/schema.sql`

**User Roles** (5 roles):
```
saas_admin    → Platform administrator (global)
principal     → School administrator
teacher       → Classroom teacher
student       → Student learner
accountant    → Financial officer
```

**User Table** (Multi-tenant):
```sql
users {
  id: UUID PRIMARY KEY
  school_id: UUID [NULL for saas_admin]
  email: VARCHAR [UNIQUE GLOBALLY]
  password_hash: VARCHAR
  role: VARCHAR
  first_name, last_name: VARCHAR
  avatar_url: VARCHAR
  is_active, email_verified: BOOLEAN
  last_login_at: TIMESTAMP
  created_at, updated_at: TIMESTAMP
}
```

**Auth Context** (Runtime):
```typescript
interface AuthContext {
  userId: string
  schoolId?: string
  role: UserRole
  email: string
}
```

**Tokens**:
- JWT: 24-hour access tokens (HS256)
- Refresh: 7-day refresh tokens

**Service**: `lib/auth/jwt.ts`, `lib/auth/password.ts`

---

### 1.2 Schools (Tenants)

**Location**: `db/schema.sql`

```sql
schools {
  id: UUID PRIMARY KEY
  name, domain: VARCHAR
  logo_url, branding: JSONB
  subscription_tier: VARCHAR (basic|premium|enterprise)
  max_students, max_teachers: INTEGER
  stripe_customer_id: VARCHAR
  subscription_status: VARCHAR (active|past_due|cancelled)
}
```

**Key Features**:
- ✅ Isolated schools (all data includes school_id)
- ✅ Subscription tiers with limits
- ✅ Stripe integration
- ✅ Custom branding support

**Service**: `lib/school/school-service.ts`
- `getSchool(schoolId)`
- `createSchool(req)`
- `getSchoolStats(schoolId)` → {studentCount, teacherCount, classCount, lessonCount}

---

### 1.3 Student Profiles

**Location**: `db/schema.sql`, `lib/student/student-service.ts`

```sql
student_profiles {
  id, user_id, school_id: UUID
  grade_level: VARCHAR (K, 1-12, college)
  interests: TEXT[] ([interest, interest, ...])
  strengths, weak_areas: TEXT[]
  learning_style: VARCHAR (visual|auditory|kinesthetic|reading)
  language_preference: VARCHAR (en-US, zh-CN)
  onboarding_completed: BOOLEAN
  diagnostic_score: DECIMAL
  preferred_ai_teacher_persona: VARCHAR
}
```

**Service Functions**:
```typescript
getStudentProfile(studentId): Promise<StudentProfile>
completeOnboarding(studentId, schoolId, input): Promise<StudentProfile>
setDiagnosticScore(studentId, score): Promise<void>
listStudents(schoolId, limit, offset): Promise<StudentProfile[]>
```

---

### 1.4 Curriculum & Topics

**Location**: `lib/curriculum/curriculum-service.ts`

**Curriculum** (Subject area, school-specific):
```sql
curriculum {
  id, school_id: UUID
  name: VARCHAR
  subject: VARCHAR (math, science, english, etc.)
  grade_level: VARCHAR
  created_by_teacher_id: UUID
  is_core: BOOLEAN
}
```

**Topics** (Learning units within curriculum):
```sql
topics {
  id, curriculum_id, school_id: UUID
  title: VARCHAR
  learning_objectives: TEXT[] ([objective, ...])
  grade_level: VARCHAR
  order_index: INTEGER
  estimated_duration_minutes: INTEGER
  prerequisites: TEXT[] ([topic_id, ...])
}
```

**Service Functions**:
```typescript
createCurriculum(schoolId, name, subject, gradeLevel): Promise<CurriculumData>
createTopic(curriculumId, schoolId, title, objectives, grade, order): Promise<TopicData>
getTopic(topicId): Promise<TopicData>
listTopics(curriculumId): Promise<TopicData[]>
listCurricula(schoolId): Promise<CurriculumData[]>
```

---

### 1.5 Assessments & Progress

**Location**: `lib/progress/progress-service.ts`

**Topic Mastery** (Student's proficiency per topic):
```sql
topic_mastery {
  id, student_id, topic_id, school_id: UUID
  mastery_score: DECIMAL (0-100)
  confidence_level: DECIMAL (0-100) [% correct]
  attempts: INTEGER
  correct_attempts: INTEGER
  last_attempted_at, mastered_at: TIMESTAMP
  UNIQUE(student_id, topic_id)
}
```

**Quiz Attempts** (Assessment results):
```sql
quiz_attempts {
  id, student_id, lesson_id, topic_id, school_id: UUID
  score, max_score: DECIMAL
  time_taken_seconds: INTEGER
  started_at, completed_at: TIMESTAMP
  responses: JSONB (questions & answers)
  feedback: JSONB (explanations)
}
```

**Service Functions**:
```typescript
recordQuizAttempt(studentId, lessonId, schoolId, score, maxScore, timeTaken, responses): 
  Promise<QuizAttempt>
  // Auto-updates topic mastery

updateTopicMastery(studentId, topicId, schoolId, newScore): Promise<TopicMastery>
  // Marks mastered when score >= 80

getTopicMastery(studentId, topicId): Promise<TopicMastery>
getStudentQuizAttempts(studentId, limit, offset): Promise<QuizAttempt[]>
getClassProgressSummary(classId): Promise<ClassProgress>
```

---

### 1.6 Learning Plans (Adaptive Paths)

**Location**: `db/schema.sql`, `lib/student/learning-journey.ts`

```sql
learning_plans {
  id, student_id, school_id: UUID [one per student]
  current_topic_id: UUID
  completed_topic_ids: UUID[]
  in_progress_topic_ids: UUID[]
  recommended_next_topic_ids: UUID[]
  adaptive_difficulty: DECIMAL (1.0-10.0)
}
```

**Service**:
```typescript
getNextRecommendedTopic(studentId, curriculumId, schoolId): 
  Promise<{
    type: 'new_topic'|'revision'|'enrichment'|'prerequisite'
    topicId: string
    title: string
    reason: string
    difficulty: number
  }>
```

**Algorithm**:
1. Gets all topics in curriculum
2. Fetches student's mastery data
3. Identifies mastered vs pending topics
4. Checks prerequisite satisfaction
5. Recommends next based on difficulty progression

---

### 1.7 Lessons (AI-Generated Content)

**Location**: `db/schema.sql`

```sql
lessons {
  id, school_id, topic_id: UUID
  created_by_teacher_id, created_for_student_id: UUID
  title, description: VARCHAR/TEXT
  stage_data: JSONB [LearnAI Stage object - full lesson]
  scenes_count: INTEGER
  language: VARCHAR (en-US, zh-CN)
  difficulty_level: DECIMAL (1.0 = base)
  ai_model_used: VARCHAR (gpt-4, claude-3)
  generation_time_seconds: INTEGER
  is_published: BOOLEAN
}
```

**Key Features**:
- Stores complete LearnAI stage (all scenes, interactions)
- Supports personalization (created_for_student_id)
- Tracks difficulty multiplier
- Records generation metadata

---

### 1.8 Engagement Signals

**Location**: `db/schema.sql`, (no service layer)

```sql
engagement_signals {
  id, student_id, lesson_id, school_id: UUID
  signal_type: VARCHAR (inactivity|pause_resume|tool_switch|time_on_task)
  value: DECIMAL
  metadata: JSONB (context data)
  recorded_at: TIMESTAMP
}
```

**Status**: 🔴 Table exists, **no service layer**

---

### 1.9 Billing & Payments

**Location**: `db/schema-payments.sql`

**Invoices** (School/SaaS billing):
```sql
invoices {
  id, school_id: UUID
  invoice_number: VARCHAR [UNIQUE]
  amount: DECIMAL(10,2)
  status: VARCHAR (pending|paid|overdue|cancelled)
  due_date, paid_date: TIMESTAMP
  pdf_url, stripe_invoice_id: VARCHAR
}
```

**Student Payments** (To school):
```sql
student_payments {
  id, school_id, student_id: UUID
  fee_id: UUID [references fee_structures]
  amount: DECIMAL(10,2)
  status: VARCHAR (pending|paid|overdue)
  due_date, paid_date: TIMESTAMP
  payment_method: VARCHAR (cash|check|online)
  receipt_id: VARCHAR
}
```

**Fee Structures** (School-defined):
```sql
fee_structures {
  id, school_id: UUID
  name, description: VARCHAR
  amount: DECIMAL(10,2)
  frequency: VARCHAR (monthly|quarterly|annual|once)
  applicable_grades: JSONB
}
```

**API Keys** (Integration):
```sql
api_keys {
  id, school_id: UUID
  name: VARCHAR
  key_hash: VARCHAR [UNIQUE, SHA256]
  masked_key: VARCHAR (display only)
  permissions: JSONB
  is_active: BOOLEAN
  last_used_at, rotated_at, revoked_at: TIMESTAMP
}
```

---

### 1.10 Audit & Security

**Location**: `db/schema.sql`

```sql
user_sessions {
  id, user_id, school_id: UUID
  token_hash: VARCHAR
  ip_address: VARCHAR
  user_agent: TEXT
  expires_at: TIMESTAMP
}

audit_logs {
  id, school_id, user_id: UUID
  action: VARCHAR (create|update|delete|login|logout|API_KEY_CREATED|PAYMENT_RECORDED)
  resource_type: VARCHAR (user|lesson|quiz_attempt|api_key|student_payment)
  resource_id: UUID
  changes: JSONB (before/after)
  created_at: TIMESTAMP
}
```

---

## 2️⃣ EXISTING DATA ACCESS PATTERNS

### 2.1 Database Connection Pool

**File**: `lib/db/index.ts`

```typescript
// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Max 20 concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Query execution
export async function query<T>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>>

// Transaction support
export async function transaction<T>(
  callback: (client: Client) => Promise<T>
): Promise<T>
```

**Features**:
- ✅ Connection pooling
- ✅ Transaction support with rollback
- ✅ Parameterized queries (SQL injection safe)
- ✅ Centralized initialization

---

### 2.2 Service-Based Data Access (Functional Pattern)

**Pattern**: Functions in service modules instead of Repository classes

**Example**:
```typescript
// lib/student/student-service.ts
export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const result = await query(
    `SELECT id, user_id, ... FROM student_profiles WHERE user_id = $1`,
    [studentId]
  )
  if (!result.rows[0]) return null
  
  const row = result.rows[0]
  return {
    id: row.id,
    userId: row.user_id,
    // ... mapping
  }
}
```

**Services**:
- `lib/auth/` - JWT, password operations
- `lib/student/student-service.ts` - Student CRUD
- `lib/school/school-service.ts` - School CRUD
- `lib/curriculum/curriculum-service.ts` - Topic CRUD
- `lib/progress/progress-service.ts` - Mastery/quiz tracking
- `lib/student/learning-journey.ts` - Path recommendations
- `lib/generation/personalized-generator.ts` - Lesson adaptation

**Pros**:
- ✅ Simple, functional approach
- ✅ Direct SQL control
- ✅ No ORM overhead

**Cons**:
- ❌ No query builder abstraction
- ❌ SQL duplication across services
- ❌ No automatic validation layer
- ❌ Response mapping scattered
- ❌ Difficult to test/mock

---

### 2.3 Data Access Gaps

🔴 **Missing Components**:
- No repository pattern (would enable better testing, querying)
- No query builder (would reduce SQL duplication)
- No DTO/mapper layer (would separate DB schema from domain)
- No automatic input validation (would catch errors early)
- No standardized error handling
- No N+1 query prevention
- No lazy loading strategy
- No service for engagement signals (table exists, no access)
- No bulk operations (batch insert, update)

---

## 3️⃣ EXISTING SERVICES/BUSINESS LOGIC

### 3.1 Authentication Service

**File**: `lib/auth/jwt.ts`, `lib/auth/password.ts`, `app/api/auth/`

**JWT Operations** (24-hour access, 7-day refresh):
```typescript
generateToken(payload, expiresIn='24h'): Promise<string>
generateRefreshToken(userId, schoolId): Promise<string>
verifyToken(token): Promise<DecodedToken | null>
verifyRefreshToken(token): Promise<{userId, schoolId} | null>
```

**Password Operations** (Bcrypt):
```typescript
hashPassword(plaintext): Promise<string>
verifyPassword(plaintext, hash): Promise<boolean>
```

**Routes**:
```
POST /api/auth/signup  → Create user, profile, learning plan
POST /api/auth/login   → Validate creds, return tokens
POST /api/auth/logout  → Audit log
POST /api/auth/refresh → New access token
```

**Features**:
- ✅ Stateless JWT (no session server)
- ✅ Password hashing (bcrypt)
- ✅ Token refresh capability
- ✅ Audit logging on login/logout

**Gaps**:
- 🔴 No password reset flow
- 🔴 No email verification enforced
- 🔴 No 2FA/MFA
- 🔴 No account lockout

---

### 3.2 School Management Service

**File**: `lib/school/school-service.ts`, `app/api/school/`

```typescript
getSchool(schoolId): Promise<SchoolData>
createSchool(req: CreateSchoolRequest): Promise<SchoolData>
getSchoolStats(schoolId): Promise<{studentCount, teacherCount, classCount, lessonCount}>
updateSchool(...): Promise<SchoolData>
deleteSchool(...): Promise<void>
```

**Key Data**:
- School name, domain, branding
- Subscription tier + limits
- Stripe customer ID
- Created/updated timestamps

**Features**:
- ✅ Full CRUD
- ✅ Statistics generation
- ✅ Multi-tenant isolation

**Gaps**:
- 🔴 Limits not enforced in service
- 🔴 No subscription validation
- 🔴 No API rate limiting per tenant

---

### 3.3 Student Service & Onboarding

**File**: `lib/student/student-service.ts`, `app/api/students/onboarding/`

```typescript
getStudentProfile(studentId): Promise<StudentProfile>
completeOnboarding(studentId, schoolId, input): Promise<StudentProfile>
setDiagnosticScore(studentId, score): Promise<void>
listStudents(schoolId, limit, offset): Promise<StudentProfile[]>
```

**Onboarding Data**:
- Grade level
- Interests (array)
- Strengths (array)
- Weak areas (array)
- Learning style
- Language preference
- Diagnostic score

**Features**:
- ✅ Profile creation in signup
- ✅ Onboarding flow
- ✅ Diagnostic scoring
- ✅ Learning style capture

**Gaps**:
- 🔴 No validation of inputs
- 🔴 No bulk student import
- 🔴 No student data cleanup

---

### 3.4 Curriculum Management Service

**File**: `lib/curriculum/curriculum-service.ts`

```typescript
createCurriculum(schoolId, name, subject, grade, createdByTeacherId): Promise<CurriculumData>
createTopic(curriculumId, schoolId, title, objectives, grade, order): Promise<TopicData>
getTopic(topicId): Promise<TopicData>
listTopics(curriculumId): Promise<TopicData[]>
listCurricula(schoolId): Promise<CurriculumData[]>
```

**Features**:
- ✅ Hierarchical structure (Curriculum → Topics)
- ✅ Learning objectives per topic
- ✅ Prerequisite storage (not enforced)
- ✅ Grade-level mapping
- ✅ Ordering within curriculum

**Gaps**:
- 🔴 No validation of prerequisites
- 🔴 No prerequisite enforcement
- 🔴 No curriculum publishing workflow
- 🔴 No sharing between schools

---

### 3.5 Progress & Assessment Service

**File**: `lib/progress/progress-service.ts`

```typescript
recordQuizAttempt(..., score, responses): Promise<QuizAttempt>
  // Auto-updates topic mastery

updateTopicMastery(studentId, topicId, schoolId, newScore): Promise<TopicMastery>
  // Marks mastered when score >= 80
  // Tracks attempts & confidence

getTopicMastery(studentId, topicId): Promise<TopicMastery>
getStudentQuizAttempts(studentId, limit, offset): Promise<QuizAttempt[]>
getClassProgressSummary(classId): Promise<ClassProgress>
```

**Mastery Logic**:
```
confidence_level = (correct_attempts / total_attempts) * 100
mastered_at = when score >= 80
mastery_score = running average of all attempts
```

**Features**:
- ✅ Automatic mastery updates
- ✅ Confidence tracking
- ✅ Attempt history
- ✅ Class-level summaries

**Gaps**:
- 🔴 No learning curve algorithms (basic threshold)
- 🔴 No benchmarking (student vs class vs school)
- 🔴 No spaced repetition logic
- 🔴 No intervention recommendations

---

### 3.6 Learning Journey Engine (Adaptive Paths)

**File**: `lib/student/learning-journey.ts`

```typescript
getNextRecommendedTopic(studentId, curriculumId, schoolId): Promise<LearningJourneyStep>
  // Returns: {type, topicId, title, reason, difficulty}
```

**Algorithm**:
1. Fetch all topics in curriculum
2. Get student's mastery data
3. Find mastered topics
4. Check prerequisite satisfaction
5. Recommend next topic with difficulty level
6. Indicate if revision, enrichment, or new topic

**Status**: 🟡 Skeleton architecture, partially implemented

**Gaps**:
- 🔴 Complete algorithm unclear
- 🔴 Enrichment/remediation selection missing
- 🔴 No tie-breaking strategy
- 🔴 Not integrated into lesson generation flow

---

### 3.7 Personalized Lesson Generation

**File**: `lib/generation/personalized-generator.ts`

**Extends LearnAI Core** by:
1. Injecting student context into prompts
2. Calculating adaptive difficulty
3. Customizing AI teacher persona
4. Generating remediation vs enrichment

```typescript
generatePersonalizedLessonOutlines(
  topic: TopicData,
  studentProfile: StudentProfile,
  teacherRequirements?: string,
  studentMasteryScore?: number
): Promise<SceneOutline[]>

getPersonalizedTeacherPrompt(studentProfile): string

generateRemediationLesson(...): Promise<SceneOutline[]>
generateEnrichmentLesson(...): Promise<SceneOutline[]>
```

**Difficulty Calculation**:
```typescript
// Base difficulty by grade (K=1, 12=9, college=9)
let difficulty = gradeMap[gradeLevel] || 5

// Adapt based on mastery
if (masteryScore < 70) difficulty -= 1  // Struggling
if (masteryScore > 90) difficulty += 1  // Excelling
```

**Personalization**:
- Grade-level appropriate content
- Learning style customization (visual, auditory, kinesthetic, reading)
- Interest-based context injection
- Remediation for struggling students (> 70 score)
- Enrichment for advanced students (> 90 score)

**AI Teacher Personas**:
- Visual: Diagrams, color, spatial metaphors
- Auditory: Narration, rhythm, analogies
- Kinesthetic: Interactive simulations, practice
- Reading: Text-based, structured outlines

**Integration**:
```
POST /api/lessons/generate {topicId, teacherRequirements}
  → generatePersonalizedLessonOutlines()
  → Calls lib/generation/outline-generator
  → Calls lib/generation/scene-generator
  → Saves to DB
  → Returns lessonId + outlines + teacherPersona
```

**Features**:
- ✅ Full student context integration
- ✅ Adaptive difficulty (1-10 scale)
- ✅ Learning style customization
- ✅ Remediation paths
- ✅ Enrichment paths
- ✅ Multi-language (en-US, zh-CN)

**Gaps**:
- 🔴 No caching of outlines
- 🔴 No cost/latency optimization
- 🔴 No fallback if generation fails

---

## 4️⃣ CURRENT API LAYER

### 4.1 Authentication Routes

**Files**: `app/api/auth/`

```
POST /api/auth/signup
  Input: {email, password, firstName, lastName, schoolId, role}
  Output: {token, refreshToken, user}
  Creates: User, StudentProfile, LearningPlan

POST /api/auth/login
  Input: {email, password, schoolId?}
  Output: {token, refreshToken, user}
  Updates: last_login_at, audit_logs

POST /api/auth/logout
  Effect: Audit log only

POST /api/auth/refresh [requires refresh token]
  Output: {token} (new access token)
```

---

### 4.2 Student Routes

**Files**: `app/api/students/`

```
POST /api/students/onboarding [student auth]
  Input: {gradeLevel, interests[], strengths[], weakAreas[], learningStyle?, diagnosticScore?}
  Output: {success, profile}

GET /api/students/progress [student or teacher auth]
  Params: ?studentId (teacher can view others)
  Output: {quizAttempts, topicMastery}
```

**Access Control**:
- ✅ Students can only view own progress
- ✅ Teachers can view students in their classes
- ✅ Principals can view all

---

### 4.3 Lesson Routes

**Files**: `app/api/lessons/`

```
POST /api/lessons/generate [student or teacher]
  Input: {topicId, teacherRequirements?}
  Params: ?studentId (teacher can generate for specific student)
  Output: {lessonId, title, outlines, studentProfile, teacherPersona, currentMastery}

GET /api/lessons/:lessonId [student or teacher]
  Output: Full lesson with stage_data

PATCH /api/lessons/:lessonId/publish [teacher]
  Sets is_published = true
```

---

### 4.4 School Management Routes

**Files**: `app/api/school/`

```
GET /api/school/:schoolId [principal, saas_admin]
GET /api/school/:schoolId/stats [principal]
  Output: {studentCount, teacherCount, classCount, lessonCount}

GET /api/school/students [principal]
GET /api/school/classes [principal, teacher]
POST /api/school/classes [principal]
GET /api/school/classes/:classId [principal, teacher]
POST /api/school/classes/:classId/enroll [principal]
```

---

### 4.5 Student Payments Routes

**Files**: `app/api/school/student-payments/`

```
GET /api/school/student-payments [principal, accountant]
  Output: [{id, studentName, grade, feeType, amount, dueDate, status, paidDate}]

POST /api/school/student-payments [principal, accountant]
  Input: {studentId, feeId, amount, paymentMethod?}
  Output: {paymentId, receiptId}

GET /api/school/fee-structures [principal, accountant]
POST /api/school/fee-structures [principal]
```

---

### 4.6 Billing Routes

**Files**: `app/api/billing/`

```
GET /api/billing [principal]
  Output: {planName, monthlyPrice, studentLimit, renewalDate, status}

GET /api/billing/invoices [principal]
  Output: [{date, amount, status, dueDate, pdf}]

POST /api/billing/create-checkout-session [principal]
  Input: {planId}
  Output: {sessionUrl} (Stripe checkout)

POST /api/billing/webhook
  Stripe event handler
```

---

### 4.7 API Key Management Routes

**Files**: `app/api/school/api-keys/`

```
GET /api/school/api-keys [principal, saas_admin]
  Output: [{id, name, maskedKey, createdAt, lastUsed, isActive, permissions}]

POST /api/school/api-keys [principal, saas_admin]
  Input: {name, permissions[]}
  Output: {key} (returned once only!)

DELETE /api/school/api-keys/:keyId [principal, saas_admin]
  Effect: Sets is_active=false, revoked_at=NOW()

POST /api/school/api-keys/:keyId/rotate [principal, saas_admin]
  Output: {newKey}

GET /api/school/api-keys/audit-log [principal, saas_admin]
  Output: Audit trail of API key operations
```

---

### 4.8 Route Architecture Pattern

**Standard Structure**:
```typescript
// app/api/[resource]/route.ts
import { withAuth, withRole } from '@/lib/middleware/auth'
import { withTenant } from '@/lib/middleware/tenant'

// Protected with role + tenant isolation
export const GET = withRole(
  ['principal', 'teacher'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      // Service logic here
      return NextResponse.json(result)
    } catch (error) {
      log.error('Error:', error)
      return NextResponse.json(
        { error: '...' },
        { status: 500 }
      )
    }
  }
)
```

**Middleware Applied**:
- ✅ JWT validation (`withAuth`)
- ✅ Role checking (`withRole`)
- ✅ Tenant isolation (`withTenant` on school routes)
- ✅ Audit logging (manual in routes)

---

### 4.9 API Gaps

**Missing**:
- 🔴 Bulk operations (batch student import, bulk lesson generation)
- 🔴 Advanced filtering/search on all resources
- 🔴 Pagination consistency (some routes have, others don't)
- 🔴 OpenAPI/Swagger documentation
- 🔴 API versioning (e.g., /v1/)
- 🔴 Rate limiting per endpoint
- 🔴 WebSocket for real-time features
- 🔴 GraphQL alternative
- 🔴 Standardized error response format
- 🔴 Request/response compression

---

## 5️⃣ MIDDLEWARE & SECURITY

### 5.1 Authentication Middleware

**File**: `lib/middleware/auth.ts`

```typescript
async getAuthContext(req: NextRequest): Promise<AuthContext | null>
  - Extracts JWT from "Authorization: Bearer {{token}}"
  - Verifies signature and expiry
  - Validates user exists in DB and is_active
  - Returns AuthContext or null

// Higher-order functions
withAuth(handler) - Require auth for endpoint
withRole(allowedRoles, handler) - Require specific roles
```

**Token Validation**:
- ✅ Signature verification (HS256)
- ✅ Expiry check (prevents expired tokens)
- ✅ User existence check (prevents deleted accounts)
- ✅ Active status check (prevents disabled accounts)

**Stateless**: No session database, only JWT validation

---

### 5.2 Authorization (RBAC)

**5 Roles**:
```
saas_admin   → Full platform access
principal    → School admin (users, classes, billing, stats)
teacher      → Class management, lesson generation
student      → Self profile, lessons, quizzes only
accountant   → Payment-related operations only
```

**Enforcement Pattern**:
```typescript
export const POST = withRole(
  ['principal', 'teacher'],
  async (req, auth) => {
    if (!allowedRoles.includes(auth.role)) {
      return 403 Forbidden
    }
    // ... proceed
  }
)
```

**Levels**:
- ✅ Route-level enforcement (via `withRole`)
- ✅ Service-level checks (manual in functions)
- ✅ Database-level filtering (school_id + role checks)

**Example**: Student can only view own progress
```typescript
if (auth.role === 'student' && studentId !== auth.userId) {
  return 403 Forbidden
}
```

---

### 5.3 Tenant Isolation Middleware

**File**: `lib/middleware/tenant.ts`

```typescript
async verifyTenantAccess(auth: AuthContext, tenantId: string): Promise<boolean>
  - saas_admin can access any tenant
  - Other users must have matching school_id
  - Verifies tenant exists

// Helper
getTenantFilter(auth): {clause, params}
  - Returns WHERE clause for queries
  - Example: "AND school_id = $1" with params [schoolId]

// Higher-order function
withTenant(handler)
  - Validates request schoolId matches auth context
  - Prevents cross-tenant access
```

**Query Example**:
```typescript
const filter = getTenantFilter(auth)
const result = await query(
  `SELECT * FROM lessons WHERE is_published = true ${filter.clause}`,
  filter.params
)
// If user is saas_admin: returns all published lessons
// If regular user: returns only from their school_id
```

---

### 5.4 API Key Management

**File**: `app/api/school/api-keys/route.ts`

**Generation & Storage**:
```typescript
generateAPIKey(): string  // sk_[32 random hex chars]
hashAPIKey(key): string   // SHA256 hash (stored)
```

**Each Key**:
- Name (user-friendly)
- Hashed value (stored in DB)
- Masked value (sk_XXXX...XXXX for display)
- Permissions array (scoped access)
- Last used timestamp (for auditing)
- Revocation support

**Validation**:
```typescript
async validateAPIKey(
  schoolId: string,
  apiKey: string,
  requiredPermissions: string[]
): Promise<boolean>
  - Hashes provided key
  - Looks up in DB
  - Checks is_active
  - Verifies permissions
  - Updates last_used_at
```

**Lifecycle**:
- ✅ Creation (generates new key, returns once)
- ✅ List (masked keys only)
- ✅ Rotation (new key, revoke old)
- ✅ Revocation (soft delete + set revoked_at)
- ✅ Audit trail (all operations logged)

---

### 5.5 Security Gaps

**Issues**:
- 🔴 No rate limiting (endpoint or per-user)
- 🔴 No input validation at route level (relies on service layer)
- 🔴 No CORS configuration visible
- 🔴 No CSRF protection
- 🔴 No Content-Security-Policy headers
- 🔴 No field-level encryption (passwords hashed, but other sensitive data in plaintext)
- 🔴 No 2FA/MFA implementation
- 🔴 No password reset flow
- 🔴 No email verification enforcement

---

## 6️⃣ ARCHITECTURE GAPS

### 6.1 Data Layer Issues

| Issue | Impact | Difficulty |
|-------|--------|-----------|
| No repository pattern | Hard to test, query duplication | Medium |
| Raw SQL strings | Error-prone, no type safety | Medium |
| No validation layer | Invalid data in DB | Medium |
| No caching | Slow repeated queries | High |
| No search/indexing | Can't do full-text search | High |
| No soft delete strategy | Data recovery issues | Low |
| Limited error handling | Inconsistent error responses | Low |

---

### 6.2 Service Layer Issues

| Service | Gap | Impact |
|---------|-----|--------|
| Engagement | 0% implemented | Can't track student engagement |
| Analytics | 0% implemented | No dashboards/reports |
| Notifications | 0% implemented | No email/SMS alerts |
| Export | 0% implemented | Can't export lessons as PPTX |
| Sessions | Table exists, unused | Can't invalidate sessions early |
| Learning Journeys | 50% skeleton | Path recommendations weak |

---

### 6.3 API Layer Issues

| Issue | Impact | Effort |
|-------|--------|--------|
| No bulk operations | Can't import 1000s of students | High |
| No OpenAPI docs | No client SDKs, hard to integrate | Medium |
| Inconsistent error format | Hard for clients to parse errors | Low |
| No API versioning | Breaking changes = bad | Medium |
| No rate limiting | DDoS vulnerable | Medium |
| Pagination inconsistency | Clients confused | Low |

---

### 6.4 Frontend Gaps

**Dashboards structure exists** but implementation incomplete:
- `app/dashboard/student/` - Component stubs only
- `app/dashboard/teacher/` - Component stubs only
- `app/dashboard/principal/` - Component stubs only

**Missing**:
- Real-time data fetching
- Charts/analytics visualizations
- Interactive lesson playback
- Class management UI
- Payment management UI

---

### 6.5 DevOps & Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| Docker | ✅ | Images 📦 defined |
| Database migrations | 🟡 | Schema files only, no migration tool |
| Environment config | 🟡 | .env + .env.example, no validation schema |
| Secrets | 🔴 | No Vault/AWS integration |
| Logging | ✅ | Basic logger utility |
| Monitoring | 🔴 | No Prometheus/DataDog |
| Performance | 🔴 | No APM/tracing (DataDog, New Relic) |
| Testing | 🔴 | No visible test files |
| CI/CD | 🟡 | Vercel.json exists, unclear setup |

---

### 6.6 Coupling Issues

**Tight Service-to-Service Coupling**:
```typescript
// lib/generation/personalized-generator.ts
import { getTopic } from '@/lib/curriculum/curriculum-service'
import { getStudentProfile } from '@/lib/student/student-service'

// Hard to mock, test in isolation
```

**DB Schema ↔ Domain Model Coupling**:
```typescript
// Row names (snake_case) vs domain names (camelCase)
const row = { user_id, first_name, last_name }
return { userId: row.user_id, firstName: row.first_name, ... }
// Refactoring DB → must change all mappers
```

**Route ↔ Service Coupling**:
- Routes directly instantiate services
- No dependency injection
- Hard to swap implementations

---

### 6.7 Business Logic Gaps

| Feature | Status | Notes |
|---------|--------|-------|
| Prerequisites | Stored but not enforced | Can't prevent out-of-order learning |
| Learning sequences | Basic structure | No advanced pathing algorithms |
| Mastery models | Threshold-based (80%) | No learning curves |
| Engagement response | Signals tracked, no action | Can't detect & help struggling students |
| Benchmarking | Missing | Can't compare student vs class vs school |
| Accessibility | Missing | No WCAG/A11y considerations |
| Compliance | Missing | No FERPA/COPPA specific features |
| Subscription limits | Stored, not enforced | Can exceed max students/teachers limits |

---

## 7️⃣ RECOMMENDED IMPROVEMENTS

### Priority 1: Foundation (Weeks 1-2)

**Goal**: Stabilize core architecture

1. **Add Input Validation Layer**
   - Define Zod schemas for all inputs
   - Validate at route entry point
   - Consistent validation error responses

   ```typescript
   // lib/validation/schemas.ts
   const createStudentSchema = z.object({
     firstName: z.string().min(1),
     email: z.string().email(),
     gradeLevel: z.enum(['K', '1', ..., '12'])
   })
   
   // app/api/students/route.ts
   const validated = createStudentSchema.parse(req.body)
   ```

2. **Standardize Error Handling**
   - Custom error classes:
     ```typescript
     class ValidationError extends Error { code = 400 }
     class NotFoundError extends Error { code = 404 }
     class UnauthorizedError extends Error { code = 403 }
     ```
   - Global error handler middleware
   - Consistent JSON error format:
     ```json
     {
       "error": {
         "message": "...",
         "code": "VALIDATION_ERROR",
         "details": [...]
       }
     }
     ```

3. **Add Service Interface Abstraction**
   - Create service interfaces (not implementations)
   - Enable mock implementations for testing
   - Easier to swap strategies

   ```typescript
   // lib/services/Student.interface.ts
   export interface StudentService {
     getProfile(id: string): Promise<StudentProfile>
     completeOnboarding(...): Promise<StudentProfile>
   }

   // lib/services/StudentImpl.ts - concrete implementation
   ```

---

### Priority 2: Features (Weeks 3-4)

**Goal**: Complete critical services

4. **Complete Learning Journey Engine**
   - Implement full algorithm
   - Integrate with personalization
   - Handle edge cases (no next topic, etc.)

5. **Add Engagement Tracking Service**
   - Create `lib/engagement/engagement-service.ts`
   - Analyze engagement patterns
   - Detect struggling students
   - Recommend interventions

   ```typescript
   recordEngagementSignal(studentId, lessonId, signal): Promise<void>
   analyzeEngagement(studentId): Promise<EngagementAnalysis>
   getEngagementAlerts(schoolId): Promise<StudentAlert[]>
   ```

6. **Add Batch Operations**
   - Bulk student import (CSV)
   - Bulk enrollment
   - Bulk assignment updates

   ```typescript
   POST /api/students/bulk-import
     Input: multipart/form-data with CSV
     Output: {imported: N, failed: N, errors: []}
   ```

---

### Priority 3: Scale (Weeks 5-6)

**Goal**: Production-ready infrastructure

7. **Add Caching Layer** (Redis)
   ```typescript
   // lib/cache/cache-service.ts
   async getStudentProfileCached(id): Promise<StudentProfile> {
     const cached = await redis.get(`student:${id}`)
     if (cached) return JSON.parse(cached)
     
     const profile = await getStudentProfile(id)
     await redis.setex(`student:${id}`, 300, JSON.stringify(profile))
     return profile
   }
   ```

8. **Add Search Service** (Elasticsearch optional)
   ```typescript
   // lib/search/search-service.ts
   searchLessons(schoolId, query): Promise<Lesson[]>
   searchTopics(curriculumId, query): Promise<Topic[]>
   ```

9. **Add Notifications Service** (SendGrid, Twilio)
   ```typescript
   // lib/notifications/notifications-service.ts
   sendEmail(to, template, data): Promise<void>
   sendSMS(phone, message): Promise<void>
   ```

---

### Priority 4: Advanced (Weeks 7-8)

**Goal**: Enterprise features

10. **Add Analytics Service**
    - Student performance dashboards
    - Class/school comparisons
    - Predictive student success

11. **Add Export Service**
    - PPTX export (using pptxgenjs)
    - HTML interactive export
    - PDF reports

12. **Add Integration Service**
    - LMS sync (Canvas, Blackboard)
    - Roster API
    - SSO (SAML, OAuth2)

---

## 📝 SUMMARY TABLE

| Category | Exists | Working | Gaps |
|----------|--------|---------|------|
| **Users & Auth** | ✅ | ✅ | No 2FA, password reset |
| **School/Tenant** | ✅ | ✅ | No limit enforcement |
| **Students** | ✅ | ✅ | No bulk import |
| **Curriculum** | ✅ | ✅ | No prerequisite validation |
| **Progress** | ✅ | ✅ | No benchmarking, spaced repetition |
| **Learning Paths** | ✅ | 🟡 | Skeleton, not fully integrated |
| **Personalization** | ✅ | ✅ | Good adaptation |
| **Lessons** | ✅ | ✅ | Tied to LearnAI tightly |
| **Engagement** | ⚠️ | 🔴 | Table only, no service |
| **Notifications** | 🔴 | 🔴 | Not implemented |
| **Analytics** | 🔴 | 🔴 | Dashboards shell only |
| **Export** | 🔴 | 🔴 | Not implemented |
| **API Docs** | 🔴 | 🔴 | No OpenAPI/Swagger |
| **Billing** | ✅ | 🟡 | Stripe partial, no limits |
| **Security** | ✅ | ✅ | No rate limits, 2FA, CORS |
| **Testing** | 🔴 | 🔴 | No test files |

---

**Generated**: March 22, 2026  
**For**: LearnAI Development Team  
**Next Step**: Prioritize improvements based on business roadmap
