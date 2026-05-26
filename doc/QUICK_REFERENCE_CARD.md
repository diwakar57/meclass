# LearnAI-OpenMAIC Integration: Quick Reference Card

**Print this and keep handy during implementation**

---

## 🎯 Key Files at a Glance

| File | Purpose | Key Item |
|------|---------|----------|
| `lib/services/learnai-integration-service.ts` | Main orchestrator | `generateAIClassroomSession()` |
| `lib/types/ai-classroom.ts` | All types & interfaces | 30+ types defined |
| `lib/repositories/ai-classroom-session-repository.ts` | Session data access | 11 methods for CRUD + analytics |
| `lib/repositories/session-transcript-repository.ts` | Transcript access | Search, append, stats |
| `lib/repositories/session-interaction-log-repository.ts` | Interaction tracking | Engagement scoring |
| `lib/integrations/ai-classroom-errors.ts` | Error handling | 15 error codes + validators |
| `app/api/ai-classroom/sessions/generate/route.ts` | Generate endpoint | POST returns 202 |
| `app/api/ai-classroom/sessions/route.ts` | List endpoint | GET with pagination |
| `db/migrations/2026-03-23-ai-classroom-tables.sql` | Database schema | 3 tables, 7 indexes |

---

## 🔄 Main Flow: Session Generation

```
1. POST /api/ai-classroom/sessions/generate
   ↓
2. Validate (JWT, inputs)
   ↓
3. LearnAIIntegrationService.generateAIClassroomSession()
   ↓
4. Fetch context:
   - StudentService.getProfile(studentId)
   - CurriculumService.getTopic(topicId)
   - LearningDNAService.getLearningProfile(studentId)
   ↓
5. buildOpenMAICRequest (inject context)
   ↓
6. Call OpenMAIC API
   ↓
7. mapOpenMAICOutput (to AIClassroomSession)
   ↓
8. Persist:
   - ai_classroom_sessions
   - session_transcripts
   - session_interaction_logs
   ↓
9. Return 202 { sessionId, status }
```

---

## 🗂️ Database Schema Quick View

### `ai_classroom_sessions`
```sql
id (uuid) | student_id | school_id | topic_id | 
difficulty_level | teaching_style | duration |
status | scene_data (JSONB) | interaction_data (JSONB) |
media_data (JSONB) | generated_at | started_at | completed_at |
created_at | updated_at
```

**Key Indexes**: school_id, student_id, topic_id, status, created_at

### `session_transcripts`
```sql
id (uuid) | session_id | school_id |
content (TEXT) | entries (JSONB[]) |
word_count | speaker_stats (JSONB) |
created_at | updated_at
```

**Key Indexes**: session_id, school_id, tsvector for full-text search

### `session_interaction_logs`
```sql
id (uuid) | session_id | school_id | student_id |
entries (JSONB[]) | engagement_score |
created_at | updated_at
```

**Key Indexes**: session_id, school_id, student_id

---

## 🚀 Quick Start Command Line

```bash
# 1. Run migration
psql $DATABASE_URL < db/migrations/2026-03-23-ai-classroom-tables.sql

# 2. Start dev server
pnpm dev

# 3. Generate session (from terminal)
curl -X POST http://localhost:3000/api/ai-classroom/sessions/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-123",
    "topicId": "topic-456",
    "schoolId": "school-789"
  }'

# 4. List sessions
curl -X GET "http://localhost:3000/api/ai-classroom/sessions?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Get single session
curl -X GET http://localhost:3000/api/ai-classroom/sessions/SESSION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🛠️ API Endpoints Reference

### Generate Session
```
POST /api/ai-classroom/sessions/generate
Body: {
  studentId: string (required)
  topicId: string (required)
  schoolId: string (required)
  sessionDuration?: number (minutes, default 30)
  teachingStyle?: 'friendly' | 'rigorous' | 'encouraging'
  enableVideo?: boolean
  enableAudio?: boolean
  enableInteraction?: boolean
  enableQuiz?: boolean
}
Response: { sessionId, status: 'generated', ... }
Status: 202 Accepted
```

### List Sessions
```
GET /api/ai-classroom/sessions?limit=20&offset=0
Response: { sessions: [...], total: number }
Status: 200
```

### Get Session
```
GET /api/ai-classroom/sessions/[id]
Response: AIClassroomSession (full object)
Status: 200 or 404
```

### Submit Quiz
```
POST /api/ai-classroom/sessions/[id]/submit-quiz
Body: {
  responses: [
    { questionId: string, answer: string | string[] }
  ]
}
Response: { score, maxScore, percentage, masteredAt }
Status: 200 or 400
```

### Get Transcript
```
GET /api/ai-classroom/sessions/[id]/transcript?format=json&search=term
Response: { transcript, stats: { wordCount, entryCount, ... } }
Status: 200 or 404
```

---

## 📊 Error Codes Reference

| Code | HTTP | Retryable | Meaning |
|------|------|-----------|---------|
| `INVALID_STUDENT_ID` | 400 | ❌ | Student doesn't exist |
| `INVALID_TOPIC_ID` | 400 | ❌ | Topic doesn't exist |
| `UNAUTHORIZED_ACCESS` | 403 | ❌ | No permission |
| `SESSION_NOT_FOUND` | 404 | ❌ | Session doesn't exist |
| `GENERATION_TIMEOUT` | 504 | ✅ | OpenMAIC slow (retry) |
| `SERVICE_UNAVAILABLE` | 503 | ✅ | OpenMAIC down (retry) |
| `DATABASE_ERROR` | 500 | ⚠️ | DB connection issue |
| `GENERATION_FAILED` | 500 | ❌ | OpenMAIC error |
| `RATE_LIMIT_EXCEEDED` | 429 | ✅ | Too many requests |

**Handling Pattern**:
```typescript
if (isRetryable(error)) {
  const strategy = getRetryStrategy(error);
  // Wait: strategy.delayMs * Math.pow(strategy.backoffMultiplier, attempt)
  // Max attempts: strategy.maxRetries
}
```

---

## 🔐 Security Checklist

✅ All endpoints require JWT token  
✅ All queries filter by school_id  
✅ Parameterized SQL queries (prevent injection)  
✅ Input validation at API boundaries  
✅ Role-based authorization (student/teacher/admin)  
✅ Error messages don't leak internal info  

**Test**: Student from School A cannot access School B data

---

## 📈 Performance Targets

| Operation | Target | How to Monitor |
|-----------|--------|-----------------|
| GET session | <200ms | `time curl ...` |
| List 100 sessions | <300ms | Check response header timing |
| Generate (excl. OpenMAIC) | <2s | Server logs |
| Search transcripts | <1s | Query execution time |

**Optimize if**: Response times exceed targets by 2x

---

## 🧪 Testing Checklist (Quick Version)

### Must Pass
- [ ] POST /generate returns 202
- [ ] GET /sessions returns list
- [ ] GET /sessions/[id] returns session
- [ ] POST /submit-quiz graded correctly
- [ ] GET /transcript returns text/JSON
- [ ] Student A can't see Student B's data
- [ ] Invalid JWT returns 401
- [ ] Database has 3 tables created

### Should Pass
- [ ] Pagination works
- [ ] Search in transcript works
- [ ] Engagement score calculated
- [ ] Error codes match documentation
- [ ] Timeouts handled gracefully

### Nice to Have
- [ ] Load test with 100 concurrent users
- [ ] Query times logged
- [ ] Error distribution measured

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| **401 Unauthorized** | Check JWT token in Authorization header |
| **404 Not Found** | Verify ID exists in database |
| **400 Bad Request** | Check request body matches schema |
| **500 Internal Error** | Check logs: `/var/log/app.log` |
| **Slow queries** | Run: `EXPLAIN ANALYZE` on query |
| **Empty database** | Run migration: `psql ... < migration.sql` |
| **Session not created** | Check OpenMAIC API response |
| **Wrong school data** | Verify school_id in JWT claim |

---

## 📱 Integration Points

**Must integrate with existing services**:
- `StudentService` → Get profile (grade, interests, learning style)
- `CurriculumService` → Get topic (objectives, concepts)
- `LearningDNAService` → Get learning profile (pace, mistakes)
- `TopicMasteryService` → Update after quiz (optional)

**External service**:
- `OpenMAIC` → Call `generateClassroom()` API

---

## 💾 Database Connection

```typescript
// In your implementation
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Use in repositories:
const result = await pool.query('SELECT...', []);
```

---

## 🔑 Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/learnai

# OpenMAIC
OPENMAIC_API_KEY=your-api-key-here
OPENMAI_API_URL=https://api.openmaic.com

# JWT
JWT_SECRET=your-jwt-secret

# Optional
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.com
```

---

## 📞 Common Questions

**Q: Where do I initialize the service?**  
A: In your API route handler: `const service = new LearnAIIntegrationService();`

**Q: How do I test without OpenMAIC?**  
A: Mock the OpenMAIC call in `buildOpenMAICRequest()` method

**Q: Can I modify the session type?**  
A: Yes, extend `AIClassroomSessionType` union in types

**Q: What if OpenMAIC response format changes?**  
A: Update `mapOpenMAICOutput()` method only

**Q: How do I add new interaction types?**  
A: Add to `InteractionLogEntryType` union in types

---

## 📚 Document Map

```
├─ Architecture (understanding HOW)
│  └─ LEARNAI_INTEGRATION_ARCHITECTURE.md
├─ Implementation (showing WHAT to do)
│  ├─ LEARNAI_INTEGRATION_DELIVERY.md
│  ├─ ai-classroom-quick-start.ts
│  └─ IMPLEMENTATION_CHECKLIST.ts
├─ Troubleshooting (fixing WHEN issues arise)
│  └─ TROUBLESHOOTING_GUIDE.ts
└─ Code (the actual implementation)
   ├─ lib/services/learnai-integration-service.ts
   ├─ lib/types/ai-classroom.ts
   ├─ lib/repositories/
   ├─ lib/integrations/ai-classroom-errors.ts
   ├─ app/api/ai-classroom/
   └─ db/migrations/
```

**Read in order**: Architecture → Delivery → Quick Start → Checklist → Code → Troubleshooting

---

## ⚡ Pro Tips

1. **Use PostSQL dev container**: `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:15`
2. **Test with curl**: Easier than frontend before APIs are ready
3. **Log OpenMAIC responses**: Add `console.log(JSON.stringify(response, null, 2))`
4. **Use VSCode REST Client**: Send .http files from editor
5. **Monitor database size**: `SELECT pg_size_pretty(pg_database_size(current_database()))`

---

## ✅ Go-Live Checklist

- [ ] All 5 APIs tested and working
- [ ] All 3 repositories functional
- [ ] Error handling covers all 15 codes
- [ ] Database indexes created
- [ ] Environment variables configured
- [ ] No console.logs in production code
- [ ] Error logs monitored
- [ ] Database backups taken
- [ ] Rollback plan documented
- [ ] Load test passed
- [ ] Security review completed
- [ ] Documentation verified

✅ **GREEN LIGHT**: Ready to go live!

---

*Keep this card visible during implementation. Reference the full documentation for deep dives.*
