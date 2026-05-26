import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

let _prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sslRequired = connectionString.includes('sslmode=require');

  const pool = new Pool({
    connectionString,
    ssl: sslRequired ? { rejectUnauthorized: true } : undefined,
  });

  const adapter = new PrismaPg(pool);
  _prisma = new PrismaClient({ adapter });
  return _prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaClient() as any)[prop];
  },
});

export const db = prisma;
