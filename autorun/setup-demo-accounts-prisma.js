#!/usr/bin/env node

/**
 * Setup Demo Accounts for LearnAI Testing
 * 
 * Creates 8 demo user accounts across all roles with the same demo password.
 * Uses Prisma Client for proper database operations with full type safety.
 * 
 * Usage: node setup-demo-accounts-prisma.js
 */

require('dotenv/config');
process.loadEnvFile = process.loadEnvFile || require('dotenv').config;

// Try to load from .env.local explicitly if not already loaded
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env.local' });
}

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Make sure .env.local is in the current directory with DATABASE_URL set');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Demo password for all accounts
const DEMO_PASSWORD = 'Demo@12345';

// Pre-hashed password (bcrypt cost factor 10)
// Hash of "Demo@12345"
const DEMO_PASSWORD_HASH = '$2b$10$ljnf6nGIiIaHflfGtIPKae48tx0kvBSN1byQa/UR.EGBzG7obtE/O';

// Default demo school ID (same as in original script)
const DEMO_SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440000';

// Demo account definitions
const DEMO_ACCOUNTS = [
  {
    email: 'saasadmin@learnai.study',
    firstName: 'SaaS',
    lastName: 'Admin',
    role: 'saas_admin',
    schoolId: null, // SaaS admin has no school
  },
  {
    email: 'principal@demo.learnai.study',
    firstName: 'Principal',
    lastName: 'Demo',
    role: 'principal',
    schoolId: DEMO_SCHOOL_ID,
  },
  {
    email: 'admin@demo.learnai.study',
    firstName: 'School',
    lastName: 'Admin',
    role: 'school_admin',
    schoolId: DEMO_SCHOOL_ID,
  },
  {
    email: 'teacher@demo.learnai.study',
    firstName: 'Teacher',
    lastName: 'Demo',
    role: 'teacher',
    schoolId: DEMO_SCHOOL_ID,
  },
  {
    email: 'student@demo.learnai.study',
    firstName: 'Student',
    lastName: 'Demo',
    role: 'student',
    schoolId: DEMO_SCHOOL_ID,
  },
  {
    email: 'parent@demo.learnai.study',
    firstName: 'Parent',
    lastName: 'Demo',
    role: 'parent',
    schoolId: DEMO_SCHOOL_ID,
  },
  {
    email: 'supervisor@demo.learnai.study',
    firstName: 'Supervisor',
    lastName: 'Demo',
    role: 'supervisor',
    schoolId: DEMO_SCHOOL_ID,
  },
  {
    email: 'accountant@demo.learnai.study',
    firstName: 'Accountant',
    lastName: 'Demo',
    role: 'accountant',
    schoolId: DEMO_SCHOOL_ID,
  },
];

async function createDemoAccounts() {
  try {
    console.log('🚀 Starting LearnAI Demo Account Setup');
    console.log('=====================================\n');

    // First, ensure demo school exists
    console.log('📚 Checking for demo school...');
    let demoSchool = await prisma.school.findUnique({
      where: { id: DEMO_SCHOOL_ID },
    });

    if (!demoSchool) {
      console.log('   Creating demo school...');
      demoSchool = await prisma.school.create({
        data: {
          id: DEMO_SCHOOL_ID,
          name: 'Demo School',
          description: 'Demo school for testing LearnAI features',
          slug: 'demo-school',
          website: 'https://demo.learnai.study',
          city: 'Springfield',
          state: 'IL',
          country: 'USA',
          status: 'active',
          type: 'standard',
          subscriptionTier: 'professional',
          subscriptionStatus: 'active',
        },
      });
      console.log('✅ Demo school created!\n');
    } else {
      console.log('✅ Demo school already exists!\n');
    }

    let createdCount = 0;
    let skippedCount = 0;
    const createdAccounts = [];

    // Create each demo account
    for (const account of DEMO_ACCOUNTS) {
      try {
        // Try to create the user
        const user = await prisma.user.create({
          data: {
            email: account.email,
            firstName: account.firstName,
            lastName: account.lastName,
            passwordHash: DEMO_PASSWORD_HASH,
            role: account.role,
            schoolId: account.schoolId,
            isActive: true,
            emailVerified: false,
          },
        });

        createdCount++;
        createdAccounts.push({
          email: account.email,
          firstName: account.firstName,
          lastName: account.lastName,
          role: account.role,
          password: DEMO_PASSWORD,
        });

        console.log(`✅ Created ${account.role}: ${account.email}`);
      } catch (error) {
        if (error.code === 'P2002') {
          // Unique constraint violation - account already exists
          console.log(`⏭️  Skipped ${account.role}: ${account.email} (already exists)`);
          skippedCount++;
        } else {
          console.error(`❌ Failed to create ${account.role}: ${account.email}`);
          console.error(`   Error: ${error.message}`);
        }
      }
    }

    console.log('\n=====================================');
    console.log(`✨ Setup Complete!`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${createdCount + skippedCount}`);
    console.log('=====================================\n');

    // Display created accounts
    if (createdAccounts.length > 0) {
      console.log('📋 Created Demo Account Credentials:\n');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ Role              │ Email                            │ Password  │');
      console.log('├─────────────────────────────────────────────────────────────┤');

      for (const account of createdAccounts) {
        const role = account.role.padEnd(17);
        const email = account.email.padEnd(33);
        const password = account.password;
        console.log(`│ ${role} │ ${email} │ ${password} │`);
      }

      console.log('└─────────────────────────────────────────────────────────────┘\n');
    }

    // Display login instructions
    console.log('🔐 Login Instructions:\n');
    console.log('1. Start the development server:');
    console.log('   npm run dev\n');
    console.log('2. Open your browser to:');
    console.log('   http://localhost:3000/login\n');
    console.log('3. Enter any email from the table above');
    console.log('4. Enter password: Demo@12345\n');

    // If no accounts were created, show next steps
    if (createdCount === 0 && skippedCount > 0) {
      console.log('ℹ️  All demo accounts already exist in the database!');
      console.log('    Use the credentials below to log in.\n');
    }

    // Display all available accounts (even if not newly created)
    console.log('📚 All Available Demo Accounts:\n');
    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ Role                │ Email                             │');
    console.log('├──────────────────────────────────────────────────────────────┤');

    for (const account of DEMO_ACCOUNTS) {
      const role = account.role.padEnd(20);
      const email = account.email;
      console.log(`│ ${role} │ ${email} │`);
    }

    console.log('└──────────────────────────────────────────────────────────────┘\n');
    console.log(`🔑 Password for all accounts: ${DEMO_PASSWORD}\n`);

  } catch (error) {
    console.error('❌ Fatal error during setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
createDemoAccounts().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
