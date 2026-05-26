#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local directly
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
let DATABASE_URL = '';

for (const line of envLines) {
  if (line.startsWith('DATABASE_URL')) {
    DATABASE_URL = line.split('=')[1].replace(/"/g, '');
    break;
  }
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('📡 Connecting to database...');

// Parse the DATABASE_URL manually
const dbUrl = new URL(DATABASE_URL);
const pool = new Pool({
  user: dbUrl.username,
  password: dbUrl.password,
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || '5432', 10),
  database: dbUrl.pathname.slice(1) || 'postgres',
  ssl: dbUrl.searchParams.get('sslmode') !== 'disable',
});

// Demo password: "Demo@12345"
// Using bcryptjs hash: $2a$10$8OZzwx92c.uZVsrA2BoMD.KhLGgj.XYMHO8TzCHi16.2YW0AGhnme
const DEMO_PASSWORD_HASH = '$2a$10$8OZzwx92c.uZVsrA2BoMD.KhLGgj.XYMHO8TzCHi16.2YW0AGhnme';
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440000';

async function insertDemoData() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inserting demo school and users...');

    // Insert demo school
    await client.query(
      `INSERT INTO schools (id, name, domain, subscription_tier)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [SCHOOL_ID, 'LearnAI Demo Academy', 'demo.learnai.study', 'premium']
    );
    console.log('✅ Demo school inserted');

    // Insert demo users
    const users = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'principal@demo.learnai.study',
        role: 'principal',
        first: 'Sarah',
        last: 'Johnson'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'teacher@demo.learnai.study',
        role: 'teacher',
        first: 'Michael',
        last: 'Carter'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'student@demo.learnai.study',
        role: 'student',
        first: 'Emma',
        last: 'Davis'
      }
    ];

    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO NOTHING`,
        [
          user.id,
          SCHOOL_ID,
          user.email,
          DEMO_PASSWORD_HASH,
          user.role,
          user.first,
          user.last,
          true,
          true
        ]
      );
      console.log(`✅ User created: ${user.email} (${user.role})`);
    }

    // Insert demo student profile
    await client.query(
      `INSERT INTO student_profiles (user_id, school_id, grade_level, learning_style, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO NOTHING`,
      ['550e8400-e29b-41d4-a716-446655440003', SCHOOL_ID, '10', 'visual', false]
    );
    console.log('✅ Student profile created');

    console.log('\n✨ Demo data insertion complete!');
    console.log('\nYou can now login with:');
    console.log('  Email: student@demo.learnai.study');
    console.log('  Password: Demo@12345');
  } catch (err) {
    console.error('❌ Error inserting demo data:', err);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

insertDemoData();
