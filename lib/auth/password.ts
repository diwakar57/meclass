// lib/auth/password.ts - Password hashing utilities

import crypto from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('Password');

// Using Node's built-in crypto for hash generation (production should use bcrypt)
// For production, install: npm install bcryptjs
const SALT_ROUNDS = 10;

/**
 * Hash password with bcryptjs (or fallback)
 * Install production: npm install bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Try to use bcryptjs if available
    const bcryptjs = require('bcryptjs');
    return await bcryptjs.hash(password, SALT_ROUNDS);
  } catch {
    // Fallback to simpler hashing (NOT FOR PRODUCTION)
    log.warn('bcryptjs not installed, using fallback hash. Install bcryptjs for production!');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  }
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Try to use bcryptjs if available
    const bcryptjs = require('bcryptjs');
    return await bcryptjs.compare(password, hash);
  } catch {
    // Fallback hash comparison
    if (!hash.includes(':')) {
      log.warn('Invalid hash format for fallback comparison');
      return false;
    }
    const [salt, originalHash] = hash.split(':');
    const computedHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return computedHash === originalHash;
  }
}
