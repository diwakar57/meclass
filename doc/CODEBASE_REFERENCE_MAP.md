# Codebase Reference Map: Test/Diagnostic/Assessment Patterns

A quick lookup guide showing exactly which files implement each pattern in OpenMAIC.

---

## 📊 DATABASE SCHEMA

**File:** [db/schema.sql](db/schema.sql)

Key tables for implementations:
- **Lines 380-455** - `quiz_attempts` (Main test response table)
- **Lines 300-330** - `topic_mastery` (Aggregated progress per topic)
- **Lines 340-360** - `learning_patterns` (Behavioral metrics: pace, attention)
- **Lines 360-390** - `mistake_patterns` (Error categorization)
- **Lines 390-410** - `learning_preferences` (Visual/text/interactive/story)
- **Lines 500-530** - `learning_dna` (Student profile summary)

**Why study these?**
- Understand schema architecture for test data persistence
- See how multi-tenancy is enforced (school_id column)
- Learn what fields are tracked for analytics

---

## 🎓 EXISTING SERVICES (Study These First!)

### Diagnostic Test Service
**File:** [lib/services/diagnostic-test-service.ts](lib/services/diagnostic-test-service.ts)

**What to learn:**
- Lines 1-50: Type definitions for tests (DiagnosticTest, DiagnosticTestQuestion)
- Lines 60-120: `generateDiagnosticTest()` - How to create AI tests with LLM
- Lines 130-150: `getDiagnosticTest()` - Query pattern with error handling
- Lines 160-180: `listStudentDiagnosticTests()` - Multi-tenant list pattern

**Key Pattern:** Service → LLM → Parse → Insert → Return domain object

### Entity Service (CRUD with Validation)
**File:** [lib/services/entity-service.ts](lib/services/entity-service.ts)

**What to learn:**
- Lines 30-70: Business logic layer with validation
- Lines 100-150: Tenant isolation checks
- Lines 180-220: Error handling patterns

**Key Pattern:** Validate → Check authorization → Call repository → Return

### Learning DNA Service
**File:** [lib/services/learning-dna.ts](lib/services/learning-dna.ts)

**What to learn:**
- How to compute student learning profiles
- Pattern for aggregating multiple data sources
- How to update records based on new observations

---

## 💾 REPOSITORIES (Copy CRUD Pattern)

**File:** [lib/repositories/entity-repository.ts](lib/repositories/entity-repository.ts)

Lines to study:
- Lines 30-80: Create pattern (INSERT with crypto.randomUUID())
- Lines 90-120: Read pattern (SELECT with null checks)
- Lines 130-160: List pattern (with limit/offset)
- Lines 170-220: Update pattern (dynamic parameterized queries)
- Lines 230-250: Delete pattern (soft deletes with deleted_at)
- Lines 260-280: Mapping functions (DB row → domain object)

**Why copy this?**
- Parameterized queries prevent SQL injection
- Soft deletes maintain audit trail
- Mapping layer keeps DB details out of services
- Consistent CRUD interface

---

## 🔌 API ENDPOINT PATTERNS

### Quiz Grading (LLM-based scoring)
**File:** [app/api/quiz-grade/route.ts](app/api/quiz-grade/route.ts)

**What to learn:**
- Lines 15-30: Request/response interfaces
- Lines 40-80: LLM prompt construction
- Lines 85-110: JSON parsing & validation
- System message engineering for grading

**Pattern:** Input → Prompt → LLM → Parse JSON → Validate → Return

### Diagnostic Test Endpoints
**File:** [app/api/diagnostic-test/[id]/route.ts](app/api/diagnostic-test/[id]/route.ts)

**What to learn:**
- Lines 10-40: Session + role-based auth
- Lines 45-70: School isolation check
- Lines 75-120: Dynamic routing ([id] vs list both)
- Lines 130-160: Authorization checks (student owns test)

**Pattern:** Auth → School check → Authorize → Query → Return

### Student Analytics (Multi-table joins)
**File:** [app/api/student/analytics/route.ts](app/api/student/analytics/route.ts)

**What to learn:**
- Lines 10-20: `withRole()` middleware usage
- Lines 25-50: Error handling with `.catch()` for graceful degradation
- Lines 60-90: Complex SQL with WHERE filters
- Lines 100-120: Data aggregation and transformation
- Lines 130-150: Auto-refresh pattern with intervals

**Pattern:** Auth middleware → Query with tenant filter → Transform → Return

### Teacher Analytics (Class-level aggregation)
**File:** [app/api/teacher/analytics/route.ts](app/api/teacher/analytics/route.ts)

**What to learn:**
- Lines 30-50: Database failure detection
- Lines 60-85: Graceful fallback with empty defaults
- Lines 95-130: Complex filtering (students in teacher's classes)
- Heatmap calculation pattern

---

## 🎨 DASHBOARD COMPONENTS

### Student Dashboard
**File:** [app/dashboard/student/page.tsx](app/dashboard/student/page.tsx)

**What to learn:**
- Lines 15-30: Dashboard interface (StudentAnalytics type)
- Lines 45-70: useEffect fetch pattern with cleanup
- Lines 80-110: Responsive MetricsGrid layout
- Lines 120-160: Chart component usage
- Lines 180-200: Empty state handling

**Reusable Components Used:**
- `SummaryCard` - Single KPI display
- `MetricsGrid` - Responsive grid layout
- `ChartCard` - Chart container
- `EnhancedLineChart`, `EnhancedBarChart` - Chart renderers

**File:** [app/dashboard/teacher/page.tsx](app/dashboard/teacher/page.tsx)

**What to learn:**
- Class-level analytics vs student-level
- AlertsPanel for at-risk students
- HeatmapChart for topic performance
- Class selector dropdown pattern

---

## 📋 TYPE DEFINITIONS

**File:** [lib/types/stage.ts](lib/types/stage.ts)

**Quiz types (Lines 76-100):**
```typescript
export interface QuizQuestion
export interface QuizOption
export interface QuizContent
```

**File:** [lib/types/generation.ts](lib/types/generation.ts)

**Generated quiz types (Lines 148-200):**
```typescript
export interface GeneratedQuizContent
export interface SuggestedQuizQuestion
```

**Why important:**
- Standard interfaces used throughout codebase
- Generated content types for AI integration
- Suggested patterns for hints

---

## 🔐 AUTH & MIDDLEWARE

**File:** [lib/middleware/auth.ts](lib/middleware/auth.ts)

**What to learn:**
- Lines 15-50: `getAuthContext()` - Extract user from JWT/cookies
- Lines 55-100: User verification in database
- Lines 110-140: `withRole()` - Role-based access control
- Lines 150-180: Tenant isolation via school_id

**Pattern Used in All APIs:**
```typescript
export const GET = withRole(['student'], async (_req, auth) => {
  const userId = auth.userId;
  const schoolId = auth.schoolId;
  // All queries include: WHERE school_id = $X
});
```

---

## 🛠️ UTILITY FUNCTIONS

**File:** [lib/logger.ts](lib/logger.ts)

**Usage:** All services use `createLogger('ModuleName')` for structured logging

**File:** [lib/db/query.ts](lib/db/query.ts)

**Usage:** All database calls use `await query(sql, params)` with parameterized queries

**File:** [lib/ai/providers.ts](lib/ai/providers.ts)

**Usage:** `await callLLM({ model, prompt, temperature, maxTokens })`

**File:** [lib/server/api-response.ts](lib/server/api-response.ts)

**Usage:** 
- `apiSuccess(data)` - Standardized success response
- `apiError(code, status, message)` - Standardized error response

---

## 🤖 AI CLASSROOM INTEGRATION PATTERNS

### Core Integration Service
**File:** [lib/services/learnai-integration-service.ts](lib/services/learnai-integration-service.ts)

**What to learn:**
- Lines 1-50: Type imports and interface definitions
- Lines 60-150: `generateAIClassroomSession()` - Main orchestration workflow
- Lines 160-220: `buildOpenMAICRequest()` - Context injection pattern
- Lines 230-280: `mapOpenMAICOutput()` - Response mapping from external service
- Lines 290-330: `validateSessionData()` - Data integrity validation
- Lines 340-380: Helper methods (getSession, listStudentSessions, handleQuizSubmission)

**Key Pattern:** Fetch context → Build external request → Call OpenMAIC → Map response → Persist

**Why study this?**
- Shows how to inject student profile + learning DNA + topic context
- Demonstrates mapping between external service output and domain models
- Uses repositories for data persistence
- Implements comprehensive error handling

### AI Classroom Type Definitions
**File:** [lib/types/ai-classroom.ts](lib/types/ai-classroom.ts)

**What to learn:**
- Lines 1-50: Request types (GenerateAIClassroomSessionRequest)
- Lines 60-120: Main model (AIClassroomSession with embedded data)
- Lines 130-180: Scene data types (AISceneData, slide/quiz/interactive types)
- Lines 190-240: Quiz types (SessionQuizData, QuizQuestionData)
- Lines 250-290: Transcript types (SessionTranscript, TranscriptEntry)
- Lines 300-330: Interaction types (SessionInteractionLog, InteractionLogEntry)
- Lines 340-370: Error codes (15 semantic error types)

**Why important:**
- Complete type coverage for AI classroom system
- Shows how to serialize JSONB data to TypeScript
- Error codes are semantic and retryable/non-retryable

### AI Classroom Repositories
**File:** [lib/repositories/ai-classroom-session-repository.ts](lib/repositories/ai-classroom-session-repository.ts)

**What to learn:**
- Lines 30-80: Create session (INSERT with JSONB fields)
- Lines 90-120: Get session (SELECT with row mapping)
- Lines 130-170: List sessions (pagination with limit/offset)
- Lines 180-210: Update status (UPDATE for lifecycle management)
- Lines 220-250: Analytics queries (getByStatus, getByDifficulty)
- JSONB field parsing with `JSON.parse()`

**File:** [lib/repositories/session-transcript-repository.ts](lib/repositories/session-transcript-repository.ts)

**What to learn:**
- Lines 30-70: Full-text search pattern (ILIKE for keyword search)
- Lines 80-110: Append entries (UPDATE array fields)
- Lines 120-150: Statistics queries (COUNT, word count aggregation)
- String content parsing and processing

**File:** [lib/repositories/session-interaction-log-repository.ts](lib/repositories/session-interaction-log-repository.ts)

**What to learn:**
- Lines 30-80: Engagement scoring algorithm (0-100 scale)
- Lines 90-130: Metrics aggregation (interaction count, response time)
- Lines 140-180: Comparison queries (student vs student analytics)
- JSONB array operations and aggregations

### AI Classroom API Endpoints
**File:** [app/api/ai-classroom/sessions/generate/route.ts](app/api/ai-classroom/sessions/generate/route.ts)

**What to learn:**
- Lines 10-30: Request body validation
- Lines 35-50: JWT auth with tenant isolation
- Lines 55-80: Call to LearnAIIntegrationService
- Lines 85-100: 202 Accepted response pattern
- Asynchronous processing indication

**File:** [app/api/ai-classroom/sessions/route.ts](app/api/ai-classroom/sessions/route.ts)

**What to learn:**
- Lines 10-40: GET list endpoint with pagination
- Lines 45-70: Filter by student + school (tenant isolation)
- Lines 75-95: Authorization checks
- List response with total count pattern

**File:** [app/api/ai-classroom/sessions/[id]/route.ts](app/api/ai-classroom/sessions/[id]/route.ts)

**What to learn:**
- Dynamic routing for single resource ([id])
- Ownership verification (student can only see own sessions)
- Teacher/admin override capabilities
- 404 handling for missing resources

**File:** [app/api/ai-classroom/sessions/[id]/submit-quiz/route.ts](app/api/ai-classroom/sessions/[id]/submit-quiz/route.ts)

**What to learn:**
- POST endpoint for form submission
- Answer validation and grading logic
- Integration with mastery system (optional)
- Updated interaction log persisting

**File:** [app/api/ai-classroom/sessions/[id]/transcript/route.ts](app/api/ai-classroom/sessions/[id]/transcript/route.ts)

**What to learn:**
- Multiple response formats (JSON vs plaintext)
- Download capability (Content-Disposition header)
- Search parameter handling
- Large content performance (streaming consideration)

### Error Handling & Validation
**File:** [lib/integrations/ai-classroom-errors.ts](lib/integrations/ai-classroom-errors.ts)

**What to learn:**
- Lines 1-50: Custom AIClassroomError class
- Lines 60-100: Error code enum (15 semantic codes)
- Lines 110-150: Validators (studentId, topicId, duration, etc.)
- Lines 160-200: Error response factory methods
- Lines 210-250: Retry strategies per error type
- Lines 260-290: User-friendly message generation
- Lines 300-330: Status code mapping

**Why important:**
- Semantic errors for debugging (not just HTTP codes)
- Retry logic differs by error type (TIMEOUT is retryable, INVALID_STUDENT_ID is not)
- User-friendly messages for client display
- Comprehensive logging with context

### Supporting Documentation
**File:** [lib/integrations/ai-classroom-quick-start.ts](lib/integrations/ai-classroom-quick-start.ts)

**What to learn:**
- 11 practical code examples
- Copy-paste templates for common operations
- Mock session data generation
- Integration patterns with existing services
- How to update TopicMastery after quiz
- How to build student analytics

**File:** [IMPLEMENTATION_CHECKLIST.ts](IMPLEMENTATION_CHECKLIST.ts)

**What to learn:**
- 10-phase implementation plan
- 50+ specific tasks with estimated times
- Database, service, API, repository, error, integration, performance, documentation, deployment phases
- Useful for project planning and progress tracking

**File:** [TROUBLESHOOTING_GUIDE.ts](TROUBLESHOOTING_GUIDE.ts)

**What to learn:**
- 50+ common issues and solutions
- Database issues (migrations, connections, constraints)
- Service layer issues (OpenMAIC integration)
- API endpoint issues (auth, validation)
- Performance optimization tips
- Production deployment troubleshooting
- Debug script template
- Useful SQL queries

---

## 🚀 UPDATED IMPLEMENTATION CHECKLIST

When implementing the full LearnAI system, reference these files in this order:

### For AI Classroom Integration (NEW Priority Path)

**Phase 1: Database & Types**
1. [ ] Read [db/migrations/2026-03-23-ai-classroom-tables.sql](db/migrations/2026-03-23-ai-classroom-tables.sql) - Schema overview
2. [ ] Study [lib/types/ai-classroom.ts](lib/types/ai-classroom.ts) - All types
3. [ ] Review [lib/types/stage.ts](lib/types/stage.ts) - Existing scene/stage types

**Phase 2: Service Patterns (Core Logic)**
1. [ ] Study [lib/services/learnai-integration-service.ts](lib/services/learnai-integration-service.ts) - Main orchestrator
2. [ ] Review `buildOpenMAICRequest()` method - Context injection
3. [ ] Review `mapOpenMAICOutput()` method - Response transformation
4. [ ] Reference [lib/services/entity-service.ts](lib/services/entity-service.ts) - Validation pattern

**Phase 3: Repository Data Access**
1. [ ] Study [lib/repositories/ai-classroom-session-repository.ts](lib/repositories/ai-classroom-session-repository.ts)
2. [ ] Study [lib/repositories/session-transcript-repository.ts](lib/repositories/session-transcript-repository.ts)
3. [ ] Study [lib/repositories/session-interaction-log-repository.ts](lib/repositories/session-interaction-log-repository.ts)
4. [ ] Reference [lib/repositories/entity-repository.ts](lib/repositories/entity-repository.ts) - CRUD pattern

**Phase 4: API Endpoints**
1. [ ] Reference [app/api/ai-classroom/sessions/generate/route.ts](app/api/ai-classroom/sessions/generate/route.ts) - Session creation
2. [ ] Reference [app/api/ai-classroom/sessions/route.ts](app/api/ai-classroom/sessions/route.ts) - List pattern
3. [ ] Reference [app/api/ai-classroom/sessions/[id]/route.ts](app/api/ai-classroom/sessions/[id]/route.ts) - Get pattern
4. [ ] Reference [app/api/ai-classroom/sessions/[id]/submit-quiz/route.ts](app/api/ai-classroom/sessions/[id]/submit-quiz/route.ts) - Quiz grading
5. [ ] Reference [app/api/ai-classroom/sessions/[id]/transcript/route.ts](app/api/ai-classroom/sessions/[id]/transcript/route.ts) - Content retrieval
6. [ ] Reference [app/api/diagnostic-test/[id]/route.ts](app/api/diagnostic-test/[id]/route.ts) - Auth patterns

**Phase 5: Error Handling**
1. [ ] Study [lib/integrations/ai-classroom-errors.ts](lib/integrations/ai-classroom-errors.ts) - Error framework
2. [ ] Understand 15 semantic error codes
3. [ ] Review retry strategies per error type
4. [ ] Review [lib/server/api-response.ts](lib/server/api-response.ts) - Response formatting

**Phase 6: Dashboard Integration**
1. [ ] Reference [app/dashboard/student/page.tsx](app/dashboard/student/page.tsx) - Storage in student view
2. [ ] Reference [app/dashboard/teacher/page.tsx](app/dashboard/teacher/page.tsx) - Teacher view
3. [ ] Use existing components in [components/dashboard/](components/dashboard/)

**Phase 7: Supporting Documentation**
1. [ ] Read [LEARNAI_INTEGRATION_ARCHITECTURE.md](LEARNAI_INTEGRATION_ARCHITECTURE.md) - Full system design
2. [ ] Read [LEARNAI_INTEGRATION_DELIVERY.md](LEARNAI_INTEGRATION_DELIVERY.md) - Implementation guide
3. [ ] Use [lib/integrations/ai-classroom-quick-start.ts](lib/integrations/ai-classroom-quick-start.ts) - Code examples
4. [ ] Use [IMPLEMENTATION_CHECKLIST.ts](IMPLEMENTATION_CHECKLIST.ts) - 10-phase checklist
5. [ ] Use [TROUBLESHOOTING_GUIDE.ts](TROUBLESHOOTING_GUIDE.ts) - Problem solving

### For Test Attempts & Analysis (Existing Pattern Path)

When implementing test attempts & analysis, reference these files:

### Phase 1: Database & Types (Understanding)
1. [ ] Read [db/schema.sql](db/schema.sql) - Quiz tables section
2. [ ] Study [lib/types/stage.ts](lib/types/stage.ts) - QuizQuestion type
3. [ ] Review [lib/types/generation.ts](lib/types/generation.ts) - Generated content types

### Phase 2: Service Patterns (Core Logic)
1. [ ] Study [lib/services/diagnostic-test-service.ts](lib/services/diagnostic-test-service.ts) - Main service pattern
2. [ ] Review [lib/services/entity-service.ts](lib/services/entity-service.ts) - Validation & auth checks
3. [ ] Reference [lib/services/learning-dna.ts](lib/services/learning-dna.ts) - Profile aggregation pattern

### Phase 3: Repository CRUD
1. [ ] Copy pattern from [lib/repositories/entity-repository.ts](lib/repositories/entity-repository.ts)
2. [ ] Apply to new TestAttemptRepository
3. [ ] Use same parameterization & mapping structure

### Phase 4: API Endpoints
1. [ ] Reference [app/api/quiz-grade/route.ts](app/api/quiz-grade/route.ts) - LLM grading
2. [ ] Reference [app/api/diagnostic-test/[id]/route.ts](app/api/diagnostic-test/[id]/route.ts) - Auth patterns
3. [ ] Reference [app/api/student/analytics/route.ts](app/api/student/analytics/route.ts) - Data aggregation

### Phase 5: Dashboard
1. [ ] Reference [app/dashboard/student/page.tsx](app/dashboard/student/page.tsx) - Dashboard layout
2. [ ] Reference [app/dashboard/teacher/page.tsx](app/dashboard/teacher/page.tsx) - Teacher view
3. [ ] Use existing dashboard components in [components/dashboard/](components/dashboard/)

### Phase 6: Auth & Utilities
1. [ ] Review [lib/middleware/auth.ts](lib/middleware/auth.ts) - How `withRole()` works
2. [ ] Review [lib/logger.ts](lib/logger.ts) - Logging pattern
3. [ ] Review [lib/server/api-response.ts](lib/server/api-response.ts) - Response formatting

---

## Quick Code Search

**To find specific patterns, search for:**

| Pattern | Search For |
|---------|-----------|
| **AI Classroom Integration** | |
| How to generate session | `generateAIClassroomSession` in lib/services/learnai-integration-service.ts |
| How to call OpenMAIC | `buildOpenMAICRequest` in learnai-integration-service.ts |
| How to map external response | `mapOpenMAICOutput` in learnai-integration-service.ts |
| How to calculate engagement | `calculateEngagementScore` in lib/repositories/session-interaction-log-repository.ts |
| How to search transcript | `searchTranscript` in lib/repositories/session-transcript-repository.ts |
| How to handle errors | `AIClassroomError` in lib/integrations/ai-classroom-errors.ts |
| AI Classroom API endpoints | `app/api/ai-classroom/` directory |
| **Diagnostic Tests (Existing)** | |
| How tests are graded | `callLLM` in api/quiz-grade/route.ts |
| How scores are stored | `quiz_attempts` in db/schema.sql |
| How auth works | `withRole` in lib/middleware/auth.ts |
| How pagination works | `LIMIT $1 OFFSET $2` in repositories |
| How analytics aggregate data | `GROUP BY` in api/student/analytics |
| How errors are handled | `.catch()` in api/ endpoints |
| How timestamps work | `TIMESTAMP` + `NOW()` in schema.sql |
| How multi-tenancy works | Search `school_id` in any service |
| How to call LLM | `callLLM` in services |
| How to return errors | `apiError` in api/quiz-grade/route.ts |

---

## Summary: Implementation Paths

### Path A: AI Classroom Integration (New System - 2800+ LOC)

```
1. CREATE database tables
   → Run: db/migrations/2026-03-23-ai-classroom-tables.sql
   → Tables: ai_classroom_sessions, session_transcripts, session_interaction_logs

2. UNDERSTAND types in lib/types/ai-classroom.ts
   → 30+ TypeScript interfaces
   → Matches OpenMAIC response structure

3. STUDY LearnAIIntegrationService (lib/services/)
   → generateAIClassroomSession() - Main flow
   → buildOpenMAICRequest() - Context injection
   → mapOpenMAICOutput() - Response transformation
   → handleQuizSubmission() - Grading & mastery

4. IMPLEMENT repositories (lib/repositories/)
   → ai-classroom-session-repository.ts - Session CRUD + analytics
   → session-transcript-repository.ts - Transcript search + stats
   → session-interaction-log-repository.ts - Engagement scoring

5. IMPLEMENT API endpoints (app/api/ai-classroom/)
   → POST /sessions/generate - Create session
   → GET /sessions - List sessions
   → GET /sessions/[id] - Get single session
   → POST /sessions/[id]/submit-quiz - Grade quiz
   → GET /sessions/[id]/transcript - Get transcript

6. INTEGRATE error handling (lib/integrations/ai-classroom-errors.ts)
   → 15 semantic error codes
   → Retry strategies per error type
   → Validation functions

7. FOLLOW detailed guides
   → IMPLEMENTATION_CHECKLIST.ts - 10-phase plan
   → TROUBLESHOOTING_GUIDE.ts - 50+ solutions
   → Quick-start examples in ai-classroom-quick-start.ts
```

### Path B: Test Attempts & Analysis (Existing Pattern)

```
1. CREATE types in lib/types/tests.ts
   → Copy from lib/types/stage.ts pattern

2. CREATE repository in lib/repositories/test-attempt-repository.ts
   → Copy from entity-repository.ts pattern

3. CREATE service in lib/services/test-attempt-service.ts
   → Study diagnostic-test-service.ts
   → Add: create, submit, analyze functions

4. CREATE API endpoints in app/api/tests/
   → Reference quiz-grade and student/analytics endpoints
   → Use withRole() middleware

5. CREATE dashboard component in app/dashboard/
   → Reference student/teacher dashboard patterns
   → Use existing dashboard components

6. UPDATE school's database
   → Run migrations to add quiz_attempts if not exists
```

---

## File Organization Summary

**New AI Classroom Files** (17 files, 2800+ lines):
- Service: `lib/services/learnai-integration-service.ts` (450+ lines)
- Types: `lib/types/ai-classroom.ts` (600+ lines)
- Repositories: `lib/repositories/ai-classroom-*-repository.ts` (900+ lines across 3 files)
- Error handling: `lib/integrations/ai-classroom-errors.ts` (400+ lines)
- API: `app/api/ai-classroom/` (5 endpoints)
- Database: `db/migrations/2026-03-23-ai-classroom-tables.sql`
- Documentation: 5 support documents (2000+ lines)

**Reference Architecture Files** (What you're reading now):
- **CODEBASE_REFERENCE_MAP.md** - This file, quick navigation
- **LEARNAI_INTEGRATION_ARCHITECTURE.md** - Full system design
- **LEARNAI_INTEGRATION_DELIVERY.md** - Implementation guide
- **IMPLEMENTATION_CHECKLIST.ts** - 10-phase checklist with tasks
- **TROUBLESHOOTING_GUIDE.ts** - Common issues & solutions
- **QUICK_REFERENCE_CARD.md** - One-page cheat sheet
- **LEARNAI_INTEGRATION_DELIVERY_SUMMARY.md** - Executive overview
   → Ensure indexes are in place
```

All code templates ready in [COPY_PASTE_IMPLEMENTATION_TEMPLATES.md](COPY_PASTE_IMPLEMENTATION_TEMPLATES.md)
