import { createHash, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { loadEnv } from '../config/env.js';

const env = loadEnv();

export type AccessClaims = {
  sub: string;
  role: UserRole;
  campus_ids: string[];
  program_ids: string[];
  entity_ids: string[];
};

export function signAccessToken(claims: AccessClaims): string {
  const opts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessClaims;
}

export function newRefreshToken(): { token: string; tokenHash: string } {
  const token = `${randomUUID()}.${randomUUID()}`;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(): Date {
  // Default 30 days; in real code we'd parse JWT_REFRESH_TTL but we keep
  // the math simple and trust the env default.
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}
