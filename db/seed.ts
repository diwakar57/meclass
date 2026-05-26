import { createHash, pbkdf2Sync, randomBytes } from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured. Set it in .env.local or .env before running db/seed.ts');
}

const pool = new Pool({ connectionString: databaseUrl });

async function query(text: string, params: unknown[] = []) {
  return pool.query(text, params);
}

async function hashPassword(password: string): Promise<string> {
  try {
    const bcryptjs = require('bcryptjs');
    return await bcryptjs.hash(password, 10);
  } catch {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }
}

type TopicSeed = {
  key: string;
  title: string;
  objective: string;
  difficulty: 'easy' | 'medium' | 'hard';
  dependencies: string[];
};

const DEMO_PASSWORD = 'Demo@12345';
const DEMO_SCHOOL_NAME = 'LearnAI Demo Academy';
const DEMO_SCHOOL_SLUG = 'learnai-demo-academy';
const DEMO_SCHOOL_DOMAIN = 'demo.learnai.study';
const DEMO_LEARNING_TRACK = 'Machine Learning Foundations';

const DEMO_EMAILS = {
  principal: 'principal@demo.learnai.study',
  principal2: 'principal2@demo.learnai.study',
  principal3: 'principal3@demo.learnai.study',
  schoolAdmin: 'admin@demo.learnai.study',
  teacher: 'teacher@demo.learnai.study',
  teacher2: 'teacher2@demo.learnai.study',
  student: 'student@demo.learnai.study',
  student2: 'student2@demo.learnai.study',
  student3: 'student3@demo.learnai.study',
  applicant: 'applicant@demo.learnai.study',
  parent: 'parent@demo.learnai.study',
  accountant: 'accountant@demo.learnai.study',
  supervisor: 'supervisor@demo.learnai.study',
  saasAdmin: 'saasadmin@learnai.study',
};

const DEMO_NAMES = {
  principal: { first: 'Sarah', last: 'Johnson' },
  principal2: { first: 'James', last: 'Rodriguez' },
  principal3: { first: 'Emily', last: 'Chen' },
  schoolAdmin: { first: 'Alex', last: 'Smith' },
  teacher: { first: 'Michael', last: 'Carter' },
  teacher2: { first: 'Jessica', last: 'Walsh' },
  student: { first: 'Emma', last: 'Davis' },
  student2: { first: 'Noah', last: 'Kim' },
  student3: { first: 'Olivia', last: 'Taylor' },
  applicant: { first: 'Ava', last: 'Applicant' },
  parent: { first: 'Robert', last: 'Wilson' },
  accountant: { first: 'Rebecca', last: 'Foster' },
  supervisor: { first: 'Patricia', last: 'Sullivan' },
  saasAdmin: { first: 'Platform', last: 'Admin' },
};

const TOPICS: TopicSeed[] = [
  {
    key: 'intro-ai',
    title: 'Introduction to AI',
    objective: 'Understand what Artificial Intelligence is and where it is used.',
    difficulty: 'easy',
    dependencies: [],
  },
  {
    key: 'what-is-ml',
    title: 'What is Machine Learning',
    objective: 'Explain how machines learn patterns from data.',
    difficulty: 'easy',
    dependencies: ['intro-ai'],
  },
  {
    key: 'types-ml',
    title: 'Types of Machine Learning',
    objective: 'Differentiate supervised, unsupervised, and reinforcement learning.',
    difficulty: 'medium',
    dependencies: ['what-is-ml'],
  },
  {
    key: 'supervised',
    title: 'Supervised Learning',
    objective: 'Identify labeled-data workflows used in supervised learning.',
    difficulty: 'medium',
    dependencies: ['types-ml'],
  },
  {
    key: 'unsupervised',
    title: 'Unsupervised Learning',
    objective: 'Identify pattern discovery tasks in unlabeled datasets.',
    difficulty: 'medium',
    dependencies: ['types-ml'],
  },
  {
    key: 'train-vs-test',
    title: 'Training Data vs Testing Data',
    objective: 'Compare training and testing datasets and explain their purpose.',
    difficulty: 'medium',
    dependencies: ['supervised', 'unsupervised'],
  },
  {
    key: 'model-eval',
    title: 'Basic Model Evaluation',
    objective: 'Read simple model metrics and explain model quality.',
    difficulty: 'hard',
    dependencies: ['train-vs-test'],
  },
  {
    key: 'real-world',
    title: 'Real-world ML Examples',
    objective: 'Map ML concepts to practical applications across industries.',
    difficulty: 'medium',
    dependencies: ['model-eval'],
  },
];

const UUID_BASE = '11111111-1111-4111-8111-';
function demoId(n: number): string {
  return `${UUID_BASE}${String(n).padStart(12, '0')}`;
}

const IDS = {
  school: demoId(1),
  principal: demoId(2),
  teacher: demoId(3),
  student: demoId(4),
  saasAdmin: demoId(5),
  schoolAdmin: demoId(27),
  teacher2: demoId(28),
  student2: demoId(29),
  student3: demoId(30),
  applicant: demoId(44),
  accountant: demoId(31),
  supervisor: demoId(32),
  school2: demoId(33),
  school3: demoId(34),
  principal2: demoId(35),
  principal3: demoId(36),
  parent: demoId(26),
  class: demoId(6),
  class2: demoId(37),
  studentProfile: demoId(7),
  studentProfile2: demoId(38),
  studentProfile3: demoId(39),
  learningPlan: demoId(8),
  learningPlan2: demoId(40),
  learningPlan3: demoId(41),
  curriculum: demoId(9),
  gradeLevel: demoId(10),
  subject: demoId(11),
  syllabus: demoId(12),
  syllabusUnit: demoId(13),
  membership: demoId(14),
  pendingMembership: demoId(45),
  enrollment: demoId(15),
  lesson: demoId(16),
  selfAssessment: demoId(17),
  diagnosticTest: demoId(18),
  diagnosticAttempt: demoId(19),
  confidenceAnalysis: demoId(20),
  feeStructure: demoId(21),
  studentPayment: demoId(22),
  invoice: demoId(23),
  invoice2: demoId(42),
  invoice3: demoId(43),
  apiKey: demoId(24),
  userSession: demoId(25),
};

const QUIZ_ATTEMPT_IDS = [demoId(101), demoId(102), demoId(103), demoId(104), demoId(105), demoId(106)];
const MASTERY_IDS = [demoId(201), demoId(202), demoId(203), demoId(204), demoId(205), demoId(206), demoId(207), demoId(208)];
const SYLLABUS_TOPIC_IDS = [
  demoId(301),
  demoId(302),
  demoId(303),
  demoId(304),
  demoId(305),
  demoId(306),
  demoId(307),
  demoId(308),
];
const DIAGNOSTIC_QUESTION_IDS = [demoId(401), demoId(402), demoId(403), demoId(404), demoId(405), demoId(406)];

const columnsCache = new Map<string, Set<string>>();

async function tableExists(table: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [table]
  );

  return Boolean(result.rows[0]?.exists);
}

async function getColumns(table: string): Promise<Set<string>> {
  if (columnsCache.has(table)) {
    return columnsCache.get(table)!;
  }

  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );

  const columns = new Set<string>(
    result.rows.flatMap((row) => {
      const columnName = (row as { column_name?: unknown }).column_name;
      return typeof columnName === 'string' && columnName.length > 0 ? [columnName] : [];
    })
  );
  columnsCache.set(table, columns);
  return columns;
}

async function refreshColumns(table: string): Promise<void> {
  columnsCache.delete(table);
  await getColumns(table);
}

async function getIdType(table: string): Promise<'UUID' | 'TEXT'> {
  const result = await query(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = 'id'
     LIMIT 1`,
    [table]
  );

  if (result.rowCount && result.rows[0]?.udt_name === 'uuid') {
    return 'UUID';
  }

  return 'TEXT';
}

function serializeForDb(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

async function upsertById(table: string, id: string, values: Record<string, unknown>): Promise<void> {
  if (!(await tableExists(table))) {
    return;
  }

  const columns = await getColumns(table);

  const filtered = Object.entries(values)
    .filter(([column]) => columns.has(column))
    .map(([column, value]) => [column, serializeForDb(value)] as const);

  if (filtered.length === 0 || !columns.has('id')) {
    return;
  }

  const exists = await query(`SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`, [id]);

  if ((exists.rowCount ?? 0) > 0) {
    const updateEntries = filtered.filter(([column]) => column !== 'id');
    if (columns.has('updated_at') && !updateEntries.some(([column]) => column === 'updated_at')) {
      updateEntries.push(['updated_at', new Date()]);
    }

    if (updateEntries.length === 0) return;

    const assignments = updateEntries.map(([column], index) => `${column} = $${index + 1}`).join(', ');
    const params = updateEntries.map(([, value]) => value);
    params.push(id);

    await query(`UPDATE ${table} SET ${assignments} WHERE id = $${params.length}`, params);
    return;
  }

  const insertEntries = [...filtered];
  if (columns.has('created_at') && !insertEntries.some(([column]) => column === 'created_at')) {
    insertEntries.push(['created_at', new Date()]);
  }
  if (columns.has('updated_at') && !insertEntries.some(([column]) => column === 'updated_at')) {
    insertEntries.push(['updated_at', new Date()]);
  }

  const insertColumns = insertEntries.map(([column]) => column);
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
  const params = insertEntries.map(([, value]) => value);

  await query(`INSERT INTO ${table} (${insertColumns.join(', ')}) VALUES (${placeholders})`, params);
}

async function ensureSchemaCompatibility(): Promise<void> {
  if (!(await tableExists('schools'))) {
    throw new Error('Required base table "schools" not found. Run db/schema.sql first.');
  }

  if (!(await tableExists('users'))) {
    throw new Error('Required base table "users" not found. Run db/schema.sql first.');
  }

  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS slug VARCHAR(255)`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'standard'`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_id TEXT`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS description TEXT`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS website TEXT`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo TEXT`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS city VARCHAR(120)`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS state VARCHAR(120)`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS country VARCHAR(120)`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active'`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2) DEFAULT 0`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS student_limit INTEGER DEFAULT 100`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP`);
  await query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP`);

  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_slug_unique ON schools(slug)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status)`);

  const schoolIdType = await getIdType('schools');
  const userIdType = await getIdType('users');
  const classIdType = (await tableExists('classes')) ? await getIdType('classes') : 'TEXT';
  const topicIdType = (await tableExists('topics')) ? await getIdType('topics') : 'TEXT';
  const syllabusTopicIdType = (await tableExists('syllabus_topics')) ? await getIdType('syllabus_topics') : 'TEXT';

  if (await tableExists('learning_plans')) {
    const curriculumIdType = (await tableExists('curriculum')) ? await getIdType('curriculum') : 'TEXT';
    await query(`ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS curriculum_id ${curriculumIdType}`);
    await query(`CREATE INDEX IF NOT EXISTS idx_learning_plans_curriculum_id ON learning_plans(curriculum_id)`);
  }

  await query(`
    CREATE TABLE IF NOT EXISTS parent_student_links (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      parent_id ${userIdType} NOT NULL,
      student_id ${userIdType} NOT NULL,
      school_id ${schoolIdType} NOT NULL,
      relationship VARCHAR(50) DEFAULT 'parent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(parent_id, student_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON parent_student_links(parent_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON parent_student_links(student_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_parent_student_links_school ON parent_student_links(school_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS school_memberships (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      student_id ${userIdType} NOT NULL,
      school_id ${schoolIdType} NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      join_request_id TEXT,
      approved_by ${userIdType},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, school_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_school_memberships_school ON school_memberships(school_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_school_memberships_student ON school_memberships(student_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS fee_structures (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      school_id ${schoolIdType} NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      amount DECIMAL(10, 2) NOT NULL,
      frequency VARCHAR(50),
      applicable_grades JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by ${userIdType}
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON fee_structures(school_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS student_payments (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      school_id ${schoolIdType} NOT NULL,
      student_id ${userIdType} NOT NULL,
      fee_id TEXT,
      grade VARCHAR(50),
      amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      due_date TIMESTAMP,
      paid_date TIMESTAMP,
      payment_method VARCHAR(50),
      receipt_id VARCHAR(255),
      receipt_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_student_payments_school ON student_payments(school_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_student_payments_student ON student_payments(student_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      school_id ${schoolIdType} NOT NULL,
      invoice_number VARCHAR(255) UNIQUE,
      amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      due_date TIMESTAMP,
      paid_date TIMESTAMP,
      pdf_url TEXT,
      stripe_invoice_id VARCHAR(255),
      notes TEXT,
      created_by ${userIdType}
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_invoices_school ON invoices(school_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      school_id ${schoolIdType} NOT NULL,
      name VARCHAR(255) NOT NULL,
      key_hash VARCHAR(255) NOT NULL UNIQUE,
      masked_key VARCHAR(255),
      permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by ${userIdType},
      last_used_at TIMESTAMP,
      rotated_at TIMESTAMP,
      revoked_at TIMESTAMP,
      UNIQUE(school_id, name)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_api_keys_school ON api_keys(school_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS api_key_usage (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      api_key_id TEXT NOT NULL,
      endpoint VARCHAR(255),
      method VARCHAR(10),
      status_code INTEGER,
      response_time_ms INTEGER,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS student_self_assessments (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      student_id ${userIdType} NOT NULL,
      school_id ${schoolIdType} NOT NULL,
      grade_level VARCHAR(80),
      subject VARCHAR(255),
      confidence_score DECIMAL(5, 2),
      strengths TEXT[] DEFAULT '{}',
      weaknesses TEXT[] DEFAULT '{}',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, school_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS diagnostic_tests (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      school_id ${schoolIdType} NOT NULL,
      class_id ${classIdType},
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(255),
      grade_level VARCHAR(80),
      questions JSONB,
      created_by ${userIdType},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(school_id, title)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS diagnostic_questions (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      test_id TEXT NOT NULL,
      school_id ${schoolIdType} NOT NULL,
      order_index INTEGER NOT NULL,
      topic_id ${topicIdType},
      topic_title VARCHAR(255),
      question_text TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_option VARCHAR(255) NOT NULL,
      explanation TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(test_id, order_index)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS diagnostic_test_attempts (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      test_id TEXT NOT NULL,
      student_id ${userIdType} NOT NULL,
      school_id ${schoolIdType} NOT NULL,
      selected_answers JSONB NOT NULL,
      correctness JSONB,
      score DECIMAL(6, 2) NOT NULL,
      max_score DECIMAL(6, 2) NOT NULL,
      topic_performance JSONB,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(test_id, student_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS confidence_analyses (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      student_id ${userIdType} NOT NULL,
      school_id ${schoolIdType} NOT NULL,
      test_attempt_id TEXT NOT NULL,
      self_confidence_score DECIMAL(6, 2) NOT NULL,
      actual_performance_score DECIMAL(6, 2) NOT NULL,
      variance DECIMAL(6, 2) NOT NULL,
      summary JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(test_attempt_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS learning_sessions (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      school_id ${schoolIdType} NOT NULL,
      student_id ${userIdType} NOT NULL,
      teacher_id ${userIdType},
      class_id ${classIdType},
      lesson_id TEXT,
      title VARCHAR(255) NOT NULL,
      session_type VARCHAR(80) DEFAULT 'interactive_lesson',
      status VARCHAR(50) DEFAULT 'completed',
      session_data JSONB,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS learning_session_topics (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      learning_session_id TEXT NOT NULL,
      syllabus_topic_id ${syllabusTopicIdType},
      topic_id ${topicIdType},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await refreshColumns('schools');
  await refreshColumns('users');
  await refreshColumns('classes');
  await refreshColumns('student_profiles');
  await refreshColumns('learning_plans');
  await refreshColumns('curriculum');
  await refreshColumns('topics');
  await refreshColumns('grade_levels');
  await refreshColumns('subjects');
  await refreshColumns('syllabi');
  await refreshColumns('syllabus_units');
  await refreshColumns('syllabus_topics');
  await refreshColumns('topic_dependencies');
  await refreshColumns('lessons');
  await refreshColumns('quiz_attempts');
  await refreshColumns('topic_mastery');
  await refreshColumns('learning_dna');
  await refreshColumns('learning_patterns');
  await refreshColumns('mistake_patterns');
  await refreshColumns('learning_preferences');
  await refreshColumns('engagement_signals');
  await refreshColumns('user_sessions');
  await refreshColumns('parent_student_links');
  await refreshColumns('school_memberships');
  await refreshColumns('fee_structures');
  await refreshColumns('student_payments');
  await refreshColumns('invoices');
  await refreshColumns('api_keys');
  await refreshColumns('api_key_usage');
  await refreshColumns('student_self_assessments');
  await refreshColumns('diagnostic_tests');
  await refreshColumns('diagnostic_questions');
  await refreshColumns('diagnostic_test_attempts');
  await refreshColumns('confidence_analyses');
  await refreshColumns('learning_sessions');
  await refreshColumns('learning_session_topics');
}

async function upsertSchool(principalId: string): Promise<string> {
  const columns = await getColumns('schools');

  const existing = await query(
    `SELECT id
     FROM schools
     WHERE LOWER(name) = LOWER($1)
        OR (slug IS NOT NULL AND slug = $2)
     LIMIT 1`,
    [DEMO_SCHOOL_NAME, DEMO_SCHOOL_SLUG]
  );

  const schoolId = existing.rows[0]?.id || IDS.school;

  const payload: Record<string, unknown> = {
    id: schoolId,
    name: DEMO_SCHOOL_NAME,
    domain: DEMO_SCHOOL_DOMAIN,
    slug: DEMO_SCHOOL_SLUG,
    status: 'active',
    type: 'demo',
    principal_id: principalId,
    description: 'Demo tenant seeded for end-to-end LearnAI walkthroughs.',
    website: 'https://learnai.study',
    logo: '/logo-horizontal.png',
    branding: JSON.stringify({
      displayName: DEMO_SCHOOL_NAME,
      footerText: 'Designed and operated by LearnAI.study',
    }),
    subscription_tier: 'professional',
    subscription_status: 'active',
    monthly_price: 299,
    student_limit: 500,
    max_students: 500,
    max_teachers: 50,
    city: 'Boston',
    state: 'Massachusetts',
    country: 'United States',
    last_payment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    next_billing_date: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
  };

  if (columns.has('updated_at')) {
    payload.updated_at = new Date();
  }

  await upsertById('schools', schoolId, payload);
  return schoolId;
}

async function upsertUser(input: {
  id: string;
  schoolId?: string | null;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}): Promise<string> {
  const existing = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [input.email]);
  const userId = existing.rows[0]?.id || input.id;

  const payload: Record<string, unknown> = {
    id: userId,
    school_id: input.schoolId || null,
    email: input.email.toLowerCase(),
    password_hash: input.passwordHash,
    role: input.role,
    first_name: input.firstName,
    last_name: input.lastName,
    is_active: true,
    email_verified: true,
    updated_at: new Date(),
  };

  await upsertById('users', userId, payload);
  return userId;
}

async function upsertStudentProfile(
  studentId: string,
  schoolId: string,
  fallbackId: string = IDS.studentProfile
): Promise<string> {
  const existing = await query(
    `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
    [studentId]
  );
  const profileId = existing.rows[0]?.id || fallbackId;

  await upsertById('student_profiles', profileId, {
    id: profileId,
    user_id: studentId,
    school_id: schoolId,
    grade_level: 'Grade 10',
    interests: ['machine learning', 'technology', 'data science'],
    strengths: ['logic', 'patterns'],
    weak_areas: ['model evaluation', 'supervised vs unsupervised distinction'],
    learning_style: 'interactive',
    language_preference: 'en-US',
    onboarding_completed: true,
    diagnostic_score: 68,
    preferred_ai_teacher_persona: 'friendly_tutor',
    updated_at: new Date(),
  });

  return profileId;
}

async function upsertMembership(
  studentId: string,
  schoolId: string,
  principalId: string,
  fallbackId: string = IDS.membership
): Promise<void> {
  if (!(await tableExists('school_memberships'))) return;

  const existing = await query(
    `SELECT id FROM school_memberships WHERE student_id = $1 AND school_id = $2 LIMIT 1`,
    [studentId, schoolId]
  );

  const membershipId = existing.rows[0]?.id || fallbackId;

  await upsertById('school_memberships', membershipId, {
    id: membershipId,
    student_id: studentId,
    school_id: schoolId,
    status: 'approved',
    join_request_id: null,
    approved_by: principalId,
    updated_at: new Date(),
  });
}

async function upsertPendingMembership(studentId: string, schoolId: string): Promise<void> {
  if (!(await tableExists('school_memberships'))) return;

  const existing = await query(
    `SELECT id FROM school_memberships WHERE student_id = $1 AND school_id = $2 LIMIT 1`,
    [studentId, schoolId]
  );

  const membershipId = existing.rows[0]?.id || IDS.pendingMembership;

  await upsertById('school_memberships', membershipId, {
    id: membershipId,
    student_id: studentId,
    school_id: schoolId,
    status: 'pending',
    join_request_id: `JOIN-${schoolId.slice(0, 4).toUpperCase()}-${studentId.slice(0, 4).toUpperCase()}`,
    approved_by: null,
    updated_at: new Date(),
  });
}

async function upsertParentStudentLink(parentId: string, studentId: string, schoolId: string): Promise<void> {
  if (!(await tableExists('parent_student_links'))) {
    return;
  }

  const existing = await query(
    `SELECT id
     FROM parent_student_links
     WHERE parent_id = $1 AND student_id = $2
     LIMIT 1`,
    [parentId, studentId]
  );

  const linkId = existing.rows[0]?.id || demoId(27);
  await upsertById('parent_student_links', linkId, {
    id: linkId,
    parent_id: parentId,
    student_id: studentId,
    school_id: schoolId,
    relationship: 'parent',
    created_at: new Date(),
  });
}

async function upsertClass(teacherId: string, principalId: string, schoolId: string): Promise<string> {
  const existing = await query(
    `SELECT id FROM classes WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, 'ML Foundations']
  );

  const classId = existing.rows[0]?.id || IDS.class;

  await upsertById('classes', classId, {
    id: classId,
    school_id: schoolId,
    name: 'ML Foundations',
    grade_level: 'Grade 10',
    teacher_id: teacherId,
    supervisor_id: principalId,
    description: 'Machine Learning core class for Grade 10 demo students.',
    max_students: 30,
    updated_at: new Date(),
  });

  return classId;
}

async function upsertClassEnrollment(
  classId: string,
  studentId: string,
  fallbackId: string = IDS.enrollment
): Promise<void> {
  if (!(await tableExists('class_enrollments'))) return;

  const existing = await query(
    `SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2 LIMIT 1`,
    [classId, studentId]
  );

  const enrollmentId = existing.rows[0]?.id || fallbackId;

  await upsertById('class_enrollments', enrollmentId, {
    id: enrollmentId,
    class_id: classId,
    student_id: studentId,
  });
}

async function upsertSecondaryClass(teacherId: string, principalId: string, schoolId: string): Promise<string> {
  const existing = await query(
    `SELECT id FROM classes WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, 'AI Applications Lab']
  );

  const classId = existing.rows[0]?.id || IDS.class2;

  await upsertById('classes', classId, {
    id: classId,
    school_id: schoolId,
    name: 'AI Applications Lab',
    grade_level: 'Grade 10',
    teacher_id: teacherId,
    supervisor_id: principalId,
    description: 'Applied AI use-cases and project lab for demo walkthroughs.',
    max_students: 35,
    updated_at: new Date(),
  });

  return classId;
}

async function upsertAdditionalSchoolRoleUsers(
  passwordHash: string,
  schoolId: string
): Promise<{ teacher2Id: string; studentIds: string[]; applicantId: string }> {
  await upsertUser({
    id: IDS.schoolAdmin,
    schoolId,
    email: DEMO_EMAILS.schoolAdmin,
    role: 'school_admin',
    firstName: DEMO_NAMES.schoolAdmin.first,
    lastName: DEMO_NAMES.schoolAdmin.last,
    passwordHash,
  });

  const teacher2Id = await upsertUser({
    id: IDS.teacher2,
    schoolId,
    email: DEMO_EMAILS.teacher2,
    role: 'teacher',
    firstName: DEMO_NAMES.teacher2.first,
    lastName: DEMO_NAMES.teacher2.last,
    passwordHash,
  });

  const student2Id = await upsertUser({
    id: IDS.student2,
    schoolId,
    email: DEMO_EMAILS.student2,
    role: 'student',
    firstName: DEMO_NAMES.student2.first,
    lastName: DEMO_NAMES.student2.last,
    passwordHash,
  });

  const student3Id = await upsertUser({
    id: IDS.student3,
    schoolId,
    email: DEMO_EMAILS.student3,
    role: 'student',
    firstName: DEMO_NAMES.student3.first,
    lastName: DEMO_NAMES.student3.last,
    passwordHash,
  });

  await upsertUser({
    id: IDS.accountant,
    schoolId,
    email: DEMO_EMAILS.accountant,
    role: 'accountant',
    firstName: DEMO_NAMES.accountant.first,
    lastName: DEMO_NAMES.accountant.last,
    passwordHash,
  });

  await upsertUser({
    id: IDS.supervisor,
    schoolId,
    email: DEMO_EMAILS.supervisor,
    role: 'supervisor',
    firstName: DEMO_NAMES.supervisor.first,
    lastName: DEMO_NAMES.supervisor.last,
    passwordHash,
  });

  const applicantId = await upsertUser({
    id: IDS.applicant,
    schoolId: null,
    email: DEMO_EMAILS.applicant,
    role: 'student',
    firstName: DEMO_NAMES.applicant.first,
    lastName: DEMO_NAMES.applicant.last,
    passwordHash,
  });

  return {
    teacher2Id,
    studentIds: [student2Id, student3Id],
    applicantId,
  };
}

async function upsertAdminPanelSchoolFixtures(passwordHash: string): Promise<void> {
  const now = new Date();
  const schoolCreatedAt = [
    new Date(now.getFullYear(), now.getMonth() - 4, 10),
    new Date(now.getFullYear(), now.getMonth() - 2, 12),
  ];

  await upsertById('schools', IDS.school2, {
    id: IDS.school2,
    name: 'LearnAI Central Elementary',
    domain: 'central.demo.learnai.study',
    slug: 'learnai-central-elementary',
    status: 'active',
    type: 'demo',
    principal_id: null,
    description: 'Additional demo tenant for SaaS admin analytics checks.',
    subscription_tier: 'basic',
    subscription_status: 'active',
    monthly_price: 149,
    student_limit: 300,
    max_students: 300,
    max_teachers: 30,
    city: 'Chicago',
    state: 'Illinois',
    country: 'United States',
    created_at: schoolCreatedAt[0],
    updated_at: now,
  });

  await upsertById('schools', IDS.school3, {
    id: IDS.school3,
    name: 'LearnAI Riverside Middle',
    domain: 'riverside.demo.learnai.study',
    slug: 'learnai-riverside-middle',
    status: 'active',
    type: 'demo',
    principal_id: null,
    description: 'Additional demo tenant for SaaS admin analytics checks.',
    subscription_tier: 'enterprise',
    subscription_status: 'active',
    monthly_price: 499,
    student_limit: 1200,
    max_students: 1200,
    max_teachers: 120,
    city: 'Seattle',
    state: 'Washington',
    country: 'United States',
    created_at: schoolCreatedAt[1],
    updated_at: now,
  });

  const principal2Id = await upsertUser({
    id: IDS.principal2,
    schoolId: IDS.school2,
    email: DEMO_EMAILS.principal2,
    role: 'principal',
    firstName: DEMO_NAMES.principal2.first,
    lastName: DEMO_NAMES.principal2.last,
    passwordHash,
  });

  const principal3Id = await upsertUser({
    id: IDS.principal3,
    schoolId: IDS.school3,
    email: DEMO_EMAILS.principal3,
    role: 'principal',
    firstName: DEMO_NAMES.principal3.first,
    lastName: DEMO_NAMES.principal3.last,
    passwordHash,
  });

  await upsertById('schools', IDS.school2, {
    id: IDS.school2,
    principal_id: principal2Id,
    updated_at: now,
  });

  await upsertById('schools', IDS.school3, {
    id: IDS.school3,
    principal_id: principal3Id,
    updated_at: now,
  });

  await upsertById('invoices', IDS.invoice2, {
    id: IDS.invoice2,
    school_id: IDS.school2,
    invoice_number: 'INV-DEMO-CENTRAL-001',
    amount: 149,
    status: 'paid',
    created_at: new Date(now.getFullYear(), now.getMonth() - 2, 15),
    due_date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
    paid_date: new Date(now.getFullYear(), now.getMonth() - 2, 20),
    notes: 'Central Elementary demo billing seed.',
    created_by: principal2Id,
  });

  await upsertById('invoices', IDS.invoice3, {
    id: IDS.invoice3,
    school_id: IDS.school3,
    invoice_number: 'INV-DEMO-RIVERSIDE-001',
    amount: 499,
    status: 'pending',
    created_at: new Date(now.getFullYear(), now.getMonth() - 1, 11),
    due_date: new Date(now.getFullYear(), now.getMonth(), 11),
    paid_date: null,
    notes: 'Riverside Middle demo billing seed.',
    created_by: principal3Id,
  });
}

async function upsertCurriculumAndTopics(
  schoolId: string,
  teacherId: string
): Promise<{ curriculumId: string; topicIdsByKey: Record<string, string> }> {
  const existingCurriculum = await query(
    `SELECT id FROM curriculum WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, DEMO_LEARNING_TRACK]
  );

  const curriculumId = existingCurriculum.rows[0]?.id || IDS.curriculum;

  await upsertById('curriculum', curriculumId, {
    id: curriculumId,
    school_id: schoolId,
    name: DEMO_LEARNING_TRACK,
    description: 'Structured ML foundations track for demo workflows.',
    grade_level: 'Grade 10',
    subject: 'machine_learning',
    created_by_teacher_id: teacherId,
    is_core: true,
    updated_at: new Date(),
  });

  const topicIdsByKey: Record<string, string> = {};

  for (let i = 0; i < TOPICS.length; i += 1) {
    const topic = TOPICS[i];
    const existingTopic = await query(
      `SELECT id FROM topics WHERE curriculum_id = $1 AND title = $2 LIMIT 1`,
      [curriculumId, topic.title]
    );

    const topicId = existingTopic.rows[0]?.id || demoId(500 + i + 1);
    topicIdsByKey[topic.key] = topicId;

    const prerequisites = topic.dependencies
      .map((dependencyKey) => topicIdsByKey[dependencyKey])
      .filter(Boolean);

    await upsertById('topics', topicId, {
      id: topicId,
      curriculum_id: curriculumId,
      school_id: schoolId,
      title: topic.title,
      description: `${topic.objective} Difficulty: ${topic.difficulty}.`,
      learning_objectives: [topic.objective],
      grade_level: 'Grade 10',
      order_index: i + 1,
      estimated_duration_minutes: 40,
      prerequisites,
      updated_at: new Date(),
    });
  }

  return { curriculumId, topicIdsByKey };
}

async function upsertSyllabus(
  schoolId: string,
  teacherId: string,
  topicIdsByKey: Record<string, string>
): Promise<{ syllabusId: string }> {
  const gradeExisting = await query(
    `SELECT id FROM grade_levels WHERE school_id = $1 AND (name = $2 OR level = $3) LIMIT 1`,
    [schoolId, 'Grade 10', 10]
  );
  const gradeId = gradeExisting.rows[0]?.id || IDS.gradeLevel;

  await upsertById('grade_levels', gradeId, {
    id: gradeId,
    school_id: schoolId,
    name: 'Grade 10',
    level: 10,
    updated_at: new Date(),
  });

  const subjectExisting = await query(
    `SELECT id FROM subjects WHERE school_id = $1 AND (name = $2 OR code = $3) LIMIT 1`,
    [schoolId, 'Machine Learning Foundations', 'MLF10']
  );
  const subjectId = subjectExisting.rows[0]?.id || IDS.subject;

  await upsertById('subjects', subjectId, {
    id: subjectId,
    school_id: schoolId,
    name: 'Machine Learning Foundations',
    code: 'MLF10',
    updated_at: new Date(),
  });

  const syllabusExisting = await query(
    `SELECT id FROM syllabi WHERE school_id = $1 AND grade_id = $2 AND subject_id = $3 ORDER BY version DESC LIMIT 1`,
    [schoolId, gradeId, subjectId]
  );
  const syllabusId = syllabusExisting.rows[0]?.id || IDS.syllabus;

  await upsertById('syllabi', syllabusId, {
    id: syllabusId,
    school_id: schoolId,
    grade_id: gradeId,
    subject_id: subjectId,
    teacher_id: teacherId,
    title: 'ML Foundations - Grade 10',
    status: 'published',
    version: 1,
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updated_at: new Date(),
  });

  await upsertById('syllabus_units', IDS.syllabusUnit, {
    id: IDS.syllabusUnit,
    syllabus_id: syllabusId,
    title: 'ML Foundations Core Unit',
    description: 'Core introductory machine learning topics for Grade 10 learners.',
    order_index: 1,
    updated_at: new Date(),
  });

  const keyByTitle = new Map<string, string>(TOPICS.map((t) => [t.title, t.key]));

  for (let i = 0; i < TOPICS.length; i += 1) {
    const topic = TOPICS[i];
    const topicId = SYLLABUS_TOPIC_IDS[i];

    await upsertById('syllabus_topics', topicId, {
      id: topicId,
      syllabus_id: syllabusId,
      syllabus_unit_id: IDS.syllabusUnit,
      school_id: schoolId,
      title: topic.title,
      description: `${topic.objective} (Difficulty: ${topic.difficulty})`,
      order_index: i + 1,
      source_grade_id: gradeId,
      updated_at: new Date(),
    });

    await query(`DELETE FROM topic_dependencies WHERE topic_id = $1`, [topicId]);

    for (const depKey of topic.dependencies) {
      const depIndex = TOPICS.findIndex((entry) => entry.key === depKey);
      if (depIndex === -1) continue;

      const dependsOnTopicId = SYLLABUS_TOPIC_IDS[depIndex];
      await query(
        `INSERT INTO topic_dependencies (id, topic_id, depends_on_topic_id, depends_on_topic_name, depends_on_grade_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [demoId(600 + i * 10 + depIndex + 1), topicId, dependsOnTopicId, TOPICS[depIndex].title, gradeId]
      );
    }

    const key = keyByTitle.get(topic.title);
    if (key) {
      const curriculumTopicId = topicIdsByKey[key];
      if (curriculumTopicId) {
        await query(
          `UPDATE syllabus_topics
           SET description = $1
           WHERE id = $2`,
          [`${topic.objective} (Difficulty: ${topic.difficulty}, curriculum_topic_id: ${curriculumTopicId})`, topicId]
        );
      }
    }
  }

  return { syllabusId };
}

async function upsertLearningPlan(
  studentId: string,
  schoolId: string,
  curriculumId: string,
  topicIdsByKey: Record<string, string>,
  fallbackId: string = IDS.learningPlan
): Promise<string> {
  const existing = await query(
    `SELECT id FROM learning_plans WHERE student_id = $1 LIMIT 1`,
    [studentId]
  );

  const planId = existing.rows[0]?.id || fallbackId;

  await upsertById('learning_plans', planId, {
    id: planId,
    student_id: studentId,
    school_id: schoolId,
    curriculum_id: curriculumId,
    current_topic_id: topicIdsByKey['supervised'],
    completed_topic_ids: [topicIdsByKey['intro-ai'], topicIdsByKey['what-is-ml']],
    in_progress_topic_ids: [topicIdsByKey['types-ml'], topicIdsByKey['supervised']],
    recommended_next_topic_ids: [topicIdsByKey['unsupervised'], topicIdsByKey['train-vs-test']],
    adaptive_difficulty: 1.05,
    updated_at: new Date(),
  });

  return planId;
}

function buildDiagnosticQuestions(topicIdsByKey: Record<string, string>) {
  return [
    {
      id: DIAGNOSTIC_QUESTION_IDS[0],
      order: 1,
      topicKey: 'intro-ai',
      topicTitle: 'Introduction to AI',
      question: 'Which statement best describes Artificial Intelligence?',
      options: ['Computers following fixed steps only', 'Machines performing tasks that normally require human intelligence', 'Only robots with arms', 'Storing large files quickly'],
      correct: 'Machines performing tasks that normally require human intelligence',
      explanation: 'AI focuses on systems that reason, perceive, and make decisions.',
      selected: 'Machines performing tasks that normally require human intelligence',
      isCorrect: true,
    },
    {
      id: DIAGNOSTIC_QUESTION_IDS[1],
      order: 2,
      topicKey: 'what-is-ml',
      topicTitle: 'What is Machine Learning',
      question: 'Machine Learning is primarily about:',
      options: ['Hard-coding every rule manually', 'Learning patterns from data to make predictions', 'Replacing all teachers', 'Writing longer code'],
      correct: 'Learning patterns from data to make predictions',
      explanation: 'ML learns relationships from data instead of fixed rule sets.',
      selected: 'Learning patterns from data to make predictions',
      isCorrect: true,
    },
    {
      id: DIAGNOSTIC_QUESTION_IDS[2],
      order: 3,
      topicKey: 'types-ml',
      topicTitle: 'Types of Machine Learning',
      question: 'Which option is NOT a standard ML paradigm?',
      options: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Decorative learning'],
      correct: 'Decorative learning',
      explanation: 'Decorative learning is not an ML paradigm.',
      selected: 'Decorative learning',
      isCorrect: true,
    },
    {
      id: DIAGNOSTIC_QUESTION_IDS[3],
      order: 4,
      topicKey: 'supervised',
      topicTitle: 'Supervised Learning',
      question: 'Supervised learning typically uses:',
      options: ['Only unlabeled images', 'Labeled input-output examples', 'No data', 'Random guesses'],
      correct: 'Labeled input-output examples',
      explanation: 'Supervised models train on known answers.',
      selected: 'Only unlabeled images',
      isCorrect: false,
    },
    {
      id: DIAGNOSTIC_QUESTION_IDS[4],
      order: 5,
      topicKey: 'unsupervised',
      topicTitle: 'Unsupervised Learning',
      question: 'A clustering task is most associated with:',
      options: ['Supervised learning', 'Unsupervised learning', 'Manual grading', 'Database indexing'],
      correct: 'Unsupervised learning',
      explanation: 'Clustering groups similar data without labels.',
      selected: 'Supervised learning',
      isCorrect: false,
    },
    {
      id: DIAGNOSTIC_QUESTION_IDS[5],
      order: 6,
      topicKey: 'model-eval',
      topicTitle: 'Basic Model Evaluation',
      question: 'Why do we use testing data?',
      options: ['To train the model again', 'To estimate how well the model generalizes to unseen data', 'To remove all labels', 'To increase file size'],
      correct: 'To estimate how well the model generalizes to unseen data',
      explanation: 'Testing data measures real-world performance after training.',
      selected: 'To estimate how well the model generalizes to unseen data',
      isCorrect: true,
    },
  ].map((q) => ({ ...q, topicId: topicIdsByKey[q.topicKey] }));
}

async function upsertAssessmentArtifacts(
  schoolId: string,
  classId: string,
  teacherId: string,
  studentId: string,
  topicIdsByKey: Record<string, string>
): Promise<void> {
  const questions = buildDiagnosticQuestions(topicIdsByKey);

  await upsertById('student_self_assessments', IDS.selfAssessment, {
    id: IDS.selfAssessment,
    student_id: studentId,
    school_id: schoolId,
    grade_level: 'Grade 10',
    subject: DEMO_LEARNING_TRACK,
    confidence_score: 6,
    strengths: ['logic', 'patterns'],
    weaknesses: ['model evaluation', 'supervised vs unsupervised distinction'],
    notes: 'Learner is motivated and pattern-oriented but needs support with evaluation metrics.',
    updated_at: new Date(),
  });

  await upsertById('diagnostic_tests', IDS.diagnosticTest, {
    id: IDS.diagnosticTest,
    school_id: schoolId,
    class_id: classId,
    title: 'ML Foundations Diagnostic Test',
    subject: DEMO_LEARNING_TRACK,
    grade_level: 'Grade 10',
    questions: JSON.stringify(
      questions.map((q) => ({
        id: q.id,
        topic: q.topicTitle,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct,
        explanation: q.explanation,
      }))
    ),
    created_by: teacherId,
    updated_at: new Date(),
  });

  await query(`DELETE FROM diagnostic_questions WHERE test_id = $1`, [IDS.diagnosticTest]);

  for (const question of questions) {
    await upsertById('diagnostic_questions', question.id, {
      id: question.id,
      test_id: IDS.diagnosticTest,
      school_id: schoolId,
      order_index: question.order,
      topic_id: question.topicId,
      topic_title: question.topicTitle,
      question_text: question.question,
      options: JSON.stringify(question.options),
      correct_option: question.correct,
      explanation: question.explanation,
    });
  }

  const selectedAnswers = Object.fromEntries(
    questions.map((q) => [q.id, q.selected])
  );

  const correctness = Object.fromEntries(
    questions.map((q) => [q.id, q.isCorrect])
  );

  const topicPerformance: Record<string, { correct: number; total: number; score: number }> = {};
  for (const question of questions) {
    const entry = topicPerformance[question.topicTitle] || { correct: 0, total: 0, score: 0 };
    entry.total += 1;
    if (question.isCorrect) entry.correct += 1;
    entry.score = Math.round((entry.correct / entry.total) * 100);
    topicPerformance[question.topicTitle] = entry;
  }

  const totalCorrect = questions.filter((q) => q.isCorrect).length;
  const maxScore = 100;
  const score = Math.round((totalCorrect / questions.length) * maxScore);

  await upsertById('diagnostic_test_attempts', IDS.diagnosticAttempt, {
    id: IDS.diagnosticAttempt,
    test_id: IDS.diagnosticTest,
    student_id: studentId,
    school_id: schoolId,
    selected_answers: JSON.stringify(selectedAnswers),
    correctness: JSON.stringify(correctness),
    score,
    max_score: maxScore,
    topic_performance: JSON.stringify(topicPerformance),
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  await upsertById('confidence_analyses', IDS.confidenceAnalysis, {
    id: IDS.confidenceAnalysis,
    student_id: studentId,
    school_id: schoolId,
    test_attempt_id: IDS.diagnosticAttempt,
    self_confidence_score: 60,
    actual_performance_score: score,
    variance: score - 60,
    summary: JSON.stringify({
      insight: 'Confidence was slightly lower than actual performance; reinforce model-evaluation concepts.',
      recommendation: 'Practice distinction questions and metric interpretation exercises.',
    }),
  });
}

async function upsertLessonAndQuizData(
  schoolId: string,
  teacherId: string,
  studentId: string,
  topicIdsByKey: Record<string, string>
): Promise<void> {
  const topicCycle = [
    topicIdsByKey['intro-ai'],
    topicIdsByKey['what-is-ml'],
    topicIdsByKey['types-ml'],
    topicIdsByKey['supervised'],
    topicIdsByKey['unsupervised'],
    topicIdsByKey['model-eval'],
  ];

  await upsertById('lessons', IDS.lesson, {
    id: IDS.lesson,
    school_id: schoolId,
    topic_id: topicIdsByKey['what-is-ml'],
    created_by_teacher_id: teacherId,
    created_for_student_id: studentId,
    title: 'ML Foundations Interactive Session',
    description: 'Adaptive diagnostic + guided practice for ML foundations.',
    stage_data: JSON.stringify({
      mode: 'interactive_lesson',
      segments: ['diagnostic_recap', 'guided_explainer', 'topic_drill', 'reflection'],
      aiGuide: 'LearnAI Tutor',
    }),
    scenes_count: 4,
    language: 'en-US',
    difficulty_level: 1.05,
    ai_model_used: 'gpt-4o-mini',
    generation_time_seconds: 42,
    is_published: true,
    updated_at: new Date(),
  });

  const scores = [38, 55, 63, 71, 79, 86];

  for (let i = 0; i < QUIZ_ATTEMPT_IDS.length; i += 1) {
    const monthOffset = 5 - i;
    const completedAt = new Date();
    if (monthOffset === 0) {
      completedAt.setDate(completedAt.getDate() - 2);
    } else {
      completedAt.setDate(10);
      completedAt.setMonth(completedAt.getMonth() - monthOffset);
    }

    const startedAt = new Date(completedAt.getTime() - (10 + i) * 60 * 1000);

    const responses = [
      { question_id: `m${i + 1}-q1`, answer: 'A', is_correct: scores[i] >= 60 },
      { question_id: `m${i + 1}-q2`, answer: 'B', is_correct: true },
      { question_id: `m${i + 1}-q3`, answer: 'C', is_correct: scores[i] >= 70 },
    ];

    await upsertById('quiz_attempts', QUIZ_ATTEMPT_IDS[i], {
      id: QUIZ_ATTEMPT_IDS[i],
      student_id: studentId,
      lesson_id: IDS.lesson,
      topic_id: topicCycle[i % topicCycle.length],
      school_id: schoolId,
      score: scores[i],
      max_score: 100,
      time_taken_seconds: 600 + i * 30,
      started_at: startedAt,
      completed_at: completedAt,
      responses: JSON.stringify(responses),
      feedback: JSON.stringify({
        explanations: ['Review differences between supervised and unsupervised tasks.'],
        strengths: ['Pattern recognition', 'Core ML definitions'],
        improvementAreas: ['Model evaluation metrics', 'Dataset split reasoning'],
      }),
      created_at: completedAt,
      updated_at: completedAt,
    });
  }
}

async function upsertAdditionalStudentAttempts(
  schoolId: string,
  studentIds: string[],
  topicIdsByKey: Record<string, string>
): Promise<void> {
  if (studentIds.length === 0) return;

  const topicCycle = [
    topicIdsByKey['intro-ai'],
    topicIdsByKey['what-is-ml'],
    topicIdsByKey['types-ml'],
    topicIdsByKey['supervised'],
    topicIdsByKey['model-eval'],
  ].filter(Boolean);

  if (topicCycle.length === 0) return;

  const scoreProfiles = [
    [52, 64, 59, 68],
    [71, 77, 81, 74],
  ];

  for (let s = 0; s < studentIds.length; s += 1) {
    const studentId = studentIds[s];
    const scores = scoreProfiles[s] || [60, 66, 71, 69];

    for (let i = 0; i < scores.length; i += 1) {
      const attemptId = demoId(1600 + s * 20 + i + 1);
      const completedAt = new Date(Date.now() - (10 + s * 2 + i) * 24 * 60 * 60 * 1000);
      const startedAt = new Date(completedAt.getTime() - (8 + i) * 60 * 1000);

      await upsertById('quiz_attempts', attemptId, {
        id: attemptId,
        student_id: studentId,
        lesson_id: IDS.lesson,
        topic_id: topicCycle[i % topicCycle.length],
        school_id: schoolId,
        score: scores[i],
        max_score: 100,
        time_taken_seconds: 540 + i * 25,
        started_at: startedAt,
        completed_at: completedAt,
        responses: JSON.stringify([
          { question_id: `extra-${s + 1}-${i + 1}-q1`, answer: 'A', is_correct: scores[i] >= 60 },
          { question_id: `extra-${s + 1}-${i + 1}-q2`, answer: 'B', is_correct: true },
        ]),
        feedback: JSON.stringify({
          strengths: ['concept understanding'],
          improvementAreas: ['application speed'],
        }),
        created_at: completedAt,
        updated_at: completedAt,
      });
    }

    const masteryTargets = [
      { key: 'intro-ai', mastery: 72, confidence: 70 },
      { key: 'what-is-ml', mastery: 69, confidence: 67 },
      { key: 'types-ml', mastery: 62, confidence: 60 },
      { key: 'supervised', mastery: 57, confidence: 55 },
      { key: 'model-eval', mastery: 51, confidence: 50 },
    ];

    for (let i = 0; i < masteryTargets.length; i += 1) {
      const target = masteryTargets[i];
      const topicId = topicIdsByKey[target.key];
      if (!topicId) continue;

      await upsertById('topic_mastery', demoId(1700 + s * 20 + i + 1), {
        id: demoId(1700 + s * 20 + i + 1),
        student_id: studentId,
        topic_id: topicId,
        school_id: schoolId,
        mastery_score: target.mastery + s * 4,
        confidence_level: target.confidence + s * 3,
        attempts: 2 + i,
        correct_attempts: 1 + Math.floor((i + s) / 2),
        last_attempted_at: new Date(Date.now() - (4 + i) * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      });
    }
  }
}

async function upsertAdminTrendSeries(
  schoolId: string,
  teacherId: string,
  studentId: string,
  principalId: string,
  topicIdsByKey: Record<string, string>
): Promise<void> {
  const topicId = topicIdsByKey['what-is-ml'] || Object.values(topicIdsByKey)[0] || null;
  const now = new Date();

  for (let i = 0; i < 6; i += 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 12);
    const lessonId = demoId(1800 + i + 1);
    const invoiceId = demoId(1900 + i + 1);
    const amount = 180 + i * 35;
    const invoiceStatus = i % 3 === 0 ? 'paid' : i % 3 === 1 ? 'pending' : 'overdue';

    await upsertById('lessons', lessonId, {
      id: lessonId,
      school_id: schoolId,
      topic_id: topicId,
      created_by_teacher_id: teacherId,
      created_for_student_id: studentId,
      title: `Admin Trend Lesson ${i + 1}`,
      description: 'Synthetic lesson used for admin panel monthly usage trend.',
      stage_data: JSON.stringify({ mode: 'analytics_seed', monthIndex: i + 1 }),
      scenes_count: 3,
      language: 'en-US',
      difficulty_level: 1,
      ai_model_used: 'gpt-4o-mini',
      generation_time_seconds: 30,
      is_published: true,
      created_at: monthDate,
      updated_at: monthDate,
    });

    await upsertById('invoices', invoiceId, {
      id: invoiceId,
      school_id: schoolId,
      invoice_number: `INV-DEMO-ACADEMY-${String(i + 2).padStart(3, '0')}`,
      amount,
      status: invoiceStatus,
      created_at: monthDate,
      due_date: new Date(monthDate.getTime() + 15 * 24 * 60 * 60 * 1000),
      paid_date: invoiceStatus === 'paid' ? new Date(monthDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
      notes: 'Admin trend-series invoice seed.',
      created_by: principalId,
    });
  }
}

async function upsertMasteryAndDNA(
  schoolId: string,
  studentId: string,
  topicIdsByKey: Record<string, string>
): Promise<void> {
  const masteryRows = [
    { key: 'intro-ai', mastery: 88, confidence: 84, attempts: 4, correct: 4 },
    { key: 'what-is-ml', mastery: 82, confidence: 80, attempts: 4, correct: 3 },
    { key: 'types-ml', mastery: 76, confidence: 73, attempts: 3, correct: 2 },
    { key: 'supervised', mastery: 62, confidence: 59, attempts: 3, correct: 2 },
    { key: 'unsupervised', mastery: 57, confidence: 55, attempts: 3, correct: 1 },
    { key: 'train-vs-test', mastery: 64, confidence: 60, attempts: 2, correct: 1 },
    { key: 'model-eval', mastery: 48, confidence: 46, attempts: 3, correct: 1 },
    { key: 'real-world', mastery: 71, confidence: 68, attempts: 2, correct: 1 },
  ];

  for (let i = 0; i < masteryRows.length; i += 1) {
    const entry = masteryRows[i];
    const topicId = topicIdsByKey[entry.key];
    if (!topicId) continue;

    const existing = await query(
      `SELECT id FROM topic_mastery WHERE student_id = $1 AND topic_id = $2 LIMIT 1`,
      [studentId, topicId]
    );

    const masteryId = existing.rows[0]?.id || MASTERY_IDS[i];

    await upsertById('topic_mastery', masteryId, {
      id: masteryId,
      student_id: studentId,
      topic_id: topicId,
      school_id: schoolId,
      mastery_score: entry.mastery,
      confidence_level: entry.confidence,
      attempts: entry.attempts,
      correct_attempts: entry.correct,
      last_attempted_at: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
      mastered_at: entry.mastery >= 80 ? new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000) : null,
      updated_at: new Date(),
    });
  }

  if (await tableExists('learning_patterns')) {
    await query(`DELETE FROM learning_patterns WHERE student_id = $1`, [studentId]);

    await query(
      `INSERT INTO learning_patterns (id, student_id, school_id, source, pace_score, attention_score, retry_count, observed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [demoId(701), studentId, schoolId, 'diagnostic', 62, 68, 1, new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)]
    );

    await query(
      `INSERT INTO learning_patterns (id, student_id, school_id, source, pace_score, attention_score, retry_count, observed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [demoId(702), studentId, schoolId, 'quiz', 66, 70, 2, new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)]
    );

    await query(
      `INSERT INTO learning_patterns (id, student_id, school_id, source, pace_score, attention_score, retry_count, observed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [demoId(703), studentId, schoolId, 'session', 71, 74, 1, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)]
    );
  }

  if (await tableExists('mistake_patterns')) {
    await query(`DELETE FROM mistake_patterns WHERE student_id = $1`, [studentId]);

    await query(
      `INSERT INTO mistake_patterns
       (id, student_id, school_id, topic_id, source, wrong_count, conceptual_count, careless_count, mixed_count, observed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        demoId(711),
        studentId,
        schoolId,
        topicIdsByKey['model-eval'],
        'diagnostic',
        3,
        2,
        0,
        1,
        new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      ]
    );

    await query(
      `INSERT INTO mistake_patterns
       (id, student_id, school_id, topic_id, source, wrong_count, conceptual_count, careless_count, mixed_count, observed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        demoId(712),
        studentId,
        schoolId,
        topicIdsByKey['supervised'],
        'quiz',
        2,
        1,
        1,
        0,
        new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      ]
    );
  }

  if (await tableExists('learning_preferences')) {
    await query(`DELETE FROM learning_preferences WHERE student_id = $1`, [studentId]);

    await query(
      `INSERT INTO learning_preferences
       (id, student_id, school_id, preferred_style, confidence, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [demoId(721), studentId, schoolId, 'interactive', 72, 'profile', new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)]
    );

    await query(
      `INSERT INTO learning_preferences
       (id, student_id, school_id, preferred_style, confidence, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [demoId(722), studentId, schoolId, 'visual', 64, 'inferred', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)]
    );
  }

  if (await tableExists('learning_dna')) {
    const existing = await query(`SELECT id FROM learning_dna WHERE student_id = $1 LIMIT 1`, [studentId]);
    const dnaId = existing.rows[0]?.id || demoId(730);

    await upsertById('learning_dna', dnaId, {
      id: dnaId,
      student_id: studentId,
      school_id: schoolId,
      pace_type: 'medium',
      mistake_type: 'conceptual',
      preferred_style: 'interactive',
      attention_span_score: 72,
      recovery_rate: 66,
      last_updated: new Date(),
      updated_at: new Date(),
    });
  }
}

async function upsertSessionArtifacts(
  schoolId: string,
  classId: string,
  teacherId: string,
  studentId: string,
  topicIdsByKey: Record<string, string>
): Promise<void> {
  const now = new Date();

  await upsertById('learning_sessions', IDS.userSession, {
    id: IDS.userSession,
    school_id: schoolId,
    student_id: studentId,
    teacher_id: teacherId,
    class_id: classId,
    lesson_id: IDS.lesson,
    title: 'Guided ML Diagnostic Follow-up',
    session_type: 'interactive_lesson',
    status: 'completed',
    session_data: JSON.stringify({
      milestones: ['self-check', 'diagnostic-review', 'topic-remediation'],
      highlightedWeakTopics: ['Basic Model Evaluation', 'Supervised Learning'],
    }),
    started_at: new Date(now.getTime() - 35 * 60 * 1000),
    ended_at: new Date(now.getTime() - 5 * 60 * 1000),
    updated_at: now,
  });

  if (await tableExists('learning_session_topics')) {
    await query(`DELETE FROM learning_session_topics WHERE learning_session_id = $1`, [IDS.userSession]);

    const linkedTopics = ['supervised', 'unsupervised', 'model-eval'] as const;
    for (let i = 0; i < linkedTopics.length; i += 1) {
      const key = linkedTopics[i];
      await upsertById('learning_session_topics', demoId(820 + i), {
        id: demoId(820 + i),
        learning_session_id: IDS.userSession,
        syllabus_topic_id: SYLLABUS_TOPIC_IDS[TOPICS.findIndex((topic) => topic.key === key)],
        topic_id: topicIdsByKey[key],
      });
    }
  }

  if (await tableExists('engagement_signals')) {
    await query(`DELETE FROM engagement_signals WHERE student_id = $1 AND lesson_id = $2`, [studentId, IDS.lesson]);

    await upsertById('engagement_signals', demoId(840), {
      id: demoId(840),
      student_id: studentId,
      lesson_id: IDS.lesson,
      school_id: schoolId,
      signal_type: 'time_on_task',
      value: 28,
      metadata: JSON.stringify({ unit: 'minutes', activity: 'diagnostic_review' }),
      recorded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    await upsertById('engagement_signals', demoId(841), {
      id: demoId(841),
      student_id: studentId,
      lesson_id: IDS.lesson,
      school_id: schoolId,
      signal_type: 'pause_resume',
      value: 3,
      metadata: JSON.stringify({ reason: 'reviewed_explanations' }),
      recorded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    });
  }

  if (await tableExists('user_sessions')) {
    const tokenHash = createHash('sha256').update('demo-session-token').digest('hex');

    await upsertById('user_sessions', IDS.userSession, {
      id: IDS.userSession,
      user_id: studentId,
      school_id: schoolId,
      token_hash: tokenHash,
      ip_address: '127.0.0.1',
      user_agent: 'LearnAI Demo Seed Session',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
  }
}

async function upsertPaymentAndApiData(
  schoolId: string,
  principalId: string,
  studentId: string
): Promise<void> {
  await upsertById('fee_structures', IDS.feeStructure, {
    id: IDS.feeStructure,
    school_id: schoolId,
    name: 'ML Foundations Program Fee',
    description: 'One-time fee for the ML Foundations demo cohort.',
    amount: 149,
    frequency: 'annual',
    applicable_grades: JSON.stringify(['Grade 10']),
    created_by: principalId,
  });

  await upsertById('student_payments', IDS.studentPayment, {
    id: IDS.studentPayment,
    school_id: schoolId,
    student_id: studentId,
    fee_id: IDS.feeStructure,
    grade: 'Grade 10',
    amount: 149,
    status: 'paid',
    due_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    paid_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    payment_method: 'online',
    receipt_id: 'RCPT-DEMO-EMMA-001',
    receipt_url: '/files/receipts/demo-emma-001.pdf',
  });

  const existingInvoice = await query(`SELECT id FROM invoices WHERE invoice_number = $1 LIMIT 1`, [
    'INV-DEMO-ACADEMY-001',
  ]);
  const invoiceId = existingInvoice.rows[0]?.id || IDS.invoice;

  await upsertById('invoices', invoiceId, {
    id: invoiceId,
    school_id: schoolId,
    invoice_number: 'INV-DEMO-ACADEMY-001',
    amount: 299,
    status: 'paid',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    paid_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    notes: 'Demo SaaS subscription payment for LearnAI Demo Academy.',
    created_by: principalId,
  });

  const rawDemoApiKey = 'sk_demo_school_api_key_2026_03_23';
  const keyHash = createHash('sha256').update(rawDemoApiKey).digest('hex');
  const maskedKey = `${rawDemoApiKey.slice(0, 8)}...${rawDemoApiKey.slice(-4)}`;

  const existingApiKey = await query(
    `SELECT id FROM api_keys WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, 'Demo School API Key']
  );
  const apiKeyId = existingApiKey.rows[0]?.id || IDS.apiKey;

  await upsertById('api_keys', apiKeyId, {
    id: apiKeyId,
    school_id: schoolId,
    name: 'Demo School API Key',
    key_hash: keyHash,
    masked_key: maskedKey,
    permissions: JSON.stringify(['read:students', 'read:progress', 'read:lessons']),
    is_active: true,
    created_by: principalId,
    last_used_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    revoked_at: null,
  });

  if (await tableExists('api_key_usage')) {
    await upsertById('api_key_usage', demoId(910), {
      id: demoId(910),
      api_key_id: apiKeyId,
      endpoint: '/api/student/analytics',
      method: 'GET',
      status_code: 200,
      response_time_ms: 182,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
  }
}

async function seedAuditLogs(schoolId: string, principalId: string): Promise<void> {
  if (!(await tableExists('audit_logs'))) return;

  const columns = await getColumns('audit_logs');
  const auditActionIds: Record<string, string> = {
    demo_seed_school: demoId(981),
    demo_seed_learning: demoId(982),
    demo_seed_payment: demoId(983),
    demo_seed_api_key: demoId(984),
    demo_seed_completed: demoId(985),
  };

  await query(`DELETE FROM audit_logs WHERE school_id = $1 AND action IN ($2, $3, $4, $5, $6)`, [
    schoolId,
    'demo_seed_school',
    'demo_seed_learning',
    'demo_seed_payment',
    'demo_seed_api_key',
    'demo_seed_completed',
  ]).catch(() => undefined);

  const insertCommon = async (action: string, payload: Record<string, unknown>) => {
    const insertCols: string[] = [];
    const values: unknown[] = [];

    const push = (column: string, value: unknown) => {
      if (columns.has(column)) {
        insertCols.push(column);
        values.push(value);
      }
    };

    push('id', auditActionIds[action] || demoId(986));
    push('school_id', schoolId);
    push('user_id', principalId);
    push('action', action);
    push('resource_type', 'seed');
    push('resource_id', IDS.school);
    push('changes', JSON.stringify(payload));
    push('entity_type', 'seed');
    push('entity_id', IDS.school);
    push('details', JSON.stringify(payload));
    push('timestamp', new Date());

    if (insertCols.length === 0) return;

    const placeholders = insertCols.map((_, index) => `$${index + 1}`).join(', ');

    await query(
      `INSERT INTO audit_logs (${insertCols.join(', ')}) VALUES (${placeholders})`,
      values
    );
  };

  await insertCommon('demo_seed_school', {
    school: DEMO_SCHOOL_NAME,
    slug: DEMO_SCHOOL_SLUG,
    status: 'active',
    type: 'demo',
  });

  await insertCommon('demo_seed_learning', {
    className: 'ML Foundations',
    syllabusTopics: TOPICS.length,
    learningTrack: DEMO_LEARNING_TRACK,
  });

  await insertCommon('demo_seed_payment', {
    invoiceNumber: 'INV-DEMO-ACADEMY-001',
    studentPaymentReceipt: 'RCPT-DEMO-EMMA-001',
  });

  await insertCommon('demo_seed_api_key', {
    keyName: 'Demo School API Key',
    active: true,
  });

  await insertCommon('demo_seed_completed', {
    seededAt: new Date().toISOString(),
  });
}

async function seedDemoEnvironment(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const principalId = await upsertUser({
    id: IDS.principal,
    schoolId: null,
    email: DEMO_EMAILS.principal,
    role: 'principal',
    firstName: DEMO_NAMES.principal.first,
    lastName: DEMO_NAMES.principal.last,
    passwordHash,
  });

  const schoolId = await upsertSchool(principalId);

  await upsertById('schools', schoolId, {
    id: schoolId,
    principal_id: principalId,
    updated_at: new Date(),
  });

  await upsertById('users', principalId, {
    id: principalId,
    school_id: schoolId,
    updated_at: new Date(),
  });

  const teacherId = await upsertUser({
    id: IDS.teacher,
    schoolId,
    email: DEMO_EMAILS.teacher,
    role: 'teacher',
    firstName: DEMO_NAMES.teacher.first,
    lastName: DEMO_NAMES.teacher.last,
    passwordHash,
  });

  const studentId = await upsertUser({
    id: IDS.student,
    schoolId,
    email: DEMO_EMAILS.student,
    role: 'student',
    firstName: DEMO_NAMES.student.first,
    lastName: DEMO_NAMES.student.last,
    passwordHash,
  });

  const parentId = await upsertUser({
    id: IDS.parent,
    schoolId,
    email: DEMO_EMAILS.parent,
    role: 'parent',
    firstName: DEMO_NAMES.parent.first,
    lastName: DEMO_NAMES.parent.last,
    passwordHash,
  });

  await upsertUser({
    id: IDS.saasAdmin,
    schoolId: null,
    email: DEMO_EMAILS.saasAdmin,
    role: 'saas_admin',
    firstName: DEMO_NAMES.saasAdmin.first,
    lastName: DEMO_NAMES.saasAdmin.last,
    passwordHash,
  });

  const { teacher2Id, studentIds: additionalStudentIds, applicantId } =
    await upsertAdditionalSchoolRoleUsers(passwordHash, schoolId);

  await upsertStudentProfile(studentId, schoolId);
  await upsertStudentProfile(additionalStudentIds[0], schoolId, IDS.studentProfile2);
  await upsertStudentProfile(additionalStudentIds[1], schoolId, IDS.studentProfile3);

  await upsertMembership(studentId, schoolId, principalId);
  await upsertMembership(additionalStudentIds[0], schoolId, principalId, demoId(46));
  await upsertMembership(additionalStudentIds[1], schoolId, principalId, demoId(47));
  await upsertPendingMembership(applicantId, schoolId);

  await upsertParentStudentLink(parentId, studentId, schoolId);

  const classId = await upsertClass(teacherId, principalId, schoolId);
  const class2Id = await upsertSecondaryClass(teacher2Id, principalId, schoolId);

  await upsertClassEnrollment(classId, studentId);
  await upsertClassEnrollment(classId, additionalStudentIds[0], demoId(48));
  await upsertClassEnrollment(class2Id, additionalStudentIds[1], demoId(49));

  const { curriculumId, topicIdsByKey } = await upsertCurriculumAndTopics(schoolId, teacherId);
  await upsertSyllabus(schoolId, teacherId, topicIdsByKey);

  await upsertAssessmentArtifacts(schoolId, classId, teacherId, studentId, topicIdsByKey);
  await upsertLearningPlan(studentId, schoolId, curriculumId, topicIdsByKey);
  await upsertLearningPlan(additionalStudentIds[0], schoolId, curriculumId, topicIdsByKey, IDS.learningPlan2);
  await upsertLearningPlan(additionalStudentIds[1], schoolId, curriculumId, topicIdsByKey, IDS.learningPlan3);

  await upsertLessonAndQuizData(schoolId, teacherId, studentId, topicIdsByKey);
  await upsertAdditionalStudentAttempts(schoolId, additionalStudentIds, topicIdsByKey);

  await upsertMasteryAndDNA(schoolId, studentId, topicIdsByKey);
  await upsertSessionArtifacts(schoolId, classId, teacherId, studentId, topicIdsByKey);

  await upsertPaymentAndApiData(schoolId, principalId, studentId);
  await upsertAdminTrendSeries(schoolId, teacherId, studentId, principalId, topicIdsByKey);
  await upsertAdminPanelSchoolFixtures(passwordHash);

  await seedAuditLogs(schoolId, principalId);

  console.log('✓ Demo school seeded:', DEMO_SCHOOL_NAME);
  console.log('✓ Demo users seeded (principal, school_admin, teachers, students, parent, accountant, supervisor, saas_admin)');
  console.log('✓ Demo classes, syllabus, memberships, and topic dependencies seeded');
  console.log('✓ Demo assessments, attempts, confidence analysis, and multi-student learning plans seeded');
  console.log('✓ Demo lesson sessions, progress mastery, and analytics signals seeded');
  console.log('✓ Demo SaaS payment, student payment, invoices, and API key seeded');
  console.log('✓ Additional demo schools seeded for SaaS admin panel checks');
}

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  try {
    await ensureSchemaCompatibility();
    await seedDemoEnvironment();

    console.log('\n✅ Demo environment seeded successfully!\n');
    console.log(`School: ${DEMO_SCHOOL_NAME}`);
    console.log(`Slug: ${DEMO_SCHOOL_SLUG}`);
    console.log('Demo Credentials:');
    console.log(`  Principal: ${DEMO_EMAILS.principal} / ${DEMO_PASSWORD}`);
    console.log(`  School Admin: ${DEMO_EMAILS.schoolAdmin} / ${DEMO_PASSWORD}`);
    console.log(`  Teacher:   ${DEMO_EMAILS.teacher} / ${DEMO_PASSWORD}`);
    console.log(`  Teacher 2: ${DEMO_EMAILS.teacher2} / ${DEMO_PASSWORD}`);
    console.log(`  Student:   ${DEMO_EMAILS.student} / ${DEMO_PASSWORD}`);
    console.log(`  Student 2: ${DEMO_EMAILS.student2} / ${DEMO_PASSWORD}`);
    console.log(`  Student 3: ${DEMO_EMAILS.student3} / ${DEMO_PASSWORD}`);
    console.log(`  Pending Applicant: ${DEMO_EMAILS.applicant} / ${DEMO_PASSWORD}`);
    console.log(`  Parent:    ${DEMO_EMAILS.parent} / ${DEMO_PASSWORD}`);
    console.log(`  Accountant: ${DEMO_EMAILS.accountant} / ${DEMO_PASSWORD}`);
    console.log(`  Supervisor: ${DEMO_EMAILS.supervisor} / ${DEMO_PASSWORD}`);
    console.log(`  SaaS Admin: ${DEMO_EMAILS.saasAdmin} / ${DEMO_PASSWORD}`);
    console.log(`  Principal 2: ${DEMO_EMAILS.principal2} / ${DEMO_PASSWORD}`);
    console.log(`  Principal 3: ${DEMO_EMAILS.principal3} / ${DEMO_PASSWORD}`);
    console.log('  API Key Name: Demo School API Key (active)');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
