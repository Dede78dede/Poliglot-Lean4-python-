const http = require('http');
const { spawn, execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const WORKSPACE_PROJECTS_ROOT = path.resolve(process.env.SESSION_STORE_ROOT || '/workspace/projects');
const SCRATCH_JOBS_ROOT = path.resolve('/tmp/lean-jobs');
const TOOLCHAINS = [
  'v4.28.0',
  'v4.31.0',
  'v4.31.0-rc2',
  'v4.32.2',
  'v4.33.1',
  'v4.34.1',
  'v4.35.0-rc4',
  'v4.35.0',
];
const DEFAULT_TOOLCHAIN = 'v4.35.0-rc4';
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_COPY_FILES = 500;
const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const BUILD_TIMEOUT_MS = 120000;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTH_TOKEN = (process.env.LEAN_RUNNER_AUTH_TOKEN || '').trim();

if (!AUTH_TOKEN) {
  console.error('[FATAL] LEAN_RUNNER_AUTH_TOKEN is required (fail-closed startup). Exiting.');
  process.exit(1);
}

function isAuthorized(req) {
  if (!AUTH_TOKEN) return false;
  const auth = String(req.headers.authorization || '');
  const expected = `Bearer ${AUTH_TOKEN}`;
  if (auth.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
}

function resolveSessionSourceDir(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || !UUID_V4_REGEX.test(sessionId)) {
    return null;
  }
  const rootStat = fs.existsSync(WORKSPACE_PROJECTS_ROOT) ? fs.lstatSync(WORKSPACE_PROJECTS_ROOT) : null;
  if (!rootStat || !rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    return null;
  }
  const candidate = path.join(WORKSPACE_PROJECTS_ROOT, sessionId);
  if (!fs.existsSync(candidate)) {
    return null;
  }
  const candStat = fs.lstatSync(candidate);
  if (!candStat.isDirectory() || candStat.isSymbolicLink()) {
    return null;
  }
  const realRoot = fs.realpathSync(WORKSPACE_PROJECTS_ROOT);
  const realCandidate = fs.realpathSync(candidate);
  const rel = path.relative(realRoot, realCandidate);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  return realCandidate;
}

function copyProjectTreeSafely(srcRoot, destRoot) {
  const stats = { fileCount: 0, totalBytes: 0 };

  function walk(curSrc, curDest) {
    const entries = fs.readdirSync(curSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.includes('\0') || entry.name === '..' || entry.name === '.') {
        throw new Error(`Unsafe filename rejected: "${entry.name}"`);
      }
      const srcPath = path.join(curSrc, entry.name);
      const destPath = path.join(curDest, entry.name);
      const lstat = fs.lstatSync(srcPath);

      if (lstat.isSymbolicLink()) {
        throw new Error(`Symbolic link prohibited inside build workspace: "${entry.name}"`);
      }
      if (lstat.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        walk(srcPath, destPath);
      } else if (lstat.isFile()) {
        if (lstat.nlink > 1) {
          throw new Error(`Hardlink prohibited inside build workspace: "${entry.name}"`);
        }
        stats.fileCount += 1;
        if (stats.fileCount > MAX_COPY_FILES) {
          throw new Error(`File count limit (${MAX_COPY_FILES}) exceeded.`);
        }
        if (lstat.size > MAX_SINGLE_FILE_BYTES) {
          throw new Error(`Single file limit (${MAX_SINGLE_FILE_BYTES} bytes) exceeded: "${entry.name}"`);
        }
        stats.totalBytes += lstat.size;
        if (stats.totalBytes > MAX_TOTAL_BYTES) {
          throw new Error(`Total workspace limit (${MAX_TOTAL_BYTES} bytes) exceeded.`);
        }
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  fs.mkdirSync(destRoot, { recursive: true });
  walk(srcRoot, destRoot);
}

function probeReadiness() {
  try {
    const installed = execFileSync('elan', ['toolchain', 'list'], {
      timeout: 2500,
      encoding: 'utf-8',
    });
    const lakeVersion = execFileSync('lake', ['--version'], {
      timeout: 2500,
      encoding: 'utf-8',
    });
    const hasDefault = installed.includes(DEFAULT_TOOLCHAIN);
    return {
      ready: hasDefault && lakeVersion.trim().length > 0,
      smokeBuildPassed: hasDefault && lakeVersion.trim().length > 0,
      installedToolchains: installed.trim().split(/\r?\n/).filter(Boolean),
    };
  } catch (err) {
    return {
      ready: false,
      smokeBuildPassed: false,
      error: err instanceof Error ? err.message : String(err),
      installedToolchains: [],
    };
  }
}

function killProcessGroup(pid, signal) {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // process already exited
    }
  }
}

const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  if (method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  if (method === 'GET' && (url === '/readyz' || url === '/')) {
    const probe = probeReadiness();
    res.writeHead(probe.ready ? 200 : 503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: probe.ready ? 'ready' : 'not_ready',
      smokeBuildPassed: probe.smokeBuildPassed,
      toolchains: TOOLCHAINS,
      defaultToolchain: DEFAULT_TOOLCHAIN,
      ...(probe.error ? { error: probe.error } : {}),
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

      if (typeof data.projectPath === 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          error: 'Raw projectPath prohibited; supply UUID v4 sessionId only.',
          exitCode: 1,
        }));
      }

      const sourceDir = resolveSessionSourceDir(data.sessionId);
      if (!sourceDir) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          error: 'Invalid or missing UUID v4 sessionId under contained /workspace/projects root.',
          exitCode: 1,
        }));
      }

      let activeToolchain = DEFAULT_TOOLCHAIN;
      const toolchainFile = path.join(sourceDir, 'lean-toolchain');
      if (fs.existsSync(toolchainFile)) {
        const requested = fs.readFileSync(toolchainFile, 'utf-8').trim().replace(/^leanprover\/lean4:/, '');
        if (!TOOLCHAINS.includes(requested)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            error: `Toolchain "${requested}" not installed`,
            exitCode: 1,
            toolchains: TOOLCHAINS,
          }));
        }
        activeToolchain = requested;
      } else if (typeof data.toolchain === 'string' && data.toolchain.trim()) {
        const reqTc = data.toolchain.trim().replace(/^leanprover\/lean4:/, '');
        if (!TOOLCHAINS.includes(reqTc)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            error: `Toolchain "${reqTc}" not installed`,
            exitCode: 1,
            toolchains: TOOLCHAINS,
          }));
        }
        activeToolchain = reqTc;
      }

      const scratchDir = path.join(SCRATCH_JOBS_ROOT, `${data.sessionId}-${crypto.randomUUID()}`);
      try {
        copyProjectTreeSafely(sourceDir, scratchDir);
      } catch (copyErr) {
        fs.rmSync(scratchDir, { recursive: true, force: true });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          error: copyErr instanceof Error ? copyErr.message : String(copyErr),
          exitCode: 1,
        }));
      }

      const safeEnv = {
        PATH: process.env.PATH || '/root/.elan/bin:/usr/local/bin:/usr/bin:/bin',
        ELAN_HOME: process.env.ELAN_HOME || '/root/.elan',
        HOME: process.env.HOME || '/home/leanrunner',
        TMPDIR: process.env.TMPDIR || '/tmp',
      };

      const startTime = Date.now();
      const child = spawn('lake', ['build'], {
        cwd: scratchDir,
        env: safeEnv,
        detached: true,
      });

      let stdout = '';
      let stderr = '';
      let responded = false;
      let forceKillTimer = null;
      let childExited = false;

      const cleanupScratch = () => {
        try {
          fs.rmSync(scratchDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      };

      const terminateProcessGroup = () => {
        if (childExited) return;
        killProcessGroup(child.pid, 'SIGTERM');
        forceKillTimer = setTimeout(() => {
          if (!childExited) {
            killProcessGroup(child.pid, 'SIGKILL');
          }
        }, 2000);
        if (forceKillTimer.unref) forceKillTimer.unref();
      };

      const finish = (statusCode, payload) => {
        if (responded) return;
        responded = true;
        clearTimeout(killTimer);
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      const killTimer = setTimeout(() => {
        terminateProcessGroup();
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

      req.on('close', () => {
        if (!responded) {
          terminateProcessGroup();
        }
      });

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
        childExited = true;
        clearTimeout(forceKillTimer);
        cleanupScratch();
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
        childExited = true;
        clearTimeout(forceKillTimer);
        cleanupScratch();
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
  console.log(`Lean 4 Multi-Toolchain Lake Runner listening on port ${PORT} (auth fail-closed active)`);
});
