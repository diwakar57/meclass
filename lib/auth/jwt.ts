// lib/auth/jwt.ts - JWT generation and verification

import { jwtVerify, SignJWT } from 'jose';
import { createLogger } from '@/lib/logger';
import type { DecodedToken } from '@/lib/types/auth';

const log = createLogger('JWT');

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production'
);

export async function generateToken(
  payload: Omit<DecodedToken, 'iat' | 'exp'>,
  expiresIn = '24h'
): Promise<string> {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresIn)
      .setIssuedAt()
      .sign(secret);
    return token;
  } catch (error) {
    log.error('Failed to generate token:', error);
    throw new Error('Token generation failed');
  }
}

export async function generateRefreshToken(userId: string, schoolId?: string): Promise<string> {
  try {
    const token = await new SignJWT({ userId, schoolId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(REFRESH_SECRET);
    return token;
  } catch (error) {
    log.error('Failed to generate refresh token:', error);
    throw new Error('Refresh token generation failed');
  }
}

export async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as unknown as DecodedToken;
  } catch (error) {
    log.debug('Token verification failed:', error);
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string; schoolId?: string } | null> {
  try {
    const verified = await jwtVerify(token, REFRESH_SECRET);
    return verified.payload as { userId: string; schoolId?: string };
  } catch (error) {
    log.debug('Refresh token verification failed:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
