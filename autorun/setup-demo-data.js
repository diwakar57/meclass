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

// Parse the DATABASE_URL
const dbUrl = new URL(DATABASE_URL);
const pool = new Pool({
  user: dbUrl.username,
  password: dbUrl.password,
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || '5432', 10),
  database: dbUrl.pathname.slice(1) || 'postgres',
  ssl: dbUrl.searchParams.get('sslmode') !== 'disable',
});

// Password hash for "Demo@12345"
const PASSWORD_HASH = '$2b$10$ljnf6nGIiIaHflfGtIPKae48tx0kvBSN1byQa/UR.EGBzG7obtE/O';
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440000';

const demoSchool = {
  id: SCHOOL_ID,
  name: 'Demo School',
  description: 'Demo school for testing all user roles',
  type: 'standard',
  subscription_tier: 'basic',
  subscription_status: 'active',
  max_students: 1000,
  max_teachers: 100,
};

const demoAccounts = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    email: 'saasadmin@learnai.study',
    firstName: 'Platform',
    lastName: 'Administrator',
    role: 'saas_admin',
    schoolId: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'principal@demo.learnai.study',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'principal',
    schoolId: SCHOOL_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'teacher@demo.learnai.study',
    firstName: 'Michael',
    lastName: 'Carter',
    role: 'teacher',
    schoolId: SCHOOL_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'student@demo.learnai.study',
    firstName: 'Emma',
    lastName: 'Davis',
    role: 'student',
    schoolId: SCHOOL_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'parent@demo.learnai.study',
    firstName: 'John',
    lastName: 'Davis',
    role: 'parent',
    schoolId: SCHOOL_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    email: 'supervisor@demo.learnai.study',
    firstName: 'Jennifer',
    lastName: 'Lee',
    role: 'supervisor',
    schoolId: SCHOOL_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    email: 'admin@demo.learnai.study',
    firstName: 'Alex',
    lastName: 'Smith',
    role: 'school_admin',
    schoolId: SCHOOL_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    email: 'accountant@demo.learnai.study',
    firstName: 'Robert',
    lastName: 'Wilson',
    role: 'accountant',
    schoolId: SCHOOL_ID,
  },
];

async function setupDemoData() {
  const client = await pool.connect();
  try {
    console.log('🔄 Setting up demo data...\n');

    // 1. Create demo school if it doesn't exist
    try {
      const existing = await client.query(
        'SELECT id FROM schools WHERE id = $1',
        [SCHOOL_ID]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO schools (id, name, description, type, subscription_tier, subscription_status, max_students, max_teachers, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            SCHOOL_ID,
            demoSchool.name,
            demoSchool.description,
            demoSchool.type,
            demoSchool.subscription_tier,
            demoSchool.subscription_status,
            demoSchool.max_students,
            demoSchool.max_teachers,
          ]
        );
        console.log('✅ Created: Demo School');
      } else {
        console.log('✅ Already exists: Demo School');
      }
    } catch (err) {
      console.error('⚠️  Error with demo school:', err.message);
    }

    // 2. Create all demo accounts
    console.log('\n📝 Setting up user accounts:\n');
    for (const account of demoAccounts) {
      try {
        // Check if user exists
        const existing = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [account.email]
        );

        if (existing.rows.length > 0) {
          // Update password
          await client.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
            [PASSWORD_HASH, account.email]
          );
          console.log(`✅ Updated: ${account.role.toUpperCase().padEnd(15)} - ${account.email}`);
        } else {
          // Create new user
          await client.query(
            `INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              account.id,
              account.schoolId,
              account.email,
              PASSWORD_HASH,
              account.role,
              account.firstName,
              account.lastName,
              true,
              true,
            ]
          );
          console.log(`✅ Created: ${account.role.toUpperCase().padEnd(15)} - ${account.email}`);
        }
      } catch (err) {
        console.error(`⚠️  Error setting up ${account.email}:`, err.message);
      }
    }

    console.log('\n✨ Demo data setup complete!\n');
    console.log('📋 LOGIN CREDENTIALS FOR ALL ROLES:');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('Role              | Email                            | Password');
    console.log('───────────────────────────────────────────────────────────────────────');
    console.log('SAAS Admin        | saasadmin@learnai.study          | Demo@12345');
    console.log('Principal         | principal@demo.learnai.study     | Demo@12345');
    console.log('School Admin      | admin@demo.learnai.study         | Demo@12345');
    console.log('Teacher           | teacher@demo.learnai.study       | Demo@12345');
    console.log('Student           | student@demo.learnai.study       | Demo@12345');
    console.log('Parent            | parent@demo.learnai.study        | Demo@12345');
    console.log('Supervisor        | supervisor@demo.learnai.study    | Demo@12345');
    console.log('Accountant        | accountant@demo.learnai.study    | Demo@12345');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('\n🌐 Access at: http://localhost:3000/login\n');
    console.log('📚 Dashboard URLs:\n');
    console.log('  Teacher:    http://localhost:3000/dashboard/teacher');
    console.log('  Principal:  http://localhost:3000/dashboard/principal');
    console.log('  Admin:      http://localhost:3000/dashboard/admin');
    console.log('  Accountant: http://localhost:3000/dashboard/accountant');
    console.log('  Supervisor: http://localhost:3000/dashboard/supervisor');
    console.log('  Parent:     http://localhost:3000/dashboard/parent');
    console.log('  Student:    http://localhost:3000/dashboard/student\n');

  } catch (err) {
    console.error('❌ Error setting up demo data:', err);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

setupDemoData();
