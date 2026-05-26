// lib/db/index.ts - Database connection & utilities

import { Pool, QueryResult, QueryResultRow } from 'pg';
import { createLogger } from '@/lib/logger';
import { developmentQuery, developmentDB } from './development';

const log = createLogger('Database');

let pool: Pool | null = null;
let isDevelopmentMode = false;

export function initializeDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  
  // Development mode - use mock database
  if (!dbUrl || dbUrl === 'mock://development' || dbUrl.includes('localhost:5432')) {
    isDevelopmentMode = true;
    log.warn('⚠️ Development mode: Using mock database (no PostgreSQL connected)');
    log.info('Demo credentials available:');
    log.info('  admin@learnai.com / admin123');
    log.info('  principal@demo.learnai.study / principal123');
    log.info('  teacher@demo.learnai.study / teacher123');
    log.info('  student@demo.learnai.study / student123');
    return;
  }
  
  // Production mode - use PostgreSQL
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sslRequired = dbUrl.includes('sslmode=require');

  pool = new Pool({
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: sslRequired ? { rejectUnauthorized: true } : undefined,
  });

  pool.on('error', (err: Error) => {
    log.error('Unexpected error on idle client', err);
  });

  log.info('Database pool initialized');
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  // Initialize database if not already done
  if (!pool && !isDevelopmentMode) {
    initializeDatabase();
  }
  
  // Development mode - use mock database
  if (isDevelopmentMode) {
    const result = await developmentQuery<T>(text, params);
    return {
      rows: result.rows,
      rowCount: result.rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    } as QueryResult<T>;
  }
  
  // Production mode - use PostgreSQL pool
  if (!pool) {
    throw new Error('Database pool not initialized and not in development mode');
  }
  
  try {
    const result = await pool.query<T>(text, params);
    return result;
  } catch (error) {
    log.error('Database query error:', { text, params, error });
    throw error;
  }
}

export async function transaction<T>(
  callback: (client: any) => Promise<T>,
): Promise<T> {
  if (!pool) initializeDatabase();
  if (!pool) throw new Error('Database pool not initialized — transactions require PostgreSQL');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    log.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    log.info('Database pool closed');
  }
}

// Export a db object for convenience
export const db = {
  query,
  transaction,
  initialize: initializeDatabase,
  close: closeDatabase,
};

