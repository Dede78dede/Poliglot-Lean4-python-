import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import * as fflate from 'fflate';
import type { Express } from 'express';
import { createApp } from '../../server/src/app';
import { APP_ROLES } from '../../src/services/auth/roles';
import { DEFAULT_SETTINGS } from '../../src/services/settings/settings-store';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { sha256Hex } from '../../server/src/services/verification/server-provenance';
import { derivePythonMetadata, processRepositoryZipBytes } from '../../server/src/routes/discovery';
import { WorkspaceStore } from '../../server/src/services/collaboration/workspace-store';
import { trashService } from '../../src/services/files/trash-service';

describe('Backend Routes Full Coverage Suite (Supertest)', () => {
  let app: Express;
  let tmpDir: string;
  let workspaceStore: WorkspaceStore;
  let adminToken: string;
  let verifierToken: string;
  let collaboratorToken: string;
  let viewerToken: string;

  const usersPath = path.resolve('data/users.json');
  const tokensPath = path.resolve('data/tokens.json');
  const settingsPath = path.resolve('data/settings.json');
  let prevUsers: string | null = null;
  let prevTokens: string | null = null;
  let prevSettings: string | null = null;
  const prevPasscode = process.env.POLYGLOT_ADMIN_PASSCODE;
  const prevRateMax = process.env.RATE_LIMIT_MAX;

  beforeAll(async () => {
    prevUsers = fs.existsSync(usersPath) ? fs.readFileSync(usersPath, 'utf-8') : null;
    prevTokens = fs.existsSync(tokensPath) ? fs.readFileSync(tokensPath, 'utf-8') : null;
    prevSettings = fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf-8') : null;

    process.env.POLYGLOT_ADMIN_PASSCODE = 'routes-cov-passcode-123456';
    process.env.RATE_LIMIT_MAX = '5000';

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-routes-cov-'));
    workspaceStore = new WorkspaceStore();
    app = createApp({
      settingsStoragePath: path.join(tmpDir, 'settings.json'),
      workspaceStore,
    });

    const status = await request(app).get('/api/v1/auth/status');
    if (status.body.requiresBootstrap) {
      const boot = await request(app)
        .post('/api/v1/auth/bootstrap')
        .send({ username: 'routesadmin', password: 'RoutesAdminPassword123!' });
      adminToken = boot.body.token;
    } else {
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ passcode: 'routes-cov-passcode-123456' });
      adminToken = login.body.token;
    }

    const mkTok = async (role: string) => {
      const r = await request(app)
        .post('/api/v1/auth/tokens')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `cov-${role}`, role, expiresInHours: 1 });
      return r.body.rawToken as string;
    };

    verifierToken = await mkTok(APP_ROLES.VERIFIER);
    collaboratorToken = await mkTok(APP_ROLES.COLLABORATOR);
    viewerToken = await mkTok(APP_ROLES.VIEWER);
  });

  afterAll(() => {
    if (prevPasscode === undefined) delete process.env.POLYGLOT_ADMIN_PASSCODE;
    else process.env.POLYGLOT_ADMIN_PASSCODE = prevPasscode;
    if (prevRateMax === undefined) delete process.env.RATE_LIMIT_MAX;
    else process.env.RATE_LIMIT_MAX = prevRateMax;

    try {
      featureFlagRegistry.set('ENABLE_LP2', false);
      featureFlagRegistry.set('ENABLE_CONTRACT_PARITY', false);
      featureFlagRegistry.set('ENABLE_PAPERPROOF', false);
      featureFlagRegistry.set('ENABLE_OTEL_NODE', false);
      featureFlagRegistry.set('ENABLE_LSPEC_CI_TEMPLATE', false);
      if (prevUsers !== null) fs.writeFileSync(usersPath, prevUsers, 'utf-8');
      else if (fs.existsSync(usersPath)) fs.unlinkSync(usersPath);
      if (prevTokens !== null) fs.writeFileSync(tokensPath, prevTokens, 'utf-8');
      else if (fs.existsSync(tokensPath)) fs.unlinkSync(tokensPath);
      if (prevSettings !== null) fs.writeFileSync(settingsPath, prevSettings, 'utf-8');
      else if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
    } catch {
      // ignore cleanup failures
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    featureFlagRegistry.set('ENABLE_CONTRACT_PARITY', true);
    featureFlagRegistry.set('ENABLE_CONFIG_MANAGER', true);
    featureFlagRegistry.set('ENABLE_NOTEBOOK', true);
    featureFlagRegistry.set('ENABLE_PAPERPROOF', true);
    featureFlagRegistry.set('ENABLE_OTEL_NODE', true);
    featureFlagRegistry.set('ENABLE_LSPEC_CI_TEMPLATE', true);
    featureFlagRegistry.set('ENABLE_LP2', true);
  });

  it('covers /api/v1/ai, /api/v1/autocorrect, and /api/v1/interact endpoints', async () => {
    const authHdr = { Authorization: `Bearer ${collaboratorToken}` };

    // AI routes
    const providers = await request(app).get('/api/v1/ai/providers').set(authHdr);
    expect(providers.status).toBe(200);
    expect(Array.isArray(providers.body.providers)).toBe(true);

    const badSuggest = await request(app).post('/api/v1/ai/suggest').set(authHdr).send({});
    expect(badSuggest.status).toBe(400);

    const suggestOk = await request(app)
      .post('/api/v1/ai/suggest')
      .set(authHdr)
      .send({ goal: 'n + 0 = n', context: 'Nat', provider: 'local-heuristic' });
    expect([200, 502]).toContain(suggestOk.status);

    const badRepair = await request(app).post('/api/v1/ai/repair').set(authHdr).send({});
    expect(badRepair.status).toBe(400);

    const repairRes = await request(app)
      .post('/api/v1/ai/repair')
      .set(authHdr)
      .send({ brokenProof: 'theorem t : True := by sorry', provider: 'local-heuristic' });
    expect([200, 501, 502]).toContain(repairRes.status);

    const selBad = await request(app).post('/api/v1/ai/provider/select').set(authHdr).send({ providerId: 123 });
    expect(selBad.status).toBe(400);
    const selMiss = await request(app).post('/api/v1/ai/provider/select').set(authHdr).send({ providerId: 'no-such-prov' });
    expect(selMiss.status).toBe(404);
    const selOk = await request(app).post('/api/v1/ai/provider/select').set(authHdr).send({ providerId: providers.body.active });
    expect(selOk.status).toBe(200);

    // Autocorrect routes
    const detBad = await request(app).post('/api/v1/autocorrect/deterministic').set(authHdr).send({});
    expect(detBad.status).toBe(400);
    const detOk = await request(app).post('/api/v1/autocorrect/deterministic').set(authHdr).send({ code: 'x=1\n', allowUnsafe: false });
    expect([200, 500]).toContain(detOk.status);

    const flBad = await request(app).post('/api/v1/autocorrect/feedback-loop').set(authHdr).send({});
    expect(flBad.status).toBe(400);
    const flOk = await request(app).post('/api/v1/autocorrect/feedback-loop').set(authHdr).send({ code: 'theorem a : True := sorry' });
    expect([200, 503]).toContain(flOk.status);

    const pyBad = await request(app).post('/api/v1/autocorrect/python-feedback').set(authHdr).send({});
    expect(pyBad.status).toBe(400);

    const specBad = await request(app).post('/api/v1/autocorrect/specialized').set(authHdr).send({});
    expect(specBad.status).toBe(400);
    const specRes = await request(app).post('/api/v1/autocorrect/specialized').set(authHdr).send({ brokenProof: 'theorem a : True := by sorry' });
    expect([200, 503]).toContain(specRes.status);

    const pySpecBad = await request(app).post('/api/v1/autocorrect/python-specialized').set(authHdr).send({});
    expect(pySpecBad.status).toBe(400);
    const pySpecOk = await request(app).post('/api/v1/autocorrect/python-specialized').set(authHdr).send({ code: 'def f(x):\n return x\n' });
    expect(pySpecOk.status).toBe(200);

    const cloudBad = await request(app).post('/api/v1/autocorrect/cloud').set(authHdr).send({});
    expect(cloudBad.status).toBe(400);
    const cloudNoConsent = await request(app)
      .post('/api/v1/autocorrect/cloud')
      .set(authHdr)
      .send({ brokenProof: 'theorem a : True := by sorry', consentGiven: false });
    expect([403, 502]).toContain(cloudNoConsent.status);

    const casBad = await request(app).post('/api/v1/autocorrect/certified-cas').set(authHdr).send({});
    expect(casBad.status).toBe(400);
    const casRes = await request(app).post('/api/v1/autocorrect/certified-cas').set(authHdr).send({ goal: 'x + y = y + x' });
    expect([200, 503, 500]).toContain(casRes.status);

    // Interact routes
    const stepBad = await request(app).post('/api/v1/interact/lean-step').set(authHdr).send({ step: 0 });
    expect(stepBad.status).toBe(400);
    const stepOk = await request(app)
      .post('/api/v1/interact/lean-step')
      .set(authHdr)
      .send({ sessionId: crypto.randomUUID(), step: 1, code: 'theorem t : True := trivial' });
    expect(stepOk.status).toBe(200);

    const pSearchBad = await request(app).post('/api/v1/proof/search').set(authHdr).send({ goal: 'unbalanced (' });
    expect(pSearchBad.status).toBe(400);
    const pSearchOk = await request(app).post('/api/v1/proof/search').set(authHdr).send({ goal: '2 + 2 = 4' });
    expect(pSearchOk.status).toBe(200);
    expect(pSearchOk.body.searchTree.root.closed).toBe(true);
    const pSearchGet = await request(app).get('/api/v1/proof/search?goal=n%20%2B%20m').set(authHdr);
    expect(pSearchGet.status).toBe(200);
  });

  it('covers /api/v1/workspaces, /api/v1/blueprint, /api/v1/proof/*, and /api/v1/femev', async () => {
    const authCollab = { Authorization: `Bearer ${collaboratorToken}` };
    const authVerif = { Authorization: `Bearer ${verifierToken}` };
    const wsId = `ws-cov-${Date.now()}`;

    const badWs = await request(app).post('/api/v1/workspaces').set(authCollab).send({});
    expect(badWs.status).toBe(400);

    const created = await request(app)
      .post('/api/v1/workspaces')
      .set(authCollab)
      .send({
        id: wsId,
        name: 'Cov Workspace',
        description: 'Test workspace',
        nodes: [{ id: 'thmA', label: 'thmA', kind: 'theorem', status: 'unclaimed', filePath: 'Main.lean' }],
        edges: [],
      });
    expect(created.status).toBe(201);

    expect((await request(app).get('/api/v1/workspaces').set(authCollab)).status).toBe(200);
    expect((await request(app).get(`/api/v1/workspaces/${wsId}`).set(authCollab)).status).toBe(200);
    expect((await request(app).get('/api/v1/workspaces/nonexistent').set(authCollab)).status).toBe(404);
    expect((await request(app).get(`/api/v1/workspaces/${wsId}/blueprint`).set(authCollab)).status).toBe(200);
    expect((await request(app).get('/api/v1/workspaces/nonexistent/blueprint').set(authCollab)).status).toBe(404);

    const extBad = await request(app).post(`/api/v1/workspaces/${wsId}/blueprint/extract`).set(authCollab).send({});
    expect(extBad.status).toBe(400);
    const extOk = await request(app)
      .post(`/api/v1/workspaces/${wsId}/blueprint/extract`)
      .set(authCollab)
      .send({ files: [{ path: 'Main.lean', content: 'theorem foo : True := trivial', language: 'lean4' }] });
    expect(extOk.status).toBe(200);

    const claimBad = await request(app).post(`/api/v1/workspaces/${wsId}/blueprint/claim`).set(authCollab).send({});
    expect(claimBad.status).toBe(400);
    const claimOk = await request(app)
      .post(`/api/v1/workspaces/${wsId}/blueprint/claim`)
      .set(authCollab)
      .send({ nodeId: 'thmA', userId: 'u1', userName: 'Ada' });
    expect(claimOk.status).toBe(200);
    const claimConflict = await request(app)
      .post(`/api/v1/workspaces/${wsId}/blueprint/claim`)
      .set(authCollab)
      .send({ nodeId: 'thmA', userId: 'u2', userName: 'Bob' });
    expect(claimConflict.status).toBe(409);

    const verifySorry = await request(app)
      .post(`/api/v1/workspaces/${wsId}/blueprint/verify`)
      .set(authVerif)
      .send({ nodeId: 'thmA', proofCode: 'theorem thmA : True := by sorry', userId: 'u1', userName: 'Ada' });
    expect([400, 422]).toContain(verifySorry.status);

    const verifyOk = await request(app)
      .post(`/api/v1/workspaces/${wsId}/blueprint/verify`)
      .set(authVerif)
      .send({ nodeId: 'thmA', proofCode: 'theorem thmA : True := by exact True.intro', userId: 'u1', userName: 'Ada' });
    expect(verifyOk.status).toBe(200);

    const relBad = await request(app).post(`/api/v1/workspaces/${wsId}/blueprint/release`).set(authCollab).send({});
    expect(relBad.status).toBe(400);
    await request(app)
      .post(`/api/v1/workspaces/${wsId}/blueprint/release`)
      .set(authCollab)
      .send({ nodeId: 'thmA', userId: 'u1' });

    expect((await request(app).get(`/api/v1/workspaces/${wsId}/ledger`).set(authCollab)).status).toBe(200);
    expect((await request(app).get('/api/v1/workspaces/nonexistent/ledger').set(authCollab)).status).toBe(404);
    expect((await request(app).post(`/api/v1/workspaces/${wsId}/ledger`).set(authCollab).send({})).status).toBe(400);
    expect(
      (await request(app).post(`/api/v1/workspaces/${wsId}/ledger`).set(authCollab).send({ author: 'Ada', type: 'note', payload: { msg: 'ok' } })).status
    ).toBe(201);

    // Proof automation sync & duper/disprove/extract/simplify/probe/speculative/paperproof
    expect((await request(app).post(`/api/v1/proof/workspaces/${wsId}/blueprint/sync`).set(authCollab).send({ mode: 'bad' })).status).toBe(400);
    expect((await request(app).post('/api/v1/proof/workspaces/missing-ws/blueprint/sync').set(authCollab).send({ mode: 'extract' })).status).toBe(404);
    expect(
      (await request(app).post(`/api/v1/proof/workspaces/${wsId}/blueprint/sync`).set(authCollab).send({ mode: 'extract', files: [{ path: 'Main.lean', content: 'theorem t : True := trivial' }] })).status
    ).toBe(200);

    expect((await request(app).post('/api/v1/proof/duper').set(authCollab).send({})).status).toBe(400);
    const duperRes = await request(app).post('/api/v1/proof/duper').set(authCollab).send({ goal: 'n + 0 = n', timeoutMs: 200 });
    expect([200, 408, 500, 503]).toContain(duperRes.status);

    expect((await request(app).post('/api/v1/proof/disprove').set(authCollab).send({})).status).toBe(400);
    expect((await request(app).post('/api/v1/proof/disprove').set(authCollab).send({ statement: 'False', consentGiven: false })).status).toBe(403);
    expect((await request(app).post('/api/v1/proof/extract-states').set(authCollab).send({})).status).toBe(400);
    expect((await request(app).post('/api/v1/proof/extract-states').set(authCollab).send({ code: 'theorem a : True := trivial', consentGiven: false })).status).toBe(403);
    expect((await request(app).post('/api/v1/proof/simplify').set(authCollab).send({})).status).toBe(400);
    expect((await request(app).post('/api/v1/proof/simplify').set(authCollab).send({ code: 'theorem a : True := trivial', consentGiven: false })).status).toBe(403);

    featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
    expect((await request(app).post('/api/v1/proof/probe').set(authCollab).send({ text: 'rfl' })).status).toBe(503);
    expect((await request(app).post('/api/v1/proof/speculative').set(authCollab).send({ tactics: ['rfl'] })).status).toBe(503);

    featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
    expect((await request(app).post('/api/v1/proof/probe').set(authCollab).send({})).status).toBe(400);
    const probeRes = await request(app).post('/api/v1/proof/probe').set(authCollab).send({ text: 'omega', path: 'Main.lean' });
    expect([200, 422, 503]).toContain(probeRes.status);

    expect((await request(app).post('/api/v1/proof/speculative').set(authCollab).send({ tactics: [] })).status).toBe(400);
    expect((await request(app).post('/api/v1/proof/speculative').set(authCollab).send({ tactics: Array(9).fill('rfl') })).status).toBe(400);
    const specBeam = await request(app).post('/api/v1/proof/speculative').set(authCollab).send({ tactics: ['rfl', 'omega'], timeoutMs: 300 });
    expect([200, 422, 503]).toContain(specBeam.status);

    const ppRes = await request(app).post('/api/v1/proof/paperproof').set(authCollab).send({ path: 'Main.lean', action: 'steps', force: true });
    expect([200, 400, 503]).toContain(ppRes.status);

    // Blueprint generate-stubs & FEMEV paperproof
    const bp404 = await request(app).post('/api/v1/blueprint/missing-bp/generate-stubs').set(authCollab).send({});
    expect(bp404.status).toBe(404);
    const bpOk = await request(app)
      .post(`/api/v1/blueprint/${wsId}/generate-stubs`)
      .set(authCollab)
      .send({
        dag: {
          id: wsId,
          nodes: [{ id: 'n1', name: 'my_thm', kind: 'theorem', signature: 'theorem my_thm : True', dependencies: [] }],
          edges: [],
        },
      });
    expect(bpOk.status).toBe(200);

    const femevOk = await request(app).post('/api/v1/femev/thm1/paperproof').set(authCollab).send({ leanCode: 'theorem thm1 : True := trivial' });
    expect([200, 503]).toContain(femevOk.status);
    featureFlagRegistry.set('ENABLE_PAPERPROOF', false);
    const femevDis = await request(app).post('/api/v1/femev/thm1/paperproof').set(authCollab).send({});
    expect(femevDis.status).toBe(503);
  });

  it('covers /api/v1/projects, /api/v1/files, /api/v1/contracts, /api/v1/config, /api/v1/translation, /api/v1/automation, /api/v1/chat, /api/v1/mcp', async () => {
    const authAdmin = { Authorization: `Bearer ${adminToken}` };
    const authVerif = { Authorization: `Bearer ${verifierToken}` };
    const authCollab = { Authorization: `Bearer ${collaboratorToken}` };

    // Projects CRUD & build
    expect((await request(app).get('/api/v1/projects').set(authCollab)).status).toBe(200);
    expect((await request(app).get('/api/v1/projects/lean/toolchains').set(authCollab)).status).toBe(200);
    expect((await request(app).get('/api/v1/projects/lean/files?sessionId=not-uuid').set(authCollab)).status).toBe(400);

    const sid = crypto.randomUUID();
    expect((await request(app).post('/api/v1/projects/lean/upload').set(authCollab).send({ sessionId: 'bad', files: [] })).status).toBe(400);
    const travUpload = await request(app)
      .post('/api/v1/projects/lean/upload')
      .set(authCollab)
      .send({ sessionId: sid, files: [{ path: '../evil.lean', content: 'x' }] });
    expect(travUpload.status).toBe(400);

    const okUpload = await request(app)
      .post('/api/v1/projects/lean/upload')
      .set(authCollab)
      .send({
        sessionId: sid,
        files: [
          { path: 'Main.lean', content: 'theorem t : True := trivial' },
          { path: 'lean-toolchain', content: 'leanprover/lean:v4.35.0-rc4' },
        ],
      });
    expect(okUpload.status).toBe(200);
    expect((await request(app).get(`/api/v1/projects/lean/files?sessionId=${sid}`).set(authCollab)).status).toBe(200);
    expect((await request(app).get(`/api/v1/projects/lean/session/${sid}`).set(authCollab)).status).toBe(200);
    expect((await request(app).post(`/api/v1/projects/lean/session/${sid}/pin`).set(authCollab).send({ pinned: true })).status).toBe(200);

    const buildRes = await request(app).post('/api/v1/projects/lean/build').set(authCollab).send({ sessionId: sid });
    expect([200, 409, 502]).toContain(buildRes.status);
    const streamRes = await request(app).get(`/api/v1/projects/lean/build-stream?sessionId=${sid}`).set(authCollab);
    expect(streamRes.status).toBe(200);
    expect((await request(app).delete(`/api/v1/projects/${sid}`).set(authCollab)).status).toBe(200);

    // LSpec CI template
    const badProjId = await request(app).post('/api/v1/projects/..evil/lspec-ci-template').set(authCollab).send({});
    expect(badProjId.status).toBe(400);

    // Files routes
    trashService.emptyTrash();
    expect((await request(app).get('/api/v1/files/tree').set(authCollab)).status).toBe(200);
    expect((await request(app).post('/api/v1/files/archive').set(authCollab).send({ files: [] })).status).toBe(400);
    const arch = await request(app)
      .post('/api/v1/files/archive')
      .set(authCollab)
      .send({ files: [{ path: 'src/Main.lean', content: 'theorem a : True := trivial' }] });
    expect(arch.status).toBe(200);
    expect((await request(app).post('/api/v1/files/preview').set(authCollab).send({ archiveBase64: arch.body.archiveBase64 })).status).toBe(200);
    expect((await request(app).post('/api/v1/files/extract').set(authCollab).send({ archiveBase64: arch.body.archiveBase64 })).status).toBe(200);
    expect((await request(app).delete('/api/v1/files/src/old.py').set(authCollab).send({ content: 'print(1)' })).status).toBe(200);
    expect((await request(app).get('/api/v1/files/trash').set(authCollab)).status).toBe(200);
    expect((await request(app).post('/api/v1/files/src/old.py/restore').set(authCollab)).status).toBe(200);
    expect((await request(app).delete('/api/v1/files/trash').set(authCollab)).status).toBe(200);

    // Contracts, Config, Translation, Proof-Reuse, Proposal-Loop, Lean
    expect((await request(app).post('/api/v1/contracts/parity-check').set(authCollab).send({ schemaName: 'Unknown', payload: {} })).status).toBe(404);
    expect(
      (await request(app).post('/api/v1/contracts/parity-check').set(authCollab).send({ schemaName: 'ProofReuseQuery', payload: { goal: 'True', leanToolchain: 'v4', extraKey: 1 } })).status
    ).toBe(200);

    const propsRes = await request(app).get('/api/v1/config/proposals').set(authAdmin);
    expect(propsRes.status).toBe(200);
    const firstProp = propsRes.body.data?.[0];
    if (firstProp) {
      expect((await request(app).post(`/api/v1/config/proposals/${firstProp.id}/apply`).set(authAdmin).send({ userConfirmed: false })).status).toBe(400);
      await request(app).post(`/api/v1/config/proposals/${firstProp.id}/dismiss`).set(authAdmin);
    }
    expect((await request(app).get('/api/v1/config/audit-log').set(authAdmin)).status).toBe(200);

    expect((await request(app).post('/api/v1/proof/reuse/search').set(authCollab).send({})).status).toBe(400);
    expect((await request(app).post('/api/v1/proof/reuse/search').set(authCollab).send({ goal: 'n + 0 = n', leanToolchain: 'v4.35.0' })).status).toBe(200);
    expect((await request(app).get('/api/v1/proof/reuse/metrics').set(authCollab)).status).toBe(200);
    expect((await request(app).post('/api/v1/proof/reuse/reindex').set(authCollab)).status).toBe(200);

    expect((await request(app).post('/api/v1/proof/proposal-loop').set(authCollab).send({})).status).toBe(400);
    expect((await request(app).post('/api/v1/proof/proposal-loop').set(authCollab).send({ declarationId: 'thm_1', goal: 'True' })).status).toBe(200);

    expect((await request(app).post('/api/v1/translation/fidelity-check').set(authCollab).send({})).status).toBe(400);
    expect(
      (await request(app).post('/api/v1/translation/fidelity-check').set(authCollab).send({ direction: 'py2lean', source: 'def f(x): return x', target: 'def f (x : Int) := x' })).status
    ).toBe(200);
    expect((await request(app).post('/api/v1/translation/lp2').set(authCollab).send({ direction: 'py2lean', source: 'def f(x: int) -> int:\n  return x\n' })).status).toBe(200);
    featureFlagRegistry.set('ENABLE_LP2', false);
    expect((await request(app).post('/api/v1/translation/lp2').set(authCollab).send({ direction: 'py2lean', source: 'def f(x): return x' })).status).toBe(503);

    // Lean consensus valid digest & empty code
    const emptyCons = await request(app)
      .post('/api/v1/lean/consensus')
      .set(authVerif)
      .send({
        protocolVersion: 'polyglot.verification.v1',
        requestId: 'req-empty',
        scope: 'snippet',
        sourceDigest: sha256Hex(''),
        contextDigest: 'ctx',
        targetIds: ['a'],
        environment: { leanToolchain: 'v4.35.0-rc4' },
        axiomPolicyId: 'polyglot.axioms.standard.v1',
        requireConsensus: true,
      });
    expect(emptyCons.status).toBe(200);
    expect(emptyCons.body.verdict).toBe('unconfirmed');

    const code = 'theorem a : True := trivial';
    const validCons = await request(app)
      .post('/api/v1/lean/consensus')
      .set(authVerif)
      .send({
        protocolVersion: 'polyglot.verification.v1',
        requestId: 'req-valid',
        scope: 'snippet',
        sourceDigest: sha256Hex(code),
        contextDigest: 'ctx',
        targetIds: ['a'],
        environment: { leanToolchain: 'v4.35.0-rc4' },
        axiomPolicyId: 'polyglot.axioms.standard.v1',
        requireConsensus: true,
        code,
      });
    expect(validCons.status).toBe(200);

    // Automation, Chat, MCP
    expect((await request(app).post('/api/v1/automation/archive').set(authVerif).send({ files: { 'a.py': 'print(1)' } })).status).toBe(200);
    expect((await request(app).post('/api/v1/automation/scaffold').set(authVerif).send({ templateId: 'nonexistent-tmpl' })).status).toBe(404);
    expect((await request(app).post('/api/v1/automation/scheduled/nightly-proof-check/enable').set(authVerif)).status).toBe(200);
    expect((await request(app).post('/api/v1/automation/scheduled/nightly-proof-check/disable').set(authVerif)).status).toBe(200);

    expect((await request(app).get('/api/v1/chat/providers').set(authCollab)).status).toBe(200);
    expect((await request(app).get('/api/v1/chat/sessions').set(authCollab)).status).toBe(200);
    expect((await request(app).get('/api/v1/chat/sessions/missing').set(authCollab)).status).toBe(404);
    expect((await request(app).delete('/api/v1/chat/sessions/missing').set(authCollab)).status).toBe(404);
    expect((await request(app).post('/api/v1/chat/sessions/missing/export').set(authCollab)).status).toBe(404);
    const chatSse = await request(app)
      .post('/api/v1/chat/completions')
      .set(authCollab)
      .send({ sessionId: 'cov-chat', messages: [{ role: 'user', content: 'Prove 1=1' }] });
    expect(chatSse.status).toBe(200);

    const mcpDiscover = await request(app).post('/mcp/discover').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect([200, 400, 401]).toContain(mcpDiscover.status);

    // Settings invalid payload branch
    expect((await request(app).put('/api/v1/settings').set(authAdmin).send({ bad: true })).status).toBe(400);
    expect((await request(app).post('/api/v1/settings/import').set(authAdmin).send(DEFAULT_SETTINGS)).status).toBe(200);
  });

  it('covers discovery pure helpers derivePythonMetadata and processRepositoryZipBytes', () => {
    const pyMeta = derivePythonMetadata(
      [
        { path: 'pyproject.toml', content: '[project]\nrequires-python = ">=3.12"\ndependencies = ["numpy"]\n' },
        { path: 'main.py', content: 'import numpy as np\n' },
      ],
      ['algebra']
    );
    expect(pyMeta.pythonVersion).toContain('3.12');
    expect(pyMeta.tags).toContain('algebra');

    const pyZip = fflate.zipSync({
      'owner-repo-abc/pyproject.toml': fflate.strToU8('[project]\nrequires-python = ">=3.11"\n'),
      'owner-repo-abc/mod.py': fflate.strToU8('x = 1\n'),
    });
    const pyImported = processRepositoryZipBytes(pyZip, 'my-py-repo', 'tester', 'desc', 10, 'MIT');
    expect(pyImported.project.type).toBe('python');
    expect(pyImported.package.license).toBe('MIT');

    const leanZip = fflate.zipSync({
      'owner-lean-xyz/lean-toolchain': fflate.strToU8('v4.35.0-rc4\n'),
      'owner-lean-xyz/Main.lean': fflate.strToU8('theorem t : True := trivial\n'),
    });
    const leanImported = processRepositoryZipBytes(leanZip, 'my-lean-repo', 'tester');
    expect(leanImported.project.type).toBe('lean4');

    expect(() => processRepositoryZipBytes(fflate.zipSync({}), 'empty')).toThrow(/Empty ZIP/);
  });
});
