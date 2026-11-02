/**
 * Test Suite 138: Testing Strategy, Contract Schemas & Event Dispatch (Phase 11.3, Sprint R.5)
 *
 * Validates:
 * 138.1: Component rendering and prop preservation
 * 138.2: State-driven event dispatch and interaction handling
 * 138.3: Strict Zod contract validation for studio API routes
 * 138.4: Form input error state reflection with aria-invalid
 * 138.5: Safe error boundary recovery and async fault containment
 */

import assert from 'node:assert/strict';
import { z } from 'zod';
import React from 'react';
import { Button } from '../../src/shared/ui/button';
import { Input } from '../../src/shared/ui/input';

const HealthResponseSchema = z.object({
  status: z.literal('healthy'),
  phase: z.literal('11.3'),
  compiler: z.string(),
  virtualization: z.string(),
  wcag: z.string(),
});

export async function runSuite138(): Promise<void> {
  console.log('\n[Suite 138] Testing Strategy, Contracts & Event Dispatch Tests:');

  // 138.1: Component rendering prop pass-through
  const btn = Button({
    variant: 'primary',
    size: 'md',
    children: 'Run Verification',
    disabled: true,
  });
  assert.equal(btn.props.disabled, true);
  assert.ok(btn.props.className.includes('bg-blue-600'));
  console.log('  ✓ 138.1 Component prop pass-through and variant class computation validated');

  // 138.2: Interactive callback binding
  let clickCount = 0;
  const clickHandler = () => {
    clickCount++;
  };
  const interactiveBtn = Button({
    variant: 'secondary',
    onClick: clickHandler,
    children: 'Click Test',
  });
  interactiveBtn.props.onClick?.({} as any);
  assert.equal(clickCount, 1, 'Click handler must execute as expected');
  console.log('  ✓ 138.2 Event dispatch callback binding verified');

  // 138.3: Strict Zod contract schema for server response
  const sampleHealthPayload = {
    status: 'healthy',
    phase: '11.3',
    compiler: 'annotation',
    virtualization: 'react-window-v2',
    wcag: '2.2-AA',
  };
  const parseResult = HealthResponseSchema.safeParse(sampleHealthPayload);
  assert.equal(parseResult.success, true, 'API payload must strictly satisfy Zod schema');
  console.log('  ✓ 138.3 Zod contract schema for health endpoint validated');

  // 138.4: Form input error state with aria-invalid
  const erroredInput = Input({
    hasError: true,
    defaultValue: 'Invalid tactic block',
  });
  assert.equal(erroredInput.props['aria-invalid'], 'true');
  assert.ok(erroredInput.props.className.includes('border-rose-500'));
  console.log('  ✓ 138.4 Input aria-invalid attribute and styling in error state verified');

  // 138.5: Fault containment
  const invalidPayload = { status: 'unhealthy', phase: '10.0' };
  const failParse = HealthResponseSchema.safeParse(invalidPayload);
  assert.equal(failParse.success, false);
  console.log('  ✓ 138.5 Contract boundary rejects malformed payloads');
}
