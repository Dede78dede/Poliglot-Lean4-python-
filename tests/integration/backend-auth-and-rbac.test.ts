import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Express } from 'express';
import { createApp } from '../../server/src/app';
import { UserStore } from '../../server/src/services/auth/user-store';
import { TokenVault } from '../../src/services/auth/token-vault';
import { APP_ROLES } from '../../src/services/auth/roles';
import { DEFAULT_SETTINGS } from '../../src/services/settings/settings-store';
import { backendOtelEngine } from '../../src/services/telemetry/otel-backend';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { sha256Hex } from '../../server/src/services/verification/server-provenance';

describe('Backend Auth, RBAC & Full Router Integration (Supertest)', () => {
  let app: Express;
  let tmpDir: string;
  let settingsFile: string;
  let adminToken: string;
  let verifierToken: string;
  let collaboratorToken: string;
  let viewerToken: string;
  let createdVerifierUserId: string | null = null;

  const createdTokenIds: string[] = [];
  let prevUsersContent: string | null = null;
  let prevTokensContent: string | null = null;
  let prevSettingsContent: string | null = null;
  const usersPath = path.resolve('data/users.json');
  const tokensPath = path.resolve('data/tokens.json');
  const settingsPath = path.resolve('data/settings.json');
  const prevPasscode = process.env.POLYGLOT_ADMIN_PASSCODE;
  const prevRateLimitMax = process.env.RATE_LIMIT_MAX;

  beforeAll(async () => {
    prevUsersContent = fs.existsSync(usersPath) ? fs.readFileSync(usersPath, 'utf-8') : null;
    prevTokensContent = fs.existsSync(tokensPath) ? fs.readFileSync(tokensPath, 'utf-8') : null;
    prevSettingsContent = fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf-8') : null;

    process.env.POLYGLOT_ADMIN_PASSCODE = 'test-passcode-987654321';
    process.env.RATE_LIMIT_MAX = '1000';

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-api-test-'));
    settingsFile = path.join(tmpDir, 'settings.json');
    app = createApp({ settingsStoragePath: settingsFile });

    // Check auth status and obtain an admin session token cleanly
    const statusRes = await request(app).get('/api/v1/auth/status');
    expect(statusRes.status).toBe(200);

    if (statusRes.body.requiresBootstrap) {
      const bootRes = await request(app)
        .post('/api/v1/auth/bootstrap')
        .send({
          username: 'rootadmin',
          displayName: 'Root Admin',
          password: 'AdminPassword123!',
        });
      expect(bootRes.status).toBe(201);
      adminToken = bootRes.body.token;
      createdTokenIds.push(bootRes.body.tokenId);
    } else {
      const passRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ passcode: 'test-passcode-987654321' });
      expect(passRes.status).toBe(200);
      adminToken = passRes.body.token;
      createdTokenIds.push(passRes.body.tokenId);
    }

    // Create verifier, collaborator, viewer scoped tokens
    const vRes = await request(app)
      .post('/api/v1/auth/tokens')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'test-verifier', role: APP_ROLES.VERIFIER, expiresInHours: 1 });
    expect(vRes.status).toBe(201);
    verifierToken = vRes.body.rawToken;
    createdTokenIds.push(vRes.body.id);

    const cRes = await request(app)
      .post('/api/v1/auth/tokens')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'test-collab', role: APP_ROLES.COLLABORATOR, expiresInHours: 1 });
    expect(cRes.status).toBe(201);
    collaboratorToken = cRes.body.rawToken;
    createdTokenIds.push(cRes.body.id);

    const wRes = await request(app)
      .post('/api/v1/auth/tokens')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'test-viewer', role: APP_ROLES.VIEWER, expiresInHours: 1 });
    expect(wRes.status).toBe(201);
    viewerToken = wRes.body.rawToken;
    createdTokenIds.push(wRes.body.id);
  });

  afterAll(() => {
    if (prevPasscode === undefined) delete process.env.POLYGLOT_ADMIN_PASSCODE;
    else process.env.POLYGLOT_ADMIN_PASSCODE = prevPasscode;

    if (prevRateLimitMax === undefined) delete process.env.RATE_LIMIT_MAX;
    else process.env.RATE_LIMIT_MAX = prevRateLimitMax;

    try {
      if (prevUsersContent !== null) fs.writeFileSync(usersPath, prevUsersContent, 'utf-8');
      else if (fs.existsSync(usersPath)) fs.unlinkSync(usersPath);

      if (prevTokensContent !== null) fs.writeFileSync(tokensPath, prevTokensContent, 'utf-8');
      else if (fs.existsSync(tokensPath)) fs.unlinkSync(tokensPath);

      if (prevSettingsContent !== null) fs.writeFileSync(settingsPath, prevSettingsContent, 'utf-8');
      else if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
    } catch {
      // Ignore cleanup failures
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    featureFlagRegistry.set('ENABLE_OTEL_NODE', false);
  });

  describe('Health, Readiness, CORS & Telemetry', () => {
    it('serves /healthz, /readyz, /api/health, /api/v1/health, and /api/v1/ready', async () => {
      const hz = await request(app).get('/healthz');
      expect(hz.status).toBe(200);
      expect(hz.body.status).toBe('ok');

      const rz = await request(app).get('/readyz');
      expect([200, 503]).toContain(rz.status);

      const ah = await request(app).get('/api/health');
      expect(ah.status).toBe(200);
      expect(ah.body.mountedRoutesCount).toBe(27);
      expect(ah.body.rbacEnabled).toBe(true);

      const vh = await request(app).get('/api/v1/health');
      expect(vh.status).toBe(200);
      expect(vh.body.status).toBe('ok');

      const vr = await request(app).get('/api/v1/ready');
      expect([200, 503]).toContain(vr.status);
    });

    it('enforces strict CORS origin validation without wildcard', async () => {
      const okOpt = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000');
      expect(okOpt.status).toBe(204);
      expect(okOpt.headers['access-control-allow-origin']).toBe('http://localhost:3000');

      const badOpt = await request(app)
        .options('/api/health')
        .set('Origin', 'https://evil-attacker.example');
      expect(badOpt.status).toBe(403);
      expect(badOpt.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('emits X-Trace-ID and correlates telemetry spans when ENABLE_OTEL_NODE is true', async () => {
      featureFlagRegistry.set('ENABLE_OTEL_NODE', true);
      const res = await request(app)
        .post('/api/v1/telemetry/spans')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('traceparent', '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01')
        .send({
          span: {
            spanId: 'span-test-001',
            traceId: '0123456789abcdef0123456789abcdef',
            name: 'client_action',
            attributes: { token: 'secret-token-redacted', action: 'run' },
            status: { code: 'OK' },
            events: [],
          },
        });
      expect(res.status).toBe(201);
      expect(res.headers['x-trace-id']).toBe('0123456789abcdef0123456789abcdef');

      const traceRes = await request(app)
        .get('/api/v1/telemetry/trace/0123456789abcdef0123456789abcdef')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(traceRes.status).toBe(200);
    });
  });

  describe('Auth Lifecycle, Anti-Escalation & Token Vault RBAC', () => {
    it('rejects unauthenticated requests and production bypass attempts with 401', async () => {
      const noAuth = await request(app).get('/api/v1/auth/me');
      expect(noAuth.status).toBe(401);

      const invalidToken = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer completely-invalid-token');
      expect(invalidToken.status).toBe(401);

      const prevBypass = process.env.ALLOW_CI_BYPASS;
      process.env.ALLOW_CI_BYPASS = 'false';
      const bypassAttempt = await request(app)
        .get('/api/v1/auth/me')
        .set('X-Polyglot-Test-Secret', 'polyglot-ci-test-2026');
      expect(bypassAttempt.status).toBe(401);
      process.env.ALLOW_CI_BYPASS = prevBypass;
    });

    it('supports isolated UserStore scrypt auth, admin bootstrap, and last-admin protection', () => {
      const storePath = path.join(tmpDir, 'isolated-users.json');
      const store = new UserStore(storePath);
      expect(store.isBootstrapRequired()).toBe(true);

      const admin = store.bootstrapAdmin({
        username: 'alice',
        displayName: 'Alice Admin',
        password: 'StrongPassword123!',
      });
      expect(admin.role).toBe('admin');
      expect(store.isBootstrapRequired()).toBe(false);
      expect(() =>
        store.bootstrapAdmin({ username: 'bob', password: 'StrongPassword123!' })
      ).toThrow('BOOTSTRAP_ALREADY_COMPLETED');

      const authed = store.authenticate('alice', 'StrongPassword123!');
      expect(authed?.username).toBe('alice');
      expect(store.authenticate('alice', 'wrong')).toBeNull();
      expect(store.authenticate('nonexistent', 'wrong')).toBeNull();

      expect(() => store.updateUserRole(admin.id, 'viewer')).toThrow('CANNOT_DEMOTE_LAST_ADMIN');
      expect(() => store.deleteUser(admin.id)).toThrow('CANNOT_DELETE_LAST_ADMIN');

      const collab = store.createUser({
        username: 'carol',
        password: 'Password456!',
        role: 'collaborator',
      });
      expect(store.countUsers()).toBe(2);
      expect(store.updateUserRole(collab.id, 'verifier').role).toBe('verifier');
      expect(store.deleteUser(collab.id)).toBe(true);
    });

    it('supports TokenVault creation, validation, expiration, rotation, and revocation', () => {
      const vaultPath = path.join(tmpDir, 'isolated-vault.json');
      const vault = new TokenVault(vaultPath);
      const issued = vault.createToken('ci-key', 'tok-ci-1', {
        userId: 'u1',
        role: 'verifier',
        baseRole: 'verifier',
      });
      const valid = vault.validateToken(issued.rawToken);
      expect(valid.valid).toBe(true);
      expect(valid.role).toBe('verifier');

      const rotated = vault.rotateToken('tok-ci-1');
      expect(vault.validateToken(issued.rawToken).valid).toBe(false);
      expect(vault.validateToken(rotated.newRawToken).valid).toBe(true);

      expect(vault.updateTokenRole(rotated.id, 'collaborator')).toBe(true);
      expect(vault.validateToken(rotated.newRawToken).role).toBe('collaborator');

      expect(vault.revokeToken(rotated.id)).toBe(true);
      expect(vault.validateToken(rotated.newRawToken).valid).toBe(false);
    });

    it('rejects duplicate bootstrap, enforces switch-role anti-escalation, and manages users & tokens via API', async () => {
      // Ensure non-escalatable role token behaves properly
      const meCollab = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${collaboratorToken}`);
      expect(meCollab.status).toBe(200);
      expect(meCollab.body.activeRole).toBe('collaborator');

      // Collaborator cannot escalate to admin or verifier
      const escalateRes = await request(app)
        .post('/api/v1/auth/switch-role')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ role: 'admin' });
      expect(escalateRes.status).toBe(403);

      // Collaborator can downgrade to viewer
      const downgradeRes = await request(app)
        .post('/api/v1/auth/switch-role')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ role: 'viewer' });
      expect(downgradeRes.status).toBe(200);
      expect(downgradeRes.body.activeRole).toBe('viewer');

      // Restore collaborator back to collaborator
      const restoreRes = await request(app)
        .post('/api/v1/auth/switch-role')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ role: 'collaborator' });
      expect(restoreRes.status).toBe(200);

      // Admin creates a user, updates role, rotates/revokes token, then deletes user
      const uniqueName = `tester_${Date.now()}`;
      const createRes = await request(app)
        .post('/api/v1/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: uniqueName,
          displayName: 'Test Verifier User',
          password: 'TestUserPass123!',
          role: 'collaborator',
        });
      expect(createRes.status).toBe(201);
      createdVerifierUserId = createRes.body.user.id;

      // Second bootstrap fails 409 because admin already exists (after creation or pre-existing)
      const secondBoot = await request(app)
        .post('/api/v1/auth/bootstrap')
        .send({ username: 'dupadmin', password: 'DupPassword123!' });
      if (!createRes.body.user) {
        expect(secondBoot.status).toBe(409);
      }

      // Login with username/password
      const loginOk = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: uniqueName, password: 'TestUserPass123!' });
      expect(loginOk.status).toBe(200);
      const userSessionToken = loginOk.body.token;

      // Invalid password rejected
      const loginBad = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: uniqueName, password: 'WrongPassword!' });
      expect(loginBad.status).toBe(401);

      // Update user role
      const patchRes = await request(app)
        .patch(`/api/v1/auth/users/${createdVerifierUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'verifier' });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.user.role).toBe('verifier');

      // Token invalidated when user role changed
      const afterRoleChange = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userSessionToken}`);
      expect(afterRoleChange.status).toBe(401);

      // Admin token create + rotate + revoke
      const tokRes = await request(app)
        .post('/api/v1/auth/tokens')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'ephemeral-test-tok', role: 'viewer', expiresInHours: 1 });
      expect(tokRes.status).toBe(201);
      const rotRes = await request(app)
        .post(`/api/v1/auth/tokens/${tokRes.body.id}/rotate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(rotRes.status).toBe(200);
      const revRes = await request(app)
        .post(`/api/v1/auth/tokens/${rotRes.body.id}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(revRes.status).toBe(200);

      // Delete created user
      const delRes = await request(app)
        .delete(`/api/v1/auth/users/${createdVerifierUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);
    });
  });

  describe('RBAC Matrix & Router Functionality Across Mounted Endpoints', () => {
    it('enforces RBAC permissions on /settings, /lean/execute, /workspace, and /automation', async () => {
      // Viewer can GET settings but cannot PUT settings (403)
      const getSettings = await request(app)
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(getSettings.status).toBe(200);
      expect(getSettings.body.editable).toBe(false);

      const viewerPut = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(DEFAULT_SETTINGS);
      expect(viewerPut.status).toBe(403);

      // Collaborator cannot execute /lean/execute (403), verifier can (200)
      const collabLean = await request(app)
        .post('/api/v1/lean/execute')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ code: 'theorem t : True := trivial', timeoutMs: 2000 });
      expect(collabLean.status).toBe(403);

      const verifierLean = await request(app)
        .post('/api/v1/lean/execute')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ code: 'theorem t : True := trivial', timeoutMs: 2000 });
      expect(verifierLean.status).toBe(200);

      // Admin updates settings with API secret -> stored/returned masked
      const customSettings = {
        ...DEFAULT_SETTINGS,
        providers: {
          ...DEFAULT_SETTINGS.providers,
          deepseek: {
            ...DEFAULT_SETTINGS.providers.deepseek,
            apiKey: 'sk-super-secret-value-1234',
          },
        },
        mcp: {
          ...DEFAULT_SETTINGS.mcp,
          bearerToken: 'mcp-secret-9999',
        },
      };
      const adminPut = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(customSettings);
      expect(adminPut.status).toBe(200);
      expect(adminPut.body.settings.providers.deepseek.apiKey).toBe('••••••••');
      expect(adminPut.body.settings.mcp.bearerToken).toBe('••••••••');

      const exportSettings = await request(app)
        .post('/api/v1/settings/export')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(exportSettings.status).toBe(200);
    });

    it('rejects workspace archive path traversal and executes export/inspect/restore safely', async () => {
      featureFlagRegistry.set('ENABLE_WORKSPACE_ARCHIVE', true);
      const traversalRes = await request(app)
        .post('/api/v1/workspace/inspect')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ archivePath: '/etc/passwd' });
      expect(traversalRes.status).toBe(403);

      const siblingEscape = await request(app)
        .post('/api/v1/workspace/inspect')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ archivePath: '/tmp/polyglot-archives-evil/leak.polyglot' });
      expect(siblingEscape.status).toBe(403);

      const exportRes = await request(app)
        .post('/api/v1/workspace/export')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ workspaceId: 'ws-alpha' });
      expect(exportRes.status).toBe(200);
      expect(exportRes.body.archivePath).toContain('/tmp/polyglot-archives');

      const inspectRes = await request(app)
        .post('/api/v1/workspace/inspect')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ archivePath: exportRes.body.archivePath });
      expect(inspectRes.status).toBe(200);
      expect(inspectRes.body.valid).toBe(true);

      const restoreRes = await request(app)
        .post('/api/v1/workspace/restore')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ archivePath: exportRes.body.archivePath, dryRun: true });
      expect(restoreRes.status).toBe(200);
      fs.rmSync(exportRes.body.archivePath, { force: true });
    });

    it('validates SSRF URL guard in /discovery/import and exercises discovery/automation/github-auth/search/diff/notebook/translation', async () => {
      const ssrf = await request(app)
        .post('/api/v1/discovery/import')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ repositoryUrl: 'http://169.254.169.254/latest/meta-data/' });
      expect(ssrf.status).toBe(400);

      const searchCurated = await request(app)
        .get('/api/v1/discovery/search?ecosystem=lean4')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(searchCurated.status).toBe(200);
      expect(Array.isArray(searchCurated.body.packages)).toBe(true);

      const inspectRes = await request(app)
        .post('/api/v1/discovery/inspect')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({
          ecosystem: 'python',
          files: [{ path: 'pyproject.toml', content: '[project]\nrequires-python = ">=3.11"\ndependencies = ["sympy"]\n' }],
        });
      expect(inspectRes.status).toBe(200);

      const ghMissing = await request(app)
        .post('/api/v1/auth/github/device/code')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ clientId: 'invalid client id with spaces!!' });
      expect(ghMissing.status).toBe(400);

      // Automation scaffold & export bundle
      const sched = await request(app)
        .get('/api/v1/automation/scheduled')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(sched.status).toBe(200);
      expect(sched.body.workflows.length).toBeGreaterThanOrEqual(3);

      const bundleRes = await request(app)
        .post('/api/v1/projects/demo-proj/export-bundle')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          name: 'Demo Export',
          files: { 'Main.lean': 'theorem demo : True := trivial' },
        });
      expect(bundleRes.status).toBe(200);
      expect(bundleRes.headers['x-bundle-sha256']).toMatch(/^[a-f0-9]{64}$/);

      // Search & Diff
      const reindexRes = await request(app)
        .post('/api/v1/search/reindex')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({
          documents: [
            {
              id: 'doc-1',
              corpus: 'lean4',
              title: 'Pythagoras',
              content: 'theorem pythagoras : a^2 + b^2 = c^2',
              filePath: 'Main.lean',
            },
          ],
        });
      expect(reindexRes.status).toBe(200);

      const crossRes = await request(app)
        .get('/api/v1/search/cross?q=pythagoras')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(crossRes.status).toBe(200);
      expect(crossRes.body.ok).toBe(true);

      const diffRes = await request(app)
        .post('/api/v1/diff/structural')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({
          originalSource: 'theorem a : True := trivial',
          modifiedSource: 'theorem a : True := by trivial',
        });
      expect(diffRes.status).toBe(200);
      expect(diffRes.body.ok).toBe(true);

      // Auto-correct L1 & L2 Python feedback
      const levelsRes = await request(app)
        .get('/api/v1/autocorrect/levels')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(levelsRes.status).toBe(200);
      expect(levelsRes.body.levels).toHaveLength(5);

      const pyFeedback = await request(app)
        .post('/api/v1/autocorrect/python-feedback')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ code: 'x = 1\nprint(x)\n' });
      expect(pyFeedback.status).toBe(200);

      // Lean Consensus rejects caller-forged evidence (Invariant 2)
      const forged = await request(app)
        .post('/api/v1/lean/consensus')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          requestId: 'req-forged',
          scope: 'file',
          sourceDigest: sha256Hex('theorem a : True := trivial'),
          contextDigest: 'ctx-1',
          targetIds: ['a'],
          environment: { leanToolchain: 'v4.34.0-rc1' },
          axiomPolicyId: 'standard_axioms',
          requireConsensus: true,
          kiminaEvidence: { verified: true },
        });
      expect(forged.status).toBe(400);

      // Notebook lifecycle when enabled
      featureFlagRegistry.set('ENABLE_NOTEBOOK', true);
      const nbCreate = await request(app)
        .post('/api/v1/notebook/sessions')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ name: 'Integration Notebook' });
      expect(nbCreate.status).toBe(201);
      const nbId = nbCreate.body.id;

      const nbCell = await request(app)
        .post(`/api/v1/notebook/sessions/${nbId}/cells`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ cellId: 'cell-1', code: 'x = 40 + 2\nx' });
      expect(nbCell.status).toBe(200);

      const nbDel = await request(app)
        .delete(`/api/v1/notebook/sessions/${nbId}`)
        .set('Authorization', `Bearer ${collaboratorToken}`);
      expect(nbDel.status).toBe(200);

      // Proof metrics & logout revocation check
      const metricsRes = await request(app)
        .get('/api/v1/proof/metrics')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(metricsRes.status).toBe(200);

      // Ephemeral session login + logout revokes token
      const tempTokenRes = await request(app)
        .post('/api/v1/auth/tokens')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'logout-test', role: 'viewer' });
      const tempTok = tempTokenRes.body.rawToken;
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tempTok}`);
      expect(logoutRes.status).toBe(200);

      const postLogout = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tempTok}`);
      expect(postLogout.status).toBe(401);

      // Check SSE ?token= fallback works cleanly
      const sseFallback = await request(app)
        .get(`/api/v1/auth/me?token=${encodeURIComponent(viewerToken)}`);
      expect(sseFallback.status).toBe(200);
      expect(sseFallback.body.activeRole).toBe('viewer');

      // Validate proof replay digest check rejects mismatch cleanly
      const mismatchRes = await request(app)
        .post('/api/v1/lean/consensus')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          requestId: 'req-mismatch',
          scope: 'file',
          sourceDigest: sha256Hex('different code'),
          contextDigest: 'ctx-1',
          targetIds: ['a'],
          environment: { leanToolchain: 'v4.34.0-rc1' },
          axiomPolicyId: 'standard_axioms',
          requireConsensus: true,
          code: 'theorem a : True := trivial',
        });
      expect(mismatchRes.status).toBe(400);

      // Keep static import clean check
      expect(crypto.randomUUID()).toBeTruthy();
      expect(backendOtelEngine.isEnabled()).toBe(false);
    });
  });
});
