#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL in .env.local or .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function scalar(queryText, params = []) {
  const result = await pool.query(queryText, params);
  if (!result.rows[0]) return 0;
  const firstValue = Object.values(result.rows[0])[0];
  return Number(firstValue || 0);
}

async function tableExists(tableName) {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );

  return Boolean(result.rows[0] && result.rows[0].exists);
}

async function run() {
  console.log('Verifying demo seed data...\n');

  const roleRows = await pool.query(
    `SELECT role, COUNT(1)::int AS count
     FROM users
     WHERE email LIKE '%@demo.learnai.study' OR email = 'saasadmin@learnai.study'
     GROUP BY role
     ORDER BY role`
  );

  const roleCounts = new Map(roleRows.rows.map((row) => [String(row.role), Number(row.count || 0)]));

  const hasClassEnrollments = await tableExists('class_enrollments');
  const hasQuizAttempts = await tableExists('quiz_attempts');
  const hasTopicMastery = await tableExists('topic_mastery');
  const hasInvoices = await tableExists('invoices');
  const hasLessons = await tableExists('lessons');
  const hasMemberships = await tableExists('school_memberships');

  const checks = [
    { label: 'SaaS Admin users', value: roleCounts.get('saas_admin') || 0, min: 1 },
    { label: 'Principal users', value: roleCounts.get('principal') || 0, min: 1 },
    { label: 'School Admin users', value: roleCounts.get('school_admin') || 0, min: 1 },
    { label: 'Teacher users', value: roleCounts.get('teacher') || 0, min: 2 },
    { label: 'Student users', value: roleCounts.get('student') || 0, min: 3 },
    {
      label: 'Demo schools',
      value: await scalar(
        `SELECT COUNT(1)::int
         FROM schools
         WHERE name IN ('LearnAI Demo Academy', 'LearnAI Central Elementary', 'LearnAI Riverside Middle')`
      ),
      min: 3,
    },
    {
      label: 'Demo classes',
      value: await scalar(
        `SELECT COUNT(1)::int
         FROM classes
         WHERE name IN ('ML Foundations', 'AI Applications Lab')`
      ),
      min: 2,
    },
    {
      label: 'Class enrollments',
      value: hasClassEnrollments ? await scalar('SELECT COUNT(1)::int FROM class_enrollments') : 0,
      min: 3,
      skipped: !hasClassEnrollments,
    },
    {
      label: 'Quiz attempts',
      value: hasQuizAttempts ? await scalar('SELECT COUNT(1)::int FROM quiz_attempts') : 0,
      min: 10,
      skipped: !hasQuizAttempts,
    },
    {
      label: 'Topic mastery rows',
      value: hasTopicMastery ? await scalar('SELECT COUNT(1)::int FROM topic_mastery') : 0,
      min: 10,
      skipped: !hasTopicMastery,
    },
    {
      label: 'Invoices',
      value: hasInvoices ? await scalar('SELECT COUNT(1)::int FROM invoices') : 0,
      min: 3,
      skipped: !hasInvoices,
    },
    {
      label: 'Lessons',
      value: hasLessons ? await scalar('SELECT COUNT(1)::int FROM lessons') : 0,
      min: 6,
      skipped: !hasLessons,
    },
    {
      label: 'Pending join requests',
      value: hasMemberships
        ? await scalar(
            `SELECT COUNT(1)::int
             FROM school_memberships
             WHERE LOWER(COALESCE(status::text, '')) = 'pending'`
          )
        : 0,
      min: 1,
      skipped: !hasMemberships,
    },
  ];

  let hasFailure = false;

  for (const check of checks) {
    if (check.skipped) {
      console.log(`SKIP ${check.label}: table not available in current schema`);
      continue;
    }

    const ok = check.value >= check.min;
    if (!ok) hasFailure = true;
    console.log(`${ok ? 'OK' : 'FAIL'}  ${check.label}: ${check.value} (expected >= ${check.min})`);
  }

  console.log('\nDemo role counts:', Object.fromEntries(roleCounts));

  if (hasFailure) {
    console.error('\nOne or more demo checks failed. Run: pnpm.cmd run seed:demo');
    process.exitCode = 1;
  } else {
    console.log('\nAll demo checks passed.');
  }
}

run()
  .catch((error) => {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
