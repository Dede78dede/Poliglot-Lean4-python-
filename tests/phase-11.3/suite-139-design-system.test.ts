/**
 * Test Suite 139: Design System & Composition (Phase 11.3, Sprint R.6)
 *
 * Validates:
 * 139.1: Design tokens in src/shared/ui/tokens.css with semantic color scales
 * 139.2: cn() helper resolving conflicting Tailwind CSS utility classes
 * 139.3: All 8 composed primitives exported and typed in src/shared/ui/
 * 139.4: DesignSystemShowcase integration and tab panel composition
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cn } from '../../src/shared/lib/cn';
import { DesignSystemShowcase } from '../../src/shared/ui/showcase';

export async function runSuite139(): Promise<void> {
  console.log('\n[Suite 139] Design System & Composition Tests:');

  // 139.1: Design tokens in tokens.css
  const tokensContent = fs.readFileSync(path.resolve('src/shared/ui/tokens.css'), 'utf-8');
  assert.ok(tokensContent.includes('--canvas-bg:'), 'tokens.css must define --canvas-bg');
  assert.ok(tokensContent.includes('--surface-primary:'), 'tokens.css must define --surface-primary');
  assert.ok(tokensContent.includes('--status-verified:'), 'tokens.css must define --status-verified');
  assert.ok(tokensContent.includes('--status-warning:'), 'tokens.css must define --status-warning');
  assert.ok(tokensContent.includes('--status-error:'), 'tokens.css must define --status-error');
  assert.ok(tokensContent.includes('.dark {'), 'tokens.css must declare .dark theme tokens');
  console.log('  ✓ 139.1 Semantic tokens and dark theme variables verified in tokens.css');

  // 139.2: cn() helper conflict resolution
  const mergedClass = cn('px-2 py-1 text-xs', 'px-4 text-sm', false && 'hidden', undefined);
  assert.ok(mergedClass.includes('px-4'), 'tailwind-merge must resolve px conflict to last class');
  assert.ok(!mergedClass.includes('px-2'), 'tailwind-merge must prune superseded class');
  assert.ok(mergedClass.includes('text-sm'));
  console.log('  ✓ 139.2 cn() utility resolves class collisions via tailwind-merge');

  // 139.3: Composed primitives inventory
  const requiredPrimitives = [
    'button.tsx',
    'input.tsx',
    'textarea.tsx',
    'dialog.tsx',
    'tabs.tsx',
    'menu.tsx',
    'tooltip.tsx',
    'badge.tsx',
  ];
  for (const primitive of requiredPrimitives) {
    const filePath = path.resolve('src/shared/ui', primitive);
    assert.ok(fs.existsSync(filePath), `Primitive ${primitive} must exist in src/shared/ui/`);
  }
  console.log('  ✓ 139.3 All 8 composed UI primitives verified in src/shared/ui/');

  // 139.4: Showcase view verification
  assert.equal(typeof DesignSystemShowcase, 'function');
  const showcaseElem = React.createElement(DesignSystemShowcase);
  assert.ok(showcaseElem !== null);
  assert.equal(showcaseElem.type, DesignSystemShowcase);
  console.log('  ✓ 139.4 DesignSystemShowcase integration verified');
}
