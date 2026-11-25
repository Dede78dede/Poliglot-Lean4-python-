/**
 * Zero-Skip Discipline Gate
 *
 * Scans TypeScript/TSX/Python test suites under tests/ and fails non-zero
 * if any skipped, todo, or focused (.only / xit / skipTest) tests exist.
 */

import fs from 'node:fs';
import path from 'node:path';

interface SkipViolation {
  file: string;
  line: number;
  pattern: string;
  snippet: string;
}

const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'vitest/jest .skip(', regex: /\b(?:describe|it|test|suite|context)\.skip\s*\(/ },
  { name: 'vitest/jest .todo(', regex: /\b(?:describe|it|test|suite|context)\.todo\s*\(/ },
  { name: 'vitest/jest .only(', regex: /\b(?:describe|it|test|suite|context)\.only\s*\(/ },
  { name: 'legacy xit/xdescribe/xtest', regex: /\b(?:xit|xdescribe|xtest)\s*\(/ },
  { name: 'unittest skipTest(', regex: /\.skipTest\s*\(/ },
  { name: 'pytest.mark.skip', regex: /@pytest\.mark\.skip(?:if)?\b/ },
  { name: 'unittest.skip', regex: /@unittest\.skip(?:If|Unless)?\b/ },
];

function collectTestFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '__pycache__' || entry.name === 'dist') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(full));
    } else if (
      entry.isFile() &&
      (/\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(entry.name) ||
        /^test_.*\.py$/.test(entry.name))
    ) {
      files.push(full);
    }
  }
  return files;
}

function scanForSkips(rootDir: string): SkipViolation[] {
  const testFiles = [
    ...collectTestFiles(path.join(rootDir, 'tests')),
    path.join(rootDir, 'scripts/verify-python-contracts.py'),
  ].filter((f) => fs.existsSync(f));

  const violations: SkipViolation[] = [];
  for (const file of testFiles) {
    const rel = path.relative(rootDir, file);
    // suite-177 checks for forbidden mocks/skips via literal strings if any; inspect lines cleanly
    const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
        continue;
      }
      for (const pat of FORBIDDEN_PATTERNS) {
        if (pat.regex.test(line)) {
          violations.push({
            file: rel,
            line: idx + 1,
            pattern: pat.name,
            snippet: trimmed.slice(0, 120),
          });
        }
      }
    }
  }
  return violations;
}

function main(): void {
  const rootDir = process.cwd();
  const violations = scanForSkips(rootDir);
  if (violations.length > 0) {
    console.error(`❌ Zero-skip policy violated (${violations.length} finding(s)):`);
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} [${v.pattern}] ${v.snippet}`);
    }
    process.exit(1);
  }
  console.log('✓ Zero-skip policy passed: 0 skipped, todo, or focused tests detected.');
}

main();
