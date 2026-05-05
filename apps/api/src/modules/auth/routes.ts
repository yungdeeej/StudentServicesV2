import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { hashRefreshToken, newRefreshToken, refreshExpiry, signAccessToken } from '../../core/auth/tokens.js';
import { verifyPassword } from '../../core/auth/password.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { validate } from '../../http/middleware/validate.js';

export const authRouter: Router = Router();

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', validate({ body: LoginBody }), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof LoginBody>;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.is_active || user.deleted_at) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    void audit({ action: 'auth.login_failed', resource_type: 'user', resource_id: user.id, outcome: 'denied' });
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  const access = signAccessToken({
    sub: user.id,
    role: user.role,
    campus_ids: user.campus_ids,
    program_ids: user.program_ids,
    entity_ids: user.entity_ids,
    student_id: user.student_id ?? null,
  });
  const { token: refresh, tokenHash } = newRefreshToken();
  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: refreshExpiry(),
      user_agent: req.header('user-agent') ?? undefined,
      ip_address: req.ip,
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
  void audit({ action: 'auth.login', resource_type: 'user', resource_id: user.id });
  res.json({
    access_token: access,
    refresh_token: refresh,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      student_id: user.student_id,
    },
  });
});

const RefreshBody = z.object({ refresh_token: z.string().min(1) });

authRouter.post('/refresh', validate({ body: RefreshBody }), async (req, res) => {
  const { refresh_token } = req.body as z.infer<typeof RefreshBody>;
  const tokenHash = hashRefreshToken(refresh_token);
  const row = await prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } });
  if (!row || row.revoked_at || row.expires_at < new Date()) {
    res.status(401).json({ error: 'invalid_refresh_token' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: row.user_id } });
  if (!user || !user.is_active) {
    res.status(401).json({ error: 'user_inactive' });
    return;
  }
  // Rotate
  const { token: newRefresh, tokenHash: newHash } = newRefreshToken();
  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: row.id }, data: { revoked_at: new Date() } }),
    prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: newHash,
        expires_at: refreshExpiry(),
        user_agent: req.header('user-agent') ?? undefined,
        ip_address: req.ip,
      },
    }),
  ]);
  const access = signAccessToken({
    sub: user.id,
    role: user.role,
    campus_ids: user.campus_ids,
    program_ids: user.program_ids,
    entity_ids: user.entity_ids,
    student_id: user.student_id ?? null,
  });
  res.json({ access_token: access, refresh_token: newRefresh });
});

authRouter.post('/logout', requireAuth, validate({ body: RefreshBody }), async (req, res) => {
  const { refresh_token } = req.body as z.infer<typeof RefreshBody>;
  await prisma.refreshToken.updateMany({
    where: { token_hash: hashRefreshToken(refresh_token) },
    data: { revoked_at: new Date() },
  });
  void audit({ action: 'auth.logout', resource_type: 'session' });
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const claims = (req as typeof req & { user: { sub: string } }).user;
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    campus_ids: user.campus_ids,
    program_ids: user.program_ids,
    entity_ids: user.entity_ids,
  });
});
