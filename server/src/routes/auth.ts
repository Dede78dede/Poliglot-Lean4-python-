/**
 * Authentication & RBAC Express Routes
 *
 * Public endpoints (mounted before authMiddleware, protected by authRateLimiter):
 * - GET /api/v1/auth/status
 * - POST /api/v1/auth/bootstrap
 * - POST /api/v1/auth/login
 *
 * Protected endpoints (mounted behind authMiddleware):
 * - GET /api/v1/auth/me
 * - POST /api/v1/auth/logout
 * - POST /api/v1/auth/switch-role
 * - GET /api/v1/auth/users (admin)
 * - POST /api/v1/auth/users (admin)
 * - PATCH /api/v1/auth/users/:id/role (admin)
 * - DELETE /api/v1/auth/users/:id (admin)
 * - GET /api/v1/auth/tokens
 * - POST /api/v1/auth/tokens
 * - POST /api/v1/auth/tokens/:id/rotate
 * - POST /api/v1/auth/tokens/:id/revoke
 */

import { timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { tokenVault } from '../../../src/services/auth/token-vault';
import {
  APP_ROLES,
  ROLE_PERMISSIONS,
  isValidAppRole,
  type AppRole,
  type PublicUserAccount,
} from '../../../src/services/auth/roles';
import { requireRole, type AuthenticatedRequest } from '../../../src/middleware/auth';
import { authRateLimiter } from '../../../src/middleware/rate-limit';
import { ERROR_REGISTRY, createProblemDetails } from '../../../src/services/errors/error-registry';
import { userStore } from '../services/auth/user-store';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const RoleSchema = z.enum(['admin', 'verifier', 'collaborator', 'viewer']);

const BootstrapSchema = z.object({
  username: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  displayName: z.string().trim().min(1).max(80).optional(),
  password: z.string().min(8).max(256),
}).strict();

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(64).optional(),
  password: z.string().min(1).max(256).optional(),
  passcode: z.string().min(1).max(256).optional(),
}).strict();

const SwitchRoleSchema = z.object({
  role: RoleSchema,
}).strict();

const CreateUserSchema = z.object({
  username: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  displayName: z.string().trim().min(1).max(80).optional(),
  password: z.string().min(8).max(256),
  role: RoleSchema,
}).strict();

const UpdateUserRoleSchema = z.object({
  role: RoleSchema,
}).strict();

const CreateTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: RoleSchema.optional(),
  expiresInHours: z.number().min(1).max(24 * 365).optional(),
}).strict();

function safeCompareSecret(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function getCorrelationId(req: Request): string {
  return (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
}

export function createPublicAuthRouter(): Router {
  const router = Router();

  // GET /api/v1/auth/status
  router.get('/status', (_req: Request, res: Response) => {
    res.status(200).json({
      requiresBootstrap: userStore.isBootstrapRequired(),
      envPasscodeConfigured: Boolean(process.env.POLYGLOT_ADMIN_PASSCODE?.trim()),
      userCount: userStore.countUsers(),
    });
  });

  // POST /api/v1/auth/bootstrap
  router.post('/bootstrap', authRateLimiter, (req: Request, res: Response): void => {
    const correlationId = getCorrelationId(req);
    const parsed = BootstrapSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId, {
          detail: 'Valid username (min 2 chars) and password (min 8 chars) are required.',
          errors: parsed.error.flatten(),
        })
      );
      return;
    }

    try {
      const user = userStore.bootstrapAdmin(parsed.data);
      const issued = tokenVault.createToken(`session:${user.username}`, undefined, {
        userId: user.id,
        role: user.role,
        baseRole: user.role,
        authType: 'session',
        expiresInMs: SESSION_TTL_MS,
      });

      res.status(201).json({
        authenticated: true,
        token: issued.rawToken,
        tokenId: issued.id,
        expiresAt: issued.expiresAt ?? null,
        user,
        activeRole: user.role,
        baseRole: user.role,
        permissions: ROLE_PERMISSIONS[user.role],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'BOOTSTRAP_ALREADY_COMPLETED') {
        res.status(409).json({
          type: 'https://polyglot.dev/errors/bootstrap-already-completed',
          title: 'BOOTSTRAP_ALREADY_COMPLETED',
          status: 409,
          detail: 'An administrator account already exists. Please sign in with credentials.',
          correlationId,
        });
        return;
      }
      res.status(400).json(createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId, { detail: msg }));
    }
  });

  // POST /api/v1/auth/login
  router.post('/login', authRateLimiter, (req: Request, res: Response): void => {
    const correlationId = getCorrelationId(req);
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId, {
          detail: 'Provide username and password (or configured admin passcode).',
          errors: parsed.error.flatten(),
        })
      );
      return;
    }

    const { username, password, passcode } = parsed.data;
    const configuredPasscode = process.env.POLYGLOT_ADMIN_PASSCODE?.trim();

    if (passcode && configuredPasscode && safeCompareSecret(passcode, configuredPasscode)) {
      const nowIso = new Date().toISOString();
      const envAdminUser: PublicUserAccount = {
        id: 'env-admin',
        username: 'env-admin',
        displayName: 'Environment Admin',
        role: APP_ROLES.ADMIN,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastLoginAt: nowIso,
      };
      const issued = tokenVault.createToken('session:env-admin', undefined, {
        userId: envAdminUser.id,
        role: APP_ROLES.ADMIN,
        baseRole: APP_ROLES.ADMIN,
        authType: 'session',
        expiresInMs: SESSION_TTL_MS,
      });

      res.status(200).json({
        authenticated: true,
        token: issued.rawToken,
        tokenId: issued.id,
        expiresAt: issued.expiresAt ?? null,
        user: envAdminUser,
        activeRole: APP_ROLES.ADMIN,
        baseRole: APP_ROLES.ADMIN,
        permissions: ROLE_PERMISSIONS.admin,
      });
      return;
    }

    if (!username || !password) {
      res.status(401).json(
        createProblemDetails(ERROR_REGISTRY.UNAUTHORIZED_ACCESS, correlationId, {
          detail: 'Invalid credentials.',
        })
      );
      return;
    }

    const user = userStore.authenticate(username, password);
    if (!user) {
      res.status(401).json(
        createProblemDetails(ERROR_REGISTRY.UNAUTHORIZED_ACCESS, correlationId, {
          detail: 'Invalid username or password.',
        })
      );
      return;
    }

    const issued = tokenVault.createToken(`session:${user.username}`, undefined, {
      userId: user.id,
      role: user.role,
      baseRole: user.role,
      authType: 'session',
      expiresInMs: SESSION_TTL_MS,
    });

    res.status(200).json({
      authenticated: true,
      token: issued.rawToken,
      tokenId: issued.id,
      expiresAt: issued.expiresAt ?? null,
      user,
      activeRole: user.role,
      baseRole: user.role,
      permissions: ROLE_PERMISSIONS[user.role],
    });
  });

  return router;
}

export function createProtectedAuthRouter(): Router {
  const router = Router();

  // GET /api/v1/auth/me
  router.get('/me', (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const activeRole = authReq.userRole ?? APP_ROLES.VIEWER;
    const baseRole = authReq.userBaseRole ?? activeRole;
    const storedUser = authReq.userId ? userStore.getUserById(authReq.userId) : null;

    const user: PublicUserAccount = storedUser ?? {
      id: authReq.userId ?? 'session-user',
      username: authReq.userId === 'env-admin' ? 'env-admin' : (authReq.userTokenId ?? 'token-session'),
      displayName: authReq.userId === 'env-admin' ? 'Environment Admin' : 'Authenticated Session',
      role: baseRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.status(200).json({
      authenticated: true,
      requiresBootstrap: userStore.isBootstrapRequired(),
      user,
      activeRole,
      baseRole,
      tokenId: authReq.userTokenId ?? null,
      permissions: ROLE_PERMISSIONS[activeRole],
    });
  });

  // POST /api/v1/auth/logout
  router.post('/logout', (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.userTokenId && authReq.userTokenId !== 'ci-test-bypass') {
      tokenVault.revokeToken(authReq.userTokenId);
    }
    res.status(200).json({ success: true });
  });

  // POST /api/v1/auth/switch-role
  router.post('/switch-role', (req: Request, res: Response): void => {
    const authReq = req as AuthenticatedRequest;
    const correlationId = getCorrelationId(req);
    const parsed = SwitchRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId, {
          detail: 'Valid role (admin | verifier | collaborator | viewer) is required.',
        })
      );
      return;
    }

    const nextRole: AppRole = parsed.data.role;
    const baseRole = authReq.userBaseRole ?? authReq.userRole ?? APP_ROLES.VIEWER;
    const rank: Record<AppRole, number> = {
      viewer: 0,
      collaborator: 1,
      verifier: 2,
      admin: 3,
    };

    if (baseRole !== APP_ROLES.ADMIN && rank[nextRole] > rank[baseRole]) {
      res.status(403).json(
        createProblemDetails(ERROR_REGISTRY.FORBIDDEN_OPERATION, correlationId, {
          detail: `Cannot escalate session role from '${baseRole}' to '${nextRole}'.`,
        })
      );
      return;
    }

    if (authReq.userTokenId && authReq.userTokenId !== 'ci-test-bypass') {
      tokenVault.updateTokenRole(authReq.userTokenId, nextRole);
    }

    res.status(200).json({
      success: true,
      activeRole: nextRole,
      baseRole,
      permissions: ROLE_PERMISSIONS[nextRole],
    });
  });

  // GET /api/v1/auth/users (admin only)
  router.get('/users', requireRole(APP_ROLES.ADMIN), (_req: Request, res: Response) => {
    res.status(200).json({ users: userStore.listUsers() });
  });

  // POST /api/v1/auth/users (admin only)
  router.post('/users', requireRole(APP_ROLES.ADMIN), (req: Request, res: Response): void => {
    const correlationId = getCorrelationId(req);
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId, {
          detail: 'Invalid user creation payload.',
          errors: parsed.error.flatten(),
        })
      );
      return;
    }

    try {
      const user = userStore.createUser(parsed.data);
      res.status(201).json({ user });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = msg === 'USERNAME_ALREADY_EXISTS' ? 409 : 400;
      res.status(status).json({
        type: 'https://polyglot.dev/errors/user-creation-failed',
        title: msg,
        status,
        detail: msg,
        correlationId,
      });
    }
  });

  // PATCH /api/v1/auth/users/:id/role (admin only)
  router.patch('/users/:id/role', requireRole(APP_ROLES.ADMIN), (req: Request, res: Response): void => {
    const correlationId = getCorrelationId(req);
    const parsed = UpdateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId));
      return;
    }

    try {
      const user = userStore.updateUserRole(req.params.id, parsed.data.role);
      tokenVault.revokeTokensForUser(user.id);
      res.status(200).json({ user });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = msg === 'USER_NOT_FOUND' ? 404 : 400;
      res.status(status).json({
        type: 'https://polyglot.dev/errors/user-update-failed',
        title: msg,
        status,
        detail: msg,
        correlationId,
      });
    }
  });

  // DELETE /api/v1/auth/users/:id (admin only)
  router.delete('/users/:id', requireRole(APP_ROLES.ADMIN), (req: Request, res: Response): void => {
    const correlationId = getCorrelationId(req);
    try {
      const deleted = userStore.deleteUser(req.params.id);
      if (!deleted) {
        res.status(404).json(createProblemDetails(ERROR_REGISTRY.RESOURCE_NOT_FOUND, correlationId));
        return;
      }
      tokenVault.revokeTokensForUser(req.params.id);
      res.status(200).json({ success: true, deletedId: req.params.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({
        type: 'https://polyglot.dev/errors/user-delete-failed',
        title: msg,
        status: 400,
        detail: msg,
        correlationId,
      });
    }
  });

  // GET /api/v1/auth/tokens
  router.get('/tokens', (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const isAdmin = authReq.userRole === APP_ROLES.ADMIN;
    const tokens = isAdmin ? tokenVault.listTokens() : tokenVault.listTokens(authReq.userId);
    res.status(200).json({ tokens });
  });

  // POST /api/v1/auth/tokens
  router.post('/tokens', (req: Request, res: Response): void => {
    const authReq = req as AuthenticatedRequest;
    const correlationId = getCorrelationId(req);
    const parsed = CreateTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId));
      return;
    }

    const activeRole = authReq.userRole ?? APP_ROLES.VIEWER;
    const requestedRole = parsed.data.role ?? activeRole;
    if (activeRole !== APP_ROLES.ADMIN && requestedRole !== activeRole) {
      res.status(403).json(
        createProblemDetails(ERROR_REGISTRY.FORBIDDEN_OPERATION, correlationId, {
          detail: 'Non-admin accounts may only issue tokens matching their own role.',
        })
      );
      return;
    }

    const tokenRole = isValidAppRole(requestedRole) ? requestedRole : activeRole;
    const issued = tokenVault.createToken(parsed.data.name, undefined, {
      userId: authReq.userId,
      role: tokenRole,
      baseRole: tokenRole,
      authType: 'api-key',
      expiresInMs: parsed.data.expiresInHours ? parsed.data.expiresInHours * 3600 * 1000 : undefined,
    });

    res.status(201).json({
      id: issued.id,
      rawToken: issued.rawToken,
      expiresAt: issued.expiresAt ?? null,
    });
  });

  // POST /api/v1/auth/tokens/:id/rotate
  router.post('/tokens/:id/rotate', requireRole(APP_ROLES.ADMIN), (req: Request, res: Response): void => {
    const correlationId = getCorrelationId(req);
    try {
      const rotated = tokenVault.rotateToken(req.params.id);
      res.status(200).json(rotated);
    } catch (err: unknown) {
      res.status(404).json(
        createProblemDetails(ERROR_REGISTRY.RESOURCE_NOT_FOUND, correlationId, {
          detail: err instanceof Error ? err.message : String(err),
        })
      );
    }
  });

  // POST /api/v1/auth/tokens/:id/revoke
  router.post('/tokens/:id/revoke', requireRole(APP_ROLES.ADMIN), (req: Request, res: Response): void => {
    const correlationId = getCorrelationId(req);
    const revoked = tokenVault.revokeToken(req.params.id);
    if (!revoked) {
      res.status(404).json(createProblemDetails(ERROR_REGISTRY.RESOURCE_NOT_FOUND, correlationId));
      return;
    }
    res.status(200).json({ success: true, id: req.params.id });
  });

  return router;
}
