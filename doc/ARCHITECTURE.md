# AI School Platform - System Architecture

## Overview

The AI School Platform transforms LearnAI (an open-source multi-agent interactive classroom) into a production-ready, multi-tenant SaaS platform for K-12 schools. 

**Key Innovation**: Reuses LearnAI's powerful lesson generation and multi-agent orchestration capabilities while adding enterprise features for school administration, student personalization, and progress tracking.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  (Student, Teacher, Admin Dashboards - to be implemented)   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + WebSockets
┌────────────────────────▼────────────────────────────────────┐
│                      API LAYER                               │
│  /api/auth/* (LOGIN, SIGNUP, REFRESH)                       │
│  /api/students/* (PROFILE, ONBOARDING, PROGRESS)            │
│  /api/lessons/* (GENERATE, FETCH, SUBMIT QUIZ)              │
│  /api/schools/* (MANAGE SCHOOL) [SaaS]                      │
│  /api/curriculum/* (MANAGE TOPICS) [TEACHER]                │
│  /api/classes/* (MANAGE CLASSES) [ADMIN]                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  Authentication Service (JWT, Password, Session)            │
│  School Management Service (CRUD, Stats)                    │
│  Student Service (Profiles, Onboarding)                     │
│  Curriculum Service (Topics, Objectives)                    │
│  Progress Service (Mastery, Quiz Attempts)                  │
│  Learning Journey Engine (Next Topic, Path)                 │
│  Personalized Generator (Adapt LearnAI)                    │
│  Tenant Isolation Middleware (School-level)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              OPENMAIC CORE LAYER (REUSED)                    │
├─────────────────────────────────────────────────────────────┤
│  Lesson Generation Engine                                   │
│    ├─ Outline Generation (LLM → SceneOutline[])             │
│    ├─ Scene Content Generation (Detailed scenes)            │
│    └─ Actions Generation (Speech, Drawing, Effects)         │
│                                                              │
│  Multi-Agent Orchestration (LangGraph)                      │
│    ├─ Director Node (Decides next speaker)                  │
│    ├─ Agent Execution (Fire actions)                        │
│    └─ Stateless Chat (SSE streaming)                        │
│                                                              │
│  Scene Rendering & Playback                                │
│    ├─ Slide Editor (PPTist)                                 │
│    ├─ Quiz Engine                                           │
│    ├─ Interactive HTML                                      │
│    └─ PBL Activities                                        │
│                                                              │
│  Media Generation Pipeline                                  │
│    ├─ TTS (Azure Cognitive Services)                        │
│    ├─ Image Generation (DALL-E via OpenAI)                  │
│    └─ Video Generation (Framework)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   DATA LAYER                                 │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Structured Data)                               │
│    ├─ Schools (Multi-tenant)                                │
│    ├─ Users (All roles)                                     │
│    ├─ Curriculum & Topics                                   │
│    ├─ Student Profiles & Mastery                            │
│    ├─ Lessons & Quiz Attempts                               │
│    └─ Audit Logs                                            │
│                                                              │
│  Browser IndexedDB (Playback State)                         │
│    ├─ Stages & Scenes                                       │
│    ├─ Chat Sessions                                         │
│    └─ Media Caches                                          │
│                                                              │
│  File Storage (Exports)                                     │
│    ├─ PPTX Slides                                           │
│    └─ HTML Interactive                                      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Complete Learning Workflow

```
STUDENT ONBOARDING
┌─────────────────────────────────────────────────────────────┐
│ Student signs up → POST /api/auth/signup                    │
│   └─ Creates: User, StudentProfile, LearningPlan            │
│       └─ Stores: Grade level, interests, learning style     │
└───────────────────┬─────────────────────────────────────────┘
                    ▼
ONBOARDING QUIZ
┌─────────────────────────────────────────────────────────────┐
│ Student completes diagnostic quiz                           │
│   POST /api/students/onboarding {grade, interests, style}   │
│   └─ Updates student_profiles with onboarding data          │
└───────────────────┬─────────────────────────────────────────┘
                    ▼
PERSONALIZED LESSON GENERATION
┌─────────────────────────────────────────────────────────────┐
│ Teacher assigns topic → POST /api/lessons/generate          │
│   └─ Service: generatePersonalizedLessonOutlines()          │
│       ├─ Fetches StudentProfile (grade, style, interests)   │
│       ├─ Fetches Topic (objectives, grade level)            │
│       ├─ Gets current TopicMastery score                    │
│       └─ Injects into prompt:                               │
│           "Grade 5 student, visual learner, interested in"  │
│            "sports and art, currently struggling (45%)"     │
│           → Uses existing LearnAI generation engine        │
│           → Returns adapted SceneOutline[]                  │
└───────────────────┬─────────────────────────────────────────┘
                    ▼
SCENE RENDERING & PLAYBACK
┌─────────────────────────────────────────────────────────────┐
│ Student launches lesson (browser)                           │
│   ├─ Loads Stage + Scenes from IndexedDB/API               │
│   ├─ Initializes multi-agent orchestration                 │
│   ├─ Streams agent responses (speech, drawing, etc.)       │
│   └─ Stores playback state locally                         │
└───────────────────┬─────────────────────────────────────────┘
                    ▼
QUIZ SUBMISSION & MASTERY UPDATE
┌─────────────────────────────────────────────────────────────┐
│ Student completes quiz                                      │
│   → POST /api/lessons/submit-quiz                           │
│       ├─ Stores: QuizAttempt                                │
│       ├─ Updates: TopicMastery                              │
│       │   ├─ New score = avg(previous attempts + new score) │
│       │   ├─ Attempts += 1                                  │
│       │   └─ Mark mastered if score >= 80                   │
│       └─ Logs engagement signals                            │
└───────────────────┬─────────────────────────────────────────┘
                    ▼
LEARNING JOURNEY UPDATE
┌─────────────────────────────────────────────────────────────┐
│ Background: Update learning plan                            │
│   → getNextRecommendedTopic()                               │
│       ├─ Find next unmasteredtopic in curriculum order     │
│       ├─ Check prerequisites met                            │
│       ├─ For struggling (score < 70%):                      │
│       │   → Suggest Revision with simpler content           │
│       └─ For excelling (score > 90%):                       │
│           → Suggest Enrichment with advanced content        │
└───────────────────┬─────────────────────────────────────────┘
                    ▼
PROGRESS VISUALIZATION (TEACHER/ADMIN VIEW)
┌─────────────────────────────────────────────────────────────┐
│ Teacher views class analytics                               │
│   → GET /api/classes/{classId}/progress                     │
│       └─ For each student:                                  │
│           ├─ Topics mastered (Y / N)                        │
│           ├─ Average mastery score                          │
│           ├─ Time on task                                   │
│           ├─ Quiz attempts history                          │
│           └─ Estimated completion date                      │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. **Multi-Tenancy at Database Level**
- All tables include `school_id` for isolation
- Tenant ID derived from JWT token
- Middleware enforces school-level filtering
- SaaS admin can bypass for administration

**Benefit**: Strong isolation, audit trails, regulatory compliance

### 2. **Reuse LearnAI Generation**
- Injected student context into existing prompts
- No modification to LearnAI code
- Custom persona generation based on learning style
- Difficulty adjustment via prompt engineering

**Benefit**: Proven engine, faster time-to-market, maintainability

### 3. **Stateless API + Browser State**
- Server stores no session context (scalable)
- Client IndexedDB for playback state (offline-ready)
- JWT-based authentication (no server sessions)
- Audit logs for compliance

**Benefit**: Horizontal scalability, offline capability, simplicity

### 4. **Adaptive Difficulty Algorithm**
```
Base Difficulty (by grade level: 1-10)
  ↓
Adjust by mastery:
  - If mastery < 70% → reduce difficulty -1
  - If mastery > 90% → increase difficulty +1
  ↓
Inject into LearnAI prompts for difficulty-aware generation
```

**Benefit**: Personalization, reduced cognitive load, increased challenge

### 5. **Topic Mastery Calculation**
```
New Score = Average(all attempt scores)
Confidence = % of attempts with score >= 80
Mastered = True if New Score >= 80
```

**Benefit**: Fair assessment, quick mastery at high competency, persistence tracking

## Role Permissions Matrix

```
                     saas_admin  principal  teacher  accountant  student
────────────────────────────────────────────────────────────────────────
Create School             ✓
Create User               ✓          ✓
Manage Curriculum                    ✓          ✓
Create Lesson             ✓          ✓          ✓
View Class Progress       ✓          ✓          ✓
View School Analytics     ✓          ✓
Launch Lesson                                              ✓
Submit Quiz                                                ✓
View Own Progress                                          ✓
View Own Profile                                          ✓
Complete Onboarding                                       ✓
```

## Security Architecture

### Authentication Flow
```
1. User → POST /api/auth/login {email, password}
2. Server → Verify password, generate JWT + RefreshToken
3. Client → Store JWT in memory, RefreshToken in cookie
4. Request → Include JWT in Authorization: Bearer header
5. Middleware → Verify JWT, extract auth context
6. Request → Process with auth context (userId, schoolId, role)
```

### Tenant Isolation
```
1. User claims JWT with schoolId
2. Every query filters: WHERE school_id = $1
3. Middleware prevents cross-tenant access (403)
4. SaaS admin role bypasses (for administration)
5. Audit log every action by user
```

### Password Security
```
1. Client → Send password over HTTPS only
2. Server → Hash with bcryptjs (PBKDF2 fallback)
3. Database → Store only hash (never plaintext)
4. Verify → Compare hash on login
5. Reset → Send token, verify before new password
```

## Performance Optimization

### Database Optimization
- Indexes on foreign keys and common filters
- Composite indexes for complex queries
- Connection pooling (20 connections max)
- Query result caching (recommend Redis)

### Caching Strategy
- JWT tokens cached client-side (memory)
- Student profiles cached on login (~1h)
- Curriculum data cached (rarely changes)
- Quiz attempts cached locally until submitted

### Scalability
- Stateless API (horizontal scaling)
- Database connection pooling
- SSE for real-time without WebSockets
- Async media generation (background jobs)

## Compliance & Safety

### GDPR Compliance
- Data export endpoints (to implement)
- Data deletion endpoints (to implement)
- Audit log retention (90 days recommended)
- Right to be forgotten support

### COPPA Compliance (U.S. children's privacy)
- No third-party tracking (implement carefully)
- Parental consent workflow (to implement)
- Limited data collection (only essentials)
- Age verification (in signup)

### Content Safety
- Age-appropriate content filtering (in prompts)
- No invasive biometric surveillance
- Optional wellness check-ins only
- Positive reinforcement tone

## Deployment Considerations

### Development
```bash
# Database
createdb ai_school_db
psql ai_school_db < db/schema.sql

# Seed
npm run db:seed

# Start
pnpm dev
```

### Production
```bash
# Environment
export NODE_ENV=production
export JWT_SECRET=<strong-random>
export DATABASE_URL=postgresql://...

# Database (managed)
# - PostgreSQL on RDS/Cloud SQL
# - Automated backups
# - SSL connections

# App
pm2 start next build
pm2 start next start

# Monitoring
- Application logs → CloudWatch/DataDog
- Database metrics → Prometheus
- Error tracking → Sentry
- Performance → New Relic
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React 19 | Web application shell |
| Backend | Next.js API Routes | REST endpoints |
| Auth | JWT (jose) | Stateless authentication |
| Database | PostgreSQL | Multi-tenant data |
| ORM | Raw SQL (pg) | Query execution |
| Connection | pg pool | Connection management |
| AI SDK | Vercel AI SDK | Multi-provider LLM access |
| Orchestration | LangGraph | Multi-agent conversation |
| Password | bcryptjs | Secure hashing |
| Utilities | nanoid | ID generation |

## Roadmap

### Phase 1 (✅ Complete)
- Database schema with multi-tenancy
- Authentication & JWT
- School management
- Student profiles & onboarding
- Curriculum management
- Progress tracking
- Personalized lesson generation
- Core API endpoints

### Phase 2 (To Implement)
- Student dashboard UI
- Teacher dashboard UI
- Admin dashboard UI
- Quiz submission endpoints
- Engagement signals API
- Class management API
- Parent/guardian portal

### Phase 3 (To Implement)
- Email notifications
- Gamification (points, badges)
- Parent consent workflow
- Data export/deletion
- Advanced analytics
- Content library management

### Phase 4 (To Implement)
- Mobile app (React Native)
- Offline support (sync)
- Advanced AI personalization (ML model)
- School-to-school collaboration
- White-label SaaS
- Enterprise SSO (SAML)

## Conclusion

This platform extends LearnAI's proven lesson generation and multi-agent capabilities with enterprise-grade school management, student personalization, and progress tracking. The architecture balances feature richness with technical simplicity, maintaining the open-source spirit while enabling commercial deployment.

**Key strengths**:
- ✅ Reuses proven LearnAI technology
- ✅ Multi-tenant SaaS ready
- ✅ Student-centered personalization
- ✅ Teacher oversight & control
- ✅ School-level administration
- ✅ Scalable, secure architecture

**Ready for deployment**. Next: UI dashboards and continued feature development.
