#!/usr/bin/env node

/**
 * Setup script for Vercel deployment
 * Runs migrations and initializes shared class tables
 */

import { query } from '../lib/db';
import { createLogger } from '../lib/logger';
import fs from 'fs';
import path from 'path';

const log = createLogger('SetupScript');

async function runMigrations() {
  try {
    log.info('Starting database migrations...');

    // Read migration file
    const migrationPath = path.join(__dirname, '../db/migrations/create-shared-classes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and filter empty statements
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      log.info(`Executing migration: ${statement.substring(0, 50)}...`);
      await query(statement);
    }

    log.info('✓ Database migrations completed successfully');
  } catch (error) {
    log.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

async function checkRedis() {
  try {
    if (process.env.REDIS_URL) {
      log.info('Redis URL configured');
      // Connection will be tested when cacheClient is first used
    } else {
      log.warn('⚠ Redis URL not configured - using in-memory cache');
    }
  } catch (error) {
    log.warn('⚠ Redis check skipped:', error);
  }
}

async function runSetup() {
  log.info('Starting Vercel deployment setup...');

  try {
    log.info('\n1. Checking environment...');
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    log.info('✓ DATABASE_URL is set');

    log.info('\n2. Checking Redis...');
    await checkRedis();

    log.info('\n3. Running database migrations...');
    await runMigrations();

    log.info('\n✓ Setup completed successfully!');
    log.info('\nYour application is ready for Vercel deployment.');
    log.info('Next steps:');
    log.info('1. Commit these changes: git add . && git commit -m "Add Vercel optimization"');
    log.info('2. Push to GitHub: git push origin main');
    log.info('3. Vercel will automatically deploy');

    process.exit(0);
  } catch (error) {
    log.error('✗ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
runSetup();
