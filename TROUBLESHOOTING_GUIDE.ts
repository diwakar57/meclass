/**
 * LearnAI-OpenMAIC Integration: Troubleshooting Guide
 * 
 * Common issues and their solutions during implementation
 */

export const TroubleshootingGuide = {
  title: 'AI Classroom Integration Troubleshooting',
  sections: [
    {
      category: 'Database Issues',
      problems: [
        {
          issue: 'Migration fails: "table already exists"',
          cause: 'Table was already created or migration ran twice',
          solutions: [
            '1. Check existing tables: SELECT tablename FROM pg_tables WHERE schemaname = \'public\';',
            '2. If tables exist, drop them: DROP TABLE IF EXISTS ai_classroom_sessions, session_transcripts, session_interaction_logs CASCADE;',
            '3. Re-run migration: psql $DATABASE_URL < db/migrations/2026-03-23-ai-classroom-tables.sql',
          ],
        },
        {
          issue: 'Foreign key constraint violation',
          cause: 'Referenced records (student, topic, school) do not exist',
          solutions: [
            '1. Check student exists: SELECT * FROM users WHERE id = \'student-id\';',
            '2. Check topic exists: SELECT * FROM topics WHERE id = \'topic-id\';',
            '3. Check school exists: SELECT * FROM schools WHERE id = \'school-id\';',
            '4. Create test data if missing:',
            '   INSERT INTO schools (id, name) VALUES (\'school-123\', \'Test School\');',
            '   INSERT INTO users (id, school_id, name) VALUES (\'student-123\', \'school-123\', \'Test Student\');',
            '   INSERT INTO topics (id, school_id, name) VALUES (\'topic-123\', \'school-123\', \'Test Topic\');',
          ],
        },
        {
          issue: 'Connection timeout: "connect ECONNREFUSED"',
          cause: 'PostgreSQL not running or DATABASE_URL incorrect',
          solutions: [
            '1. Verify PostgreSQL is running: psql --version',
            '2. Test connection: psql $DATABASE_URL -c "SELECT 1"',
            '3. Check DATABASE_URL in .env.local: echo $DATABASE_URL',
            '4. Format should be: postgresql://user:password@localhost:5432/dbname',
            '5. Restart PostgreSQL if needed',
          ],
        },
        {
          issue: 'Index creation fails',
          cause: 'PostgreSQL version too old or syntax error',
          solutions: [
            '1. Check PostgreSQL version: SELECT version();',
            '2. Minimum version: 12.0',
            '3. Test index creation manually: CREATE INDEX idx_test ON ai_classroom_sessions(school_id);',
            '4. If fails, check syntax and permissions',
          ],
        },
      ],
    },
    {
      category: 'Service Layer Issues',
      problems: [
        {
          issue: 'generateAIClassroomSession() throws "Cannot find module"',
          cause: 'Repository imports not configured or module not found',
          solutions: [
            '1. Verify repository files exist:',
            '   - lib/repositories/ai-classroom-session-repository.ts',
            '   - lib/repositories/session-transcript-repository.ts',
            '   - lib/repositories/session-interaction-log-repository.ts',
            '2. Check import paths in LearnAIIntegrationService',
            '3. Rebuild: pnpm build',
            '4. Check for circular dependencies: pnpm tsc --noEmit',
          ],
        },
        {
          issue: 'OpenMAIC API returns 401 Unauthorized',
          cause: 'Invalid API key or URL',
          solutions: [
            '1. Verify OPENMAIC_API_KEY: echo $OPENMAIC_API_KEY',
            '2. Verify OPENMAI_API_URL: echo $OPENMAI_API_URL',
            '3. Test with curl: curl -H "Authorization: Bearer $KEY" $URL/health',
            '4. Check API key is not expired or revoked',
            '5. Verify correct environment (staging vs production)',
          ],
        },
        {
          issue: 'OpenMAIC request times out',
          cause: 'Network latency, OpenMAIC slow, or timeout too short',
          solutions: [
            '1. Check OpenMAIC health: curl -H "Bearer: $KEY" $URL/health',
            '2. Check network: ping $OPENMAI_API_URL',
            '3. Increase timeout in buildOpenMAICRequest() if needed',
            '4. Review OpenMAIC logs for slow requests',
            '5. Implement exponential backoff retry',
          ],
        },
        {
          issue: 'mapOpenMAICOutput() throws "Cannot read property"',
          cause: 'OpenMAIC response structure changed or missing fields',
          solutions: [
            '1. Log full OpenMAIC response: console.log(JSON.stringify(openmiacResponse, null, 2))',
            '2. Check response matches expected structure from architecture doc',
            '3. Add null checks: response?.stages?.[0]?.scenes || []',
            '4. Update mapping logic to match actual response',
            '5. Add integration tests for response parsing',
          ],
        },
      ],
    },
    {
      category: 'API Endpoint Issues',
      problems: [
        {
          issue: 'POST /api/ai-classroom/sessions/generate returns 401',
          cause: 'Missing or invalid JWT token',
          solutions: [
            '1. Verify Authorization header: Authorization: Bearer <jwt_token>',
            '2. JWT_SECRET configured: echo $JWT_SECRET',
            '3. Token is not expired: decode token at jwt.io',
            '4. Token has required claims (sub, school_id)',
            '5. Check middleware/auth.ts for token validation',
          ],
        },
        {
          issue: 'POST /api/ai-classroom/sessions/generate returns 400',
          cause: 'Invalid request body or validation failed',
          solutions: [
            '1. Check Content-Type: application/json',
            '2. Verify required fields: studentId, topicId, schoolId',
            '3. Validate field formats: all should be non-empty strings',
            '4. Check payload size (should be <10KB)',
            '5. Review request validation errors in error response',
          ],
        },
        {
          issue: 'GET /api/ai-classroom/sessions returns empty array',
          cause: 'No sessions exist or student filter is too restrictive',
          solutions: [
            '1. Check database: SELECT * FROM ai_classroom_sessions WHERE student_id = \'test\';',
            '2. Verify student_id matches JWT token sub claim',
            '3. Check school_id in request matches JWT school_id claim',
            '4. Generate at least one session first',
            '5. Check pagination: default limit might show 0 results',
          ],
        },
        {
          issue: 'GET /api/ai-classroom/sessions/[id] returns 404',
          cause: 'Session not found or wrong ID',
          solutions: [
            '1. Verify session ID exists: SELECT * FROM ai_classroom_sessions WHERE id = \'session-id\';',
            '2. Check school_id in request matches session creator',
            '3. Verify student owns the session (if not admin/teacher)',
            '4. Session might have been deleted',
            '5. Check ID format (should be UUID or string from DB)',
          ],
        },
        {
          issue: 'POST quiz submission returns 400 "Invalid answers"',
          cause: 'Question ID or answer format incorrect',
          solutions: [
            '1. Get quiz structure: GET /api/ai-classroom/sessions/[id]',
            '2. Extract questionIds from response.interactionData.quizData.quizzes',
            '3. Verify each response has correct questionId',
            '4. Check answer format matches question type:',
            '   - multiple_choice: "option-id" (string)',
            '   - text: "answer text" (string)',
            '   - multiple_select: ["option-1", "option-2"] (array)',
            '5. Ensure responses array is not empty',
          ],
        },
      ],
    },
    {
      category: 'Data & Validation Issues',
      problems: [
        {
          issue: 'Session created but sceneData is empty',
          cause: 'OpenMAIC response not properly mapped or validation too strict',
          solutions: [
            '1. Log OpenMAIC response in mapOpenMAICOutput()',
            '2. Verify response structure: { stages: [{ scenes: [...] }] }',
            '3. Check scene validation: validateSessionData() may be filtering scenes',
            '4. Ensure JSONB parsing works: JSON.parse(sceneData) should not throw',
            '5. Review mapping logic for all scene types (slide, quiz, interactive)',
          ],
        },
        {
          issue: 'Quiz submission accepted but score is 0',
          cause: 'Answer grading logic not working',
          solutions: [
            '1. Get quiz structure: check expected answers in ai_classroom_sessions.scene_data',
            '2. Verify answer key exists: SELECT interaction_data->>\'quizData\' FROM ai_classroom_sessions WHERE id = \'session-id\'',
            '3. Check answer comparison logic in handleQuizSubmission()',
            '4. Ensure string comparison is case-handled properly',
            '5. Add console.log to grading function to debug',
          ],
        },
        {
          issue: 'Interaction log shows no engagement',
          cause: 'Interactions not being logged during playback',
          solutions: [
            '1. Verify addInteractionEntry() is being called during playback',
            '2. Check frontend code calls API endpoint for each interaction',
            '3. Verify entries in database: SELECT * FROM session_interaction_logs WHERE session_id = \'id\'',
            '4. Ensure timestamps are within session duration',
            '5. Check calculateEngagementScore() includes latest entries',
          ],
        },
      ],
    },
    {
      category: 'Authentication & Authorization',
      problems: [
        {
          issue: 'Student can see other students\' sessions',
          cause: 'School/student isolation not enforced',
          solutions: [
            '1. Verify school_id filtering in listStudentSessions()',
            '2. Check API endpoint enforces studentId from JWT',
            '3. Verify repository query includes school_id: WHERE school_id = $1 AND student_id = $2',
            '4. Audit query in session handler: ensure no bypass',
            '5. Add assertion: if (session.schoolId !== jwtSchoolId) throw 403',
          ],
        },
        {
          issue: 'Teacher cannot view student sessions',
          cause: 'Authorization check too restrictive',
          solutions: [
            '1. Check if teacher role is included in auth headers',
            '2. Verify role-based access in API endpoint',
            '3. Teachers should be able to view if: isTeacher AND studentInMyClass',
            '4. Add role check: if (role === \'teacher\') { allow if inMyClass() }',
            '5. Implement class roster check if needed',
          ],
        },
      ],
    },
    {
      category: 'Performance Issues',
      problems: [
        {
          issue: 'List sessions endpoint slow (>3s)',
          cause: 'Missing indexes or poor query',
          solutions: [
            '1. Check indexes exist: SELECT * FROM pg_indexes WHERE tablename = \'ai_classroom_sessions\'',
            '2. Run EXPLAIN ANALYZE on query:',
            '   EXPLAIN ANALYZE SELECT * FROM ai_classroom_sessions WHERE school_id = \'x\' AND student_id = \'y\' ORDER BY created_at DESC;',
            '3. Add index if missing: CREATE INDEX idx_school_student ON ai_classroom_sessions(school_id, student_id);',
            '4. Check JSONB queries use proper operators (@>, ->>)',
            '5. Limit results: add LIMIT clause if not present',
          ],
        },
        {
          issue: 'Transcript search very slow',
          cause: 'Full-text index not created or not used',
          solutions: [
            '1. Check tsvector index: SELECT * FROM pg_indexes WHERE indexname LIKE \'%transcript%\'',
            '2. Verify index type is GIN: CREATE INDEX idx_search ON session_transcripts USING gin(to_tsvector(\'english\', content))',
            '3. Update search query to use: to_tsvector(\'english\', content) @@ to_tsquery(\'english\', query)',
            '4. For ILIKE fallback, add LIMIT to first 100 matches',
          ],
        },
      ],
    },
    {
      category: 'Deployment Issues',
      problems: [
        {
          issue: 'Session creation fails in production with "Network error"',
          cause: 'Environment variables not set or service account permissions',
          solutions: [
            '1. Verify all env vars set in production:',
            '   - OPENMAIC_API_KEY',
            '   - OPENMAI_API_URL',
            '   - DATABASE_URL',
            '   - JWT_SECRET',
            '2. Check database user has correct permissions: CREATE, INSERT, UPDATE, SELECT',
            '3. Verify network access from app server to OpenMAIC',
            '4. Check firewall rules: port 5432 for DB, HTTPS for OpenMAIC',
            '5. Review production logs: check for connection errors',
          ],
        },
        {
          issue: 'Database migrations fail in production',
          cause: 'Migration script has errors or permissions insufficient',
          solutions: [
            '1. Test migration in staging first: never migrate without testing',
            '2. Verify migration user has CREATE INDEX, CREATE TABLE permissions',
            '3. Check for syntax errors in migration file',
            '4. Run migration with detailed output: psql -e --file=migration.sql',
            '5. Have rollback plan ready: keep backup before migration',
          ],
        },
      ],
    },
    {
      category: 'Monitoring & Debugging',
      problems: [
        {
          issue: 'Cannot debug why session generation fails',
          cause: 'Insufficient logging',
          solutions: [
            '1. Add logging at each step:',
            '   - Before validation',
            '   - After fetching context',
            '   - Before OpenMAIC call',
            '   - After OpenMAIC response',
            '   - Before database write',
            '   - After persistence',
            '2. Log full error stack: console.error(error, { context... })',
            '3. Use structured logging: { timestamp, requestId, userId, error }',
            '4. Review logs in: /var/log/app.log or cloud logging service',
            '5. Add request ID header to trace through logs',
          ],
        },
        {
          issue: 'Memory leak or growing database',
          cause: 'Not cleaning up old sessions or temp data',
          solutions: [
            '1. Check database size: SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;',
            '2. Check table sizes: SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||\'.\'||tablename)) FROM pg_tables;',
            '3. Implement cleanup job: delete sessions older than 90 days',
            '4. Archive old transcripts to S3 if needed',
            '5. Monitor disk usage: set alert if DB grows >50GB/week',
          ],
        },
      ],
    },
  ],
};

/**
 * Quick lookup by symptom
 */
export const QuickReference = {
  '401 Unauthorized': 'Check JWT token in Authorization header',
  'Cannot find module': 'Verify file paths and rebuild: pnpm build',
  'Table does not exist': 'Run migration: psql $DATABASE_URL < migration.sql',
  'Session not found': 'Verify school_id and student_id match JWT claims',
  'OpenMAIC timeout': 'Check OPENMAI_API_URL and network connectivity',
  'Empty list response': 'Check pagination defaults, might need offset=0',
  'Quiz score always 0': 'Verify answer key in session, check grading logic',
  'Slow queries': 'Check indexes: SELECT * FROM pg_indexes WHERE tablename = \'ai_classroom_sessions\'',
  'Data in wrong school': 'Verify school_id filtering at API level',
};

/**
 * Debug script template
 */
export const DebugTemplate = `
// Add to your debug endpoint or console
import crypto from 'crypto';

export async function debugSession(sessionId: string, schoolId: string) {
  console.log('=== AI Classroom Debug ===\\n');
  
  // 1. Check database
  console.log('1. Checking database...');
  const session = await db.query(
    'SELECT * FROM ai_classroom_sessions WHERE id = $1 AND school_id = $2',
    [sessionId, schoolId]
  );
  console.log('   Session found:', !!session.rows[0]);
  if (session.rows[0]) {
    console.log('   Status:', session.rows[0].status);
    console.log('   Student:', session.rows[0].student_id);
    console.log('   Created:', session.rows[0].created_at);
  }
  
  // 2. Check transcript
  console.log('\\n2. Checking transcript...');
  const transcript = await db.query(
    'SELECT COUNT(*) FROM session_transcripts WHERE session_id = $1',
    [sessionId]
  );
  console.log('   Transcript entries:', transcript.rows[0].count);
  
  // 3. Check interaction log
  console.log('\\n3. Checking interaction log...');
  const interactions = await db.query(
    'SELECT COUNT(*) FROM session_interaction_logs WHERE session_id = $1',
    [sessionId]
  );
  console.log('   Interaction entries:', interactions.rows[0].count);
  
  // 4. Check OpenMAIC connectivity
  console.log('\\n4. Checking OpenMAIC...');
  try {
    const response = await fetch(process.env.OPENMAI_API_URL + '/health', {
      headers: { Authorization: \`Bearer \${process.env.OPENMAIC_API_KEY}\` },
    });
    console.log('   Status:', response.status);
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('   Error:', error);
  }
  
  // 5. Check JWT parsing
  console.log('\\n5. Checking JWT...');
  const jwtPayload = JSON.parse(
    Buffer.from(process.env.JWT_SECRET?.split('.')[1] || '', 'base64').toString()
  );
  console.log('   JWT payload:', JSON.stringify(jwtPayload, null, 2));
  
  console.log('\\n=== Debug Complete ===');
}
`;

/**
 * Useful queries
 */
export const UsefulQueries = {
  'Remove test sessions': `DELETE FROM ai_classroom_sessions WHERE student_id LIKE 'test-%';`,
  'Check connection pool': `SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;`,
  'Find slow queries': `SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`,
  'Check index usage': `SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan;`,
  'Session statistics': `SELECT status, COUNT(*) FROM ai_classroom_sessions GROUP BY status;`,
  'Average duration': `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FROM ai_classroom_sessions WHERE status = 'completed';`,
  'Disk usage': `SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;`,
};

export default {
  TroubleshootingGuide,
  QuickReference,
  DebugTemplate,
  UsefulQueries,
};
