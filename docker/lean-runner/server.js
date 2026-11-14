const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const WORKSPACE_PROJECTS_ROOT = path.resolve('/workspace/projects');
const TOOLCHAINS = ['v4.28.0', 'v4.31.0', 'v4.33.1', 'v4.35.0-rc4'];
const DEFAULT_TOOLCHAIN = 'v4.35.0-rc4';
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const BUILD_TIMEOUT_MS = 120000;
const AUTH_TOKEN = (process.env.LEAN_RUNNER_AUTH_TOKEN || '').trim();

function isAuthorized(req) {
  if (!AUTH_TOKEN) return true;
  const auth = String(req.headers.authorization || '');
  const expected = `Bearer ${AUTH_TOKEN}`;
  if (auth.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
}

function resolveContainedProjectPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string' || rawPath.includes('\0')) {
    return null;
  }
  const resolved = path.resolve(rawPath);
  const rel = path.relative(WORKSPACE_PROJECTS_ROOT, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return null;
  }
  const realRoot = fs.existsSync(WORKSPACE_PROJECTS_ROOT)
    ? fs.realpathSync(WORKSPACE_PROJECTS_ROOT)
    : WORKSPACE_PROJECTS_ROOT;
  const realTarget = fs.realpathSync(resolved);
  const realRel = path.relative(realRoot, realTarget);
  if (!realRel || realRel.startsWith('..') || path.isAbsolute(realRel)) {
    return null;
  }
  return realTarget;
}

const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  if (method === 'GET' && (url === '/health' || url === '/readyz' || url === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      toolchains: TOOLCHAINS,
      defaultToolchain: DEFAULT_TOOLCHAIN,
    }));
  }

  if (method === 'POST' && url === '/build') {
    if (!isAuthorized(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized', exitCode: 1 }));
    }

    let body = '';
    let bodyTooLarge = false;
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf-8') > 65536) {
        bodyTooLarge = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (bodyTooLarge) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Payload too large', exitCode: 1 }));
      }
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON', exitCode: 1 }));
      }

      const cwd = resolveContainedProjectPath(data.projectPath);
      if (!cwd) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          error: 'Invalid or missing contained projectPath under /workspace/projects',
          exitCode: 1,
        }));
      }

      let activeToolchain = DEFAULT_TOOLCHAIN;
      const toolchainPath = path.join(cwd, 'lean-toolchain');
      if (fs.existsSync(toolchainPath)) {
        const requested = fs.readFileSync(toolchainPath, 'utf-8').trim().replace(/^leanprover\/lean4:/, '');
        if (!TOOLCHAINS.includes(requested)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            error: `Toolchain "${requested}" not installed`,
            exitCode: 1,
            toolchains: TOOLCHAINS,
          }));
        }
        activeToolchain = requested;
      }

      const safeEnv = {
        PATH: process.env.PATH || '/root/.elan/bin:/usr/local/bin:/usr/bin:/bin',
        ELAN_HOME: process.env.ELAN_HOME || '/root/.elan',
        HOME: process.env.HOME || '/home/leanrunner',
        TMPDIR: process.env.TMPDIR || '/tmp',
      };

      const startTime = Date.now();
      const child = spawn('lake', ['build'], {
        cwd,
        env: safeEnv,
      });

      let stdout = '';
      let stderr = '';
      let responded = false;

      const finish = (statusCode, payload) => {
        if (responded) return;
        responded = true;
        clearTimeout(killTimer);
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      const killTimer = setTimeout(() => {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!responded) child.kill('SIGKILL');
        }, 2000);
        finish(200, {
          status: 'error',
          stdout,
          stderr: `${stderr}\nLake build timed out after ${BUILD_TIMEOUT_MS}ms`,
          exitCode: 124,
          durationMs: Date.now() - startTime,
          toolchain: activeToolchain,
          toolchains: TOOLCHAINS,
        });
      }, BUILD_TIMEOUT_MS);

      child.stdout.on('data', d => {
        if (Buffer.byteLength(stdout, 'utf-8') < MAX_OUTPUT_BYTES) {
          stdout += d.toString();
        }
      });
      child.stderr.on('data', d => {
        if (Buffer.byteLength(stderr, 'utf-8') < MAX_OUTPUT_BYTES) {
          stderr += d.toString();
        }
      });

      child.on('error', err => {
        finish(200, {
          status: 'error',
          stdout,
          stderr: stderr ? `${stderr}\n${err.message}` : err.message,
          exitCode: 1,
          durationMs: Date.now() - startTime,
          toolchain: activeToolchain,
          toolchains: TOOLCHAINS,
        });
      });

      child.on('close', code => {
        const exitCode = typeof code === 'number' ? code : 1;
        finish(200, {
          status: exitCode === 0 ? 'ok' : 'error',
          stdout,
          stderr,
          exitCode,
          durationMs: Date.now() - startTime,
          toolchain: activeToolchain,
          toolchains: TOOLCHAINS,
        });
      });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', exitCode: 1 }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Lean 4 Multi-Toolchain Lake Runner listening on port ${PORT}`);
});
