/**
 * Test Suite 113: Documentation & Verification Dates (Sprint 11.0.2, Task G2)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function runSuite113(): Promise<void> {
  console.log('\n--- Test Suite 113: Phase 11.0.2 Documentation & Verification Dates ---');

  const root = process.cwd();

  // 113.1: docs/how-to/use-llm-chat.md, use-settings.md, use-automations.md exist
  const chatDocPath = path.resolve(root, 'docs/how-to/use-llm-chat.md');
  const settingsDocPath = path.resolve(root, 'docs/how-to/use-settings.md');
  const automationsDocPath = path.resolve(root, 'docs/how-to/use-automations.md');

  assert.ok(fs.existsSync(chatDocPath), 'docs/how-to/use-llm-chat.md must exist');
  assert.ok(fs.existsSync(settingsDocPath), 'docs/how-to/use-settings.md must exist');
  assert.ok(fs.existsSync(automationsDocPath), 'docs/how-to/use-automations.md must exist');
  console.log('  ✓ 113.1 How-to docs for chat, settings, and automations exist');

  // 113.2: docs/architecture/chat-settings-automation.md exists
  const archDocPath = path.resolve(root, 'docs/architecture/chat-settings-automation.md');
  assert.ok(fs.existsSync(archDocPath), 'docs/architecture/chat-settings-automation.md must exist');
  const archContent = fs.readFileSync(archDocPath, 'utf8');
  assert.ok(archContent.includes('ChatStore'), 'Architecture doc must cover chat architecture');
  assert.ok(archContent.includes('SettingsStore'), 'Architecture doc must cover settings architecture');
  assert.ok(archContent.includes('Scheduled Workflows') || archContent.includes('Scheduled maintenance'), 'Architecture doc must cover automations');
  console.log('  ✓ 113.2 Architecture doc chat-settings-automation.md exists and covers core systems');

  // 113.3: Each doc has a "Last verified" date (2026-10-29)
  const docsToCheck = [
    chatDocPath,
    settingsDocPath,
    automationsDocPath,
    archDocPath,
  ];

  for (const docFile of docsToCheck) {
    const content = fs.readFileSync(docFile, 'utf8');
    assert.ok(
      content.includes('Last verified: 2026-10-29') || content.includes('Last verified**: 2026-10-29'),
      `${path.basename(docFile)} must contain 'Last verified: 2026-10-29'`,
    );
  }
  console.log('  ✓ 113.3 All Phase 11.0.2 docs verified with date 2026-10-29');
}
