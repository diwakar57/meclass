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

const CORRECT_HASH = '$2b$10$ljnf6nGIiIaHflfGtIPKae48tx0kvBSN1byQa/UR.EGBzG7obtE/O';
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440000';

async function createAllDemoUsers() {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating comprehensive demo users for all roles...\n');

    // Get or create SAAS ADMIN user (not tied to a school)
    const saasAdminResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['saasadmin@learnai.study']
    );

    if (saasAdminResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          '550e8400-e29b-41d4-a716-446655440010',
          null, // No school for SAAS admin
          'saasadmin@learnai.study',
          CORRECT_HASH,
          'saas_admin',
          'Platform',
          'Administrator',
          true,
          true
        ]
      );
      console.log('✅ Created: SAAS Admin - saasadmin@learnai.study');
    } else {
      console.log('✅ Found: SAAS Admin - saasadmin@learnai.study');
    }

    // Get or create SCHOOL ADMIN (Principal)
    const principalResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['principal@demo.learnai.study']
    );

    if (principalResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          '550e8400-e29b-41d4-a716-446655440001',
          SCHOOL_ID,
          'principal@demo.learnai.study',
          CORRECT_HASH,
          'principal',
          'Sarah',
          'Johnson',
          true,
          true
        ]
      );
      console.log('✅ Created: Principal - principal@demo.learnai.study');
    } else {
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [CORRECT_HASH, 'principal@demo.learnai.study']
      );
      console.log('✅ Updated: Principal - principal@demo.learnai.study');
    }

    // Get or create TEACHER
    const teacherResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['teacher@demo.learnai.study']
    );

    if (teacherResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          '550e8400-e29b-41d4-a716-446655440002',
          SCHOOL_ID,
          'teacher@demo.learnai.study',
          CORRECT_HASH,
          'teacher',
          'Michael',
          'Carter',
          true,
          true
        ]
      );
      console.log('✅ Created: Teacher - teacher@demo.learnai.study');
    } else {
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [CORRECT_HASH, 'teacher@demo.learnai.study']
      );
      console.log('✅ Updated: Teacher - teacher@demo.learnai.study');
    }

    // Get or create STUDENT
    const studentResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['student@demo.learnai.study']
    );

    if (studentResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          '550e8400-e29b-41d4-a716-446655440003',
          SCHOOL_ID,
          'student@demo.learnai.study',
          CORRECT_HASH,
          'student',
          'Emma',
          'Davis',
          true,
          true
        ]
      );
      console.log('✅ Created: Student - student@demo.learnai.study');
    } else {
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [CORRECT_HASH, 'student@demo.learnai.study']
      );
      console.log('✅ Updated: Student - student@demo.learnai.study');
    }

    // Get or create PARENT
    const parentResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['parent@demo.learnai.study']
    );

    if (parentResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          '550e8400-e29b-41d4-a716-446655440004',
          SCHOOL_ID,
          'parent@demo.learnai.study',
          CORRECT_HASH,
          'parent',
          'John',
          'Davis',
          true,
          true
        ]
      );
      console.log('✅ Created: Parent - parent@demo.learnai.study');
    } else {
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [CORRECT_HASH, 'parent@demo.learnai.study']
      );
      console.log('✅ Updated: Parent - parent@demo.learnai.study');
    }

    // Get or create SUPERVISOR
    const supervisorResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['supervisor@demo.learnai.study']
    );

    if (supervisorResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          '550e8400-e29b-41d4-a716-446655440005',
          SCHOOL_ID,
          'supervisor@demo.learnai.study',
          CORRECT_HASH,
          'supervisor',
          'Jennifer',
          'Lee',
          true,
          true
        ]
      );
      console.log('✅ Created: Supervisor - supervisor@demo.learnai.study');
    } else {
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [CORRECT_HASH, 'supervisor@demo.learnai.study']
      );
      console.log('✅ Updated: Supervisor - supervisor@demo.learnai.study');
    }

    console.log('\n✨ All demo users ready!\n');
    console.log('📋 Available Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Role         | Email                            | Password');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SAAS Admin   | saasadmin@learnai.study          | Demo@12345');
    console.log('Principal    | principal@demo.learnai.study     | Demo@12345');
    console.log('Teacher      | teacher@demo.learnai.study       | Demo@12345');
    console.log('Student      | student@demo.learnai.study       | Demo@12345');
    console.log('Parent       | parent@demo.learnai.study        | Demo@12345');
    console.log('Supervisor   | supervisor@demo.learnai.study    | Demo@12345');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err) {
    console.error('❌ Error creating demo users:', err);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

createAllDemoUsers();
