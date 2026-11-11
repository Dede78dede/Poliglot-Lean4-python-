const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const TOOLCHAINS = ['v4.28.0', 'v4.31.0', 'v4.33.1', 'v4.35.0-rc4'];
const DEFAULT_TOOLCHAIN = 'v4.35.0-rc4';

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
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON', exitCode: 1 }));
      }

      const cwd = data.projectPath && fs.existsSync(data.projectPath)
        ? data.projectPath
        : process.cwd();

      const startTime = Date.now();
      const child = spawn('lake', ['build'], {
        cwd,
        env: process.env,
        timeout: 120000,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', d => { stdout += d.toString(); });
      child.stderr.on('data', d => { stderr += d.toString(); });

      child.on('error', err => {
        const durationMs = Date.now() - startTime;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          stdout,
          stderr: stderr ? `${stderr}\n${err.message}` : err.message,
          exitCode: 1,
          durationMs,
          toolchain: DEFAULT_TOOLCHAIN,
          toolchains: TOOLCHAINS,
        }));
      });

      child.on('close', code => {
        const durationMs = Date.now() - startTime;
        const exitCode = typeof code === 'number' ? code : 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: exitCode === 0 ? 'ok' : 'error',
          stdout,
          stderr,
          exitCode,
          durationMs,
          toolchain: DEFAULT_TOOLCHAIN,
          toolchains: TOOLCHAINS,
        }));
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
