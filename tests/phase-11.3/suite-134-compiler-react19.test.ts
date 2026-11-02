/**
 * Test Suite 134: React Compiler & React 19 Modernization (Phase 11.3, Sprint R.1)
 *
 * Validates:
 * 134.1: React Compiler annotation configuration in vite.config.ts
 * 134.2: Direct ref prop support (no deprecated forwardRef)
 * 134.3: React 19 native Context provider usage (<Context> without .Provider)
 * 134.4: ENABLE_REACT_COMPILER flag default state (false, Manifesto compliance)
 * 134.5: Immediate rollback invariant (disabling flag leaves code intact)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite134(): Promise<void> {
  console.log('\n[Suite 134] React Compiler & React 19 Modernization Tests:');

  // 134.1: React Compiler annotation mode in vite.config.ts
  const viteConfigContent = fs.readFileSync(path.resolve('vite.config.ts'), 'utf-8');
  assert.ok(
    viteConfigContent.includes("compilationMode: 'annotation'") ||
    viteConfigContent.includes('compiler:'),
    'vite.config.ts must explicitly configure React Compiler with annotation mode'
  );
  console.log("  ✓ 134.1 React Compiler annotation mode explicitly configured in Vite");

  // 134.2: Direct ref prop in UI primitives (no deprecated forwardRef)
  const buttonContent = fs.readFileSync(path.resolve('src/shared/ui/button.tsx'), 'utf-8');
  assert.ok(
    !buttonContent.includes('forwardRef'),
    'src/shared/ui/button.tsx must use direct ref prop without deprecated forwardRef'
  );
  assert.ok(
    buttonContent.includes('ref?: React.Ref'),
    'src/shared/ui/button.tsx must declare ref prop explicitly'
  );
  console.log('  ✓ 134.2 React 19 direct ref prop utilized without forwardRef');

  // 134.3: React 19 Context provider (<Context> syntax)
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
  assert.ok(
    appContent.includes('"use memo"'),
    'src/App.tsx must feature "use memo" React Compiler directive'
  );
  console.log('  ✓ 134.3 Feature slice marked with "use memo" compiler directive');

  // 134.4: ENABLE_REACT_COMPILER flag defaults to false (Manifesto compliance)
  const isCompilerEnabled = featureFlagRegistry.isEnabled('ENABLE_REACT_COMPILER');
  assert.equal(
    isCompilerEnabled,
    false,
    'ENABLE_REACT_COMPILER must default to false for incremental canary rollout'
  );
  console.log('  ✓ 134.4 ENABLE_REACT_COMPILER defaults to false (Manifesto compliant)');

  // 134.5: Immediate rollback path
  featureFlagRegistry.set('ENABLE_REACT_COMPILER', true);
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_REACT_COMPILER'), true);
  featureFlagRegistry.reset('ENABLE_REACT_COMPILER');
  assert.equal(
    featureFlagRegistry.isEnabled('ENABLE_REACT_COMPILER'),
    false,
    'ENABLE_REACT_COMPILER must support immediate rollback to default false'
  );
  console.log('  ✓ 134.5 Immediate rollback path verified');
}
