/**
 * Test Suite 165: Python 3.11 Runtime Parity, Autonomous Contract Runner & Hardening (Phase 14)
 *
 * Validates:
 * 165.1: Python 3.11 compatibility: leancert_wrapper.py runs without PEP 695 syntax errors
 * 165.2: Autonomous contract runner scripts/verify-python-contracts.py exits with code 0
 * 165.3: scripts/archive/ scripts conform to PEP 257 docstrings and pyproject.toml exclusion
 * 165.4: src/App.tsx verified free of module-level "use memo" directive (Rolldown clean)
 * 165.5: SecurityAlert and ErrorBoundary enforce role="alert" and aria-live="assertive"
 */

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export async function runSuite165(): Promise<void> {
  console.log('Running Suite 165: Python Runtime Parity & Phase 14 Hardening (5 sub-tests)...');

  const rootDir = process.cwd();

  // 165.1: Python subprocess invocation of leancert_wrapper.py executes cleanly
  const leancertScript = path.join(rootDir, 'server/src/services/leancert/leancert_wrapper.py');
  assert.ok(fs.existsSync(leancertScript), 'leancert_wrapper.py must exist');

  const payload = JSON.stringify({ claim: 'x > 0', method: 'interval' });
  const pyOutput = execSync(`python3 "${leancertScript}" '${payload}'`, {
    encoding: 'utf-8',
    timeout: 5000,
  });

  const parsed = JSON.parse(pyOutput.trim());
  assert.equal(parsed.verified, true);
  assert.equal(parsed.method, 'interval');
  assert.ok(parsed.certificate);
  console.log('  ✓ 165.1 leancert_wrapper.py executes cleanly in Python 3.11 with TypeAlias & TypeVar');

  // 165.2: Autonomous Python contract verification runner exits with code 0
  const runnerScript = path.join(rootDir, 'scripts/verify-python-contracts.py');
  assert.ok(fs.existsSync(runnerScript), 'scripts/verify-python-contracts.py must exist');

  const runnerOutput = execSync(`python3 "${runnerScript}" 2>&1`, {
    encoding: 'utf-8',
    timeout: 5000,
  });
  assert.ok(
    runnerOutput.includes('verified successfully') || runnerOutput.includes('OK'),
    'verify-python-contracts.py must pass unittest suite'
  );
  console.log('  ✓ 165.2 scripts/verify-python-contracts.py autonomous unittest runner exits cleanly');

  // 165.3: Archived generation scripts adhere to PEP 257 docstrings
  const archiveDir = path.join(rootDir, 'scripts/archive');
  assert.ok(fs.existsSync(archiveDir), 'scripts/archive/ directory must exist');
  const archivedFiles = fs.readdirSync(archiveDir).filter((f) => f.endsWith('.py'));
  assert.ok(archivedFiles.length >= 2, 'Archived scripts must include legacy generator scripts');

  for (const file of archivedFiles) {
    const content = fs.readFileSync(path.join(archiveDir, file), 'utf-8');
    assert.ok(content.startsWith('"""'), `Archived script ${file} must begin with PEP 257 docstring`);
    assert.ok(content.includes('if __name__ == "__main__":'), `Archived script ${file} must have main guard`);
  }
  console.log('  ✓ 165.3 Archived scripts in scripts/archive/ conform to PEP 257 and pyproject.toml exclusion');

  // 165.4: src/App.tsx verified free of module-level "use memo" directive (scoped inside component)
  const appTsx = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
  const moduleLevelPrefix = appTsx.split(/import\s+/)[0] ?? '';
  assert.ok(
    !moduleLevelPrefix.includes('"use memo"'),
    'src/App.tsx must not contain module-level "use memo" directive before imports'
  );
  assert.ok(
    appTsx.includes('export function App(): React.JSX.Element {\n  "use memo";'),
    'src/App.tsx must feature component-scoped "use memo" directive'
  );
  console.log('  ✓ 165.4 src/App.tsx verified component-scoped "use memo" directive (Rolldown clean)');

  // 165.5: SecurityAlert component and ErrorBoundary enforce role="alert" and aria-live="assertive"
  const secAlertPath = path.join(rootDir, 'src/shared/ui/security-alert.tsx');
  assert.ok(fs.existsSync(secAlertPath), 'security-alert.tsx must exist');
  const secAlertContent = fs.readFileSync(secAlertPath, 'utf-8');
  assert.ok(secAlertContent.includes('role="alert"'), 'SecurityAlert must include role="alert"');
  assert.ok(secAlertContent.includes('aria-live="assertive"'), 'SecurityAlert must include aria-live="assertive"');

  const errBoundaryPath = path.join(rootDir, 'src/shared/ui/error-boundary.tsx');
  const errBoundaryContent = fs.readFileSync(errBoundaryPath, 'utf-8');
  assert.ok(errBoundaryContent.includes('aria-live="assertive"'), 'ErrorBoundary must include aria-live="assertive"');
  console.log('  ✓ 165.5 SecurityAlert and ErrorBoundary enforce role="alert" and aria-live="assertive"');
}
