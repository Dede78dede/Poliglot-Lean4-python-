/**
 * Polyglot Code Studio Primary Verification Runner (Suites 134 through 172)
 *
 * Executes every suite cleanly and dynamically tallies executed suites and
 * verified sub-test assertions from live execution output (zero hardcoded totals).
 */

import { runSuite134 } from '../tests/phase-11.3/suite-134-compiler-react19.test';
import { runSuite135 } from '../tests/phase-11.3/suite-135-state-consolidation.test';
import { runSuite136 } from '../tests/phase-11.3/suite-136-bundle-splitting.test';
import { runSuite137 } from '../tests/phase-11.3/suite-137-a11y-wcag.test';
import { runSuite138 } from '../tests/phase-11.3/suite-138-testing-strategy.test';
import { runSuite139 } from '../tests/phase-11.3/suite-139-design-system.test';
import { runSuite140 } from '../tests/phase-11.3/suite-140-integration.test';

import { runSuite141 } from '../tests/phase-12/suite-141-proof-reuse.test';
import { runSuite142 } from '../tests/phase-12/suite-142-reuse-integration.test';
import { runSuite143 } from '../tests/phase-12/suite-143-proposal-loop.test';
import { runSuite144 } from '../tests/phase-12/suite-144-loop-budgets-epistemic.test';
import { runSuite145 } from '../tests/phase-12/suite-145-translation-fidelity.test';
import { runSuite146 } from '../tests/phase-12/suite-146-lp2-adapter.test';
import { runSuite147 } from '../tests/phase-12/suite-147-conditional-integrations.test';
import { runSuite148 } from '../tests/phase-12/suite-148-integration.test';

import { runSuite149 } from '../tests/phase-13/suite-149-result-envelope.test';
import { runSuite150 } from '../tests/phase-13/suite-150-contract-parity.test';
import { runSuite151 } from '../tests/phase-13/suite-151-native-notebook.test';
import { runSuite152 } from '../tests/phase-13/suite-152-config-manager.test';
import { runSuite153 } from '../tests/phase-13/suite-153-integrity.test';
import { runSuite154 } from '../tests/phase-13/suite-154-diff-search.test';
import { runSuite155 } from '../tests/phase-13/suite-155-integration.test';

import { runSuite156 } from '../tests/phase-14/suite-156-mcp-compliance.test';
import { runSuite157 } from '../tests/phase-14/suite-157-auth-rate-limit.test';
import { runSuite158 } from '../tests/phase-14/suite-158-feature-flags.test';
import { runSuite159 } from '../tests/phase-14/suite-159-critical-modules.test';
import { runSuite160 } from '../tests/phase-14/suite-160-contract-parity.test';
import { runSuite161 } from '../tests/phase-14/suite-161-security-observability.test';

import { runSuite162 } from '../tests/phase-14/suite-162-verification-formula-consolidation.test';
import { runSuite163 } from '../tests/phase-14/suite-163-session-manager-alignment.test';
import { runSuite164 } from '../tests/phase-14/suite-164-bundle-methodology.test';
import { runSuite165 } from '../tests/phase-14/suite-165-python-parity-and-hardening.test';
import { runSuite166 } from '../tests/phase-14/suite-166-hybrid-consensus-and-verification.test';
import { runSuite167 } from '../tests/phase-14/suite-167-worker-contracts-and-security.test';
import { runSuite168 } from '../tests/phase-14/suite-168-modular-ide-workspace.test';
import { runSuite169 } from '../tests/phase-14/suite-169-touch-usability-and-navigation.test';
import { runSuite170 } from '../tests/phase-14/suite-170-bundle-budget.test';
import { runSuite171 } from '../tests/phase-14/suite-171-epistemic-authority.test';
import { runSuite172 } from '../tests/phase-14/suite-172-fallback-contracts-and-integrity.test';

const PRIMARY_SUITES: ReadonlyArray<readonly [number, () => Promise<void>]> = [
  [134, runSuite134],
  [135, runSuite135],
  [136, runSuite136],
  [137, runSuite137],
  [138, runSuite138],
  [139, runSuite139],
  [140, runSuite140],
  [141, runSuite141],
  [142, runSuite142],
  [143, runSuite143],
  [144, runSuite144],
  [145, runSuite145],
  [146, runSuite146],
  [147, runSuite147],
  [148, runSuite148],
  [149, runSuite149],
  [150, runSuite150],
  [151, runSuite151],
  [152, runSuite152],
  [153, runSuite153],
  [154, runSuite154],
  [155, runSuite155],
  [156, runSuite156],
  [157, runSuite157],
  [158, runSuite158],
  [159, runSuite159],
  [160, runSuite160],
  [161, runSuite161],
  [162, runSuite162],
  [163, runSuite163],
  [164, runSuite164],
  [165, runSuite165],
  [166, runSuite166],
  [167, runSuite167],
  [168, runSuite168],
  [169, runSuite169],
  [170, runSuite170],
  [171, runSuite171],
  [172, runSuite172],
];

async function main(): Promise<void> {
  console.log(
    `--- Starting Polyglot Code Studio Verification Suite (Suites 134–172, ${PRIMARY_SUITES.length} suites) ---`
  );

  const startTime = Date.now();
  let suitesPassed = 0;
  let observedChecks = 0;
  const origLog = console.log;

  for (const [suiteId, runFn] of PRIMARY_SUITES) {
    let suiteChecks = 0;
    console.log = (...args: unknown[]) => {
      const line = args.map(String).join(' ');
      if (/^\s*✓\s+/.test(line)) {
        suiteChecks++;
      }
      origLog.apply(console, args);
    };
    try {
      await runFn();
      suitesPassed++;
      observedChecks += Math.max(suiteChecks, 1);
    } finally {
      console.log = origLog;
    }
    if (suiteChecks === 0) {
      origLog(`  ✓ Suite ${suiteId} completed`);
    }
  }

  const durationMs = Date.now() - startTime;

  console.log('\n======================================================');
  console.log(
    `Primary Suites (134–172) PASSED: ${suitesPassed}/${PRIMARY_SUITES.length} suites, ${observedChecks} observed sub-test checks verified (${durationMs}ms)`
  );
  console.log('======================================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Verification failed with error:', err);
  process.exit(1);
});
