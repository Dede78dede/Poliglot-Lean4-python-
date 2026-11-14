/**
 * Repository Secret & Credential Leak Scanner (Phase 15 Hardening)
 *
 * Scans source, configuration, scripts, and CI files for accidentally committed
 * private keys, API keys, bearer secrets, or unmasked credentials.
 * Exits with code 1 if any secret leak is detected.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface SecretFinding {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly snippet: string;
}

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.codeindex',
  '.ogrep',
  'coverage',
  '.venv',
  'venv',
  '__pycache__',
  '.collab',
  '.collab-workspace',
]);

const SKIP_FILES = new Set([
  'data/tokens.json',
  'package-lock.json',
  'sbom.cdx.json',
  'sbom.spdx.json',
]);

const SKIP_PATH_PREFIXES = [
  'public/assets/aistudio/',
  'reports/',
  'docs/',
];

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.sh',
  '.py',
  '.env',
  '.example',
  '.toml',
]);

const PLACEHOLDER_RE =
  /your[-_]?|example|placeholder|dummy|mock|test[-_]|fake[-_]|redacted|changeme|change[-_]me|<[^>]+>|\$\{\{?\s*[A-Z0-9_.]+\s*\}?\}|process\.env\.|import\.meta\.env\./i;

interface SecretRule {
  readonly name: string;
  readonly regex: RegExp;
  readonly skipInTests?: boolean;
}

const SECRET_RULES: readonly SecretRule[] = [
  {
    name: 'Private Key Material (PEM)',
    regex: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PGP|ENCRYPTED\s+)?PRIVATE\s+KEY-----/,
  },
  {
    name: 'AWS Access Key ID',
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'Google / Gemini API Key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: 'GitHub Token',
    regex: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/,
  },
  {
    name: 'Slack Token',
    regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
  },
  {
    name: 'Live Secret Key Prefix',
    regex: /\b(?:sk_live|rk_live|sq0csp)-[0-9A-Za-z_-]{16,}\b/,
  },
  {
    name: 'Hardcoded High-Entropy Bearer / Secret Literal',
    regex: /(?:BEARER_TOKEN|POLYGLOT_TEST_SECRET|JWT_SECRET|API_SECRET|CLIENT_SECRET)\s*[:=]\s*['"]([A-Za-z0-9+/=_-]{24,})['"]/,
    skipInTests: true,
  },
];

function collectFiles(rootDir: string, currentDir = rootDir, acc: string[] = []): string[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (SKIP_PATH_PREFIXES.some((prefix) => `${relPath}/`.startsWith(prefix))) {
        continue;
      }
      collectFiles(rootDir, fullPath, acc);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(relPath)) continue;
      if (SKIP_PATH_PREFIXES.some((prefix) => relPath.startsWith(prefix))) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext) || entry.name.startsWith('.env')) {
        acc.push(fullPath);
      }
    }
  }
  return acc;
}

export function scanSecrets(rootDir = process.cwd()): {
  scannedFiles: number;
  findings: SecretFinding[];
} {
  const files = collectFiles(rootDir);
  const findings: SecretFinding[] = [];

  for (const filePath of files) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const isTestFile = relPath.startsWith('tests/');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    for (let idx = 0; idx < lines.length; idx++) {
      const lineText = lines[idx];
      for (const rule of SECRET_RULES) {
        if (rule.skipInTests && isTestFile) continue;
        const match = rule.regex.exec(lineText);
        if (!match) continue;
        const matchedValue = match[1] ?? match[0];
        if (PLACEHOLDER_RE.test(lineText) || PLACEHOLDER_RE.test(matchedValue)) {
          continue;
        }
        findings.push({
          file: relPath,
          line: idx + 1,
          rule: rule.name,
          snippet: lineText.trim().slice(0, 80),
        });
      }
    }
  }

  return { scannedFiles: files.length, findings };
}

if (process.argv[1]?.endsWith('scan-secrets.ts')) {
  const { scannedFiles, findings } = scanSecrets(process.cwd());
  if (findings.length > 0) {
    console.error(`❌ Secret scan detected ${findings.length} potential leak(s) across ${scannedFiles} files:`);
    for (const f of findings) {
      console.error(`  - ${f.file}:${f.line} [${f.rule}]`);
    }
    process.exit(1);
  }
  console.log(`✅ Secret scan passed: 0 leaks detected across ${scannedFiles} tracked files.`);
  process.exit(0);
}
