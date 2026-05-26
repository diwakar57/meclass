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

async function updatePasswords() {
  const client = await pool.connect();
  try {
    console.log('🔄 Updating user passwords with correct hash...');

    const emails = [
      'student@demo.learnai.study',
      'teacher@demo.learnai.study',
      'principal@demo.learnai.study'
    ];

    for (const email of emails) {
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [CORRECT_HASH, email]
      );
      console.log(`✅ Updated password for: ${email}`);
    }

    console.log('\n✨ Password update complete!');
    console.log('\nYou can now login with:');
    console.log('  Email: student@demo.learnai.study');
    console.log('  Password: Demo@12345');
  } catch (err) {
    console.error('❌ Error updating passwords:', err);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

updatePasswords();
