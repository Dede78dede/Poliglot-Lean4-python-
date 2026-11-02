/**
 * Test Suite 118: Agent Skills Bundle (Phase 11.1, Task S4)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generateAllSkills, CANONICAL_SKILLS } from '../../scripts/generate-skills';

export async function runSuite118(): Promise<void> {
  console.log('\n--- Test Suite 118: Agent Skills Bundle ---');

  // 118.1: SKILL.md passes AAIF validator
  const skillPath = path.resolve(process.cwd(), 'assets/skills/polyglot-probe-tactic/SKILL.md');
  assert.ok(fs.existsSync(skillPath), 'assets/skills/polyglot-probe-tactic/SKILL.md must exist');
  const skillContent = fs.readFileSync(skillPath, 'utf-8');

  const lines = skillContent.split('\n');
  assert.ok(lines.length <= 500, `Skill body must be <= 500 lines, got ${lines.length}`);

  const probeDef = CANONICAL_SKILLS.find((s) => s.name === 'polyglot-probe-tactic');
  assert.ok(probeDef, 'polyglot-probe-tactic must be in CANONICAL_SKILLS');
  assert.ok(probeDef.name.length <= 64, 'Skill name must be <= 64 chars');
  assert.ok(probeDef.description.length <= 1024, 'Skill description must be <= 1024 chars');
  console.log('  ✓ 118.1 polyglot-probe-tactic satisfies AAIF schema bounds (name, desc, lines)');

  // 118.2: Generator emits to 3 targets (Claude Code, Codex CLI, Cursor)
  const res = generateAllSkills();
  assert.ok(res.totalGenerated >= 18, `Expected at least 18 generated skill files (6 skills * 3 targets), got ${res.totalGenerated}`);

  const claudeFile = path.resolve(process.cwd(), '.claude/skills/polyglot-probe-tactic/SKILL.md');
  const codexFile = path.resolve(process.cwd(), '.agents/skills/polyglot-probe-tactic/SKILL.md');
  const cursorFile = path.resolve(process.cwd(), '.cursor/rules/polyglot-probe-tactic.mdc');

  assert.ok(fs.existsSync(claudeFile), 'Claude Code target must exist');
  assert.ok(fs.existsSync(codexFile), 'Codex CLI target must exist');
  assert.ok(fs.existsSync(cursorFile), 'Cursor rules target must exist');
  console.log('  ✓ 118.2 Generator emits polyglot-probe-tactic across all 3 targets');

  // 118.3: Idempotent regeneration produces identical hash / file structure
  const res2 = generateAllSkills();
  assert.equal(res.totalGenerated, res2.totalGenerated);
  assert.deepEqual(res.files, res2.files);
  console.log('  ✓ 118.3 Skill generation is fully idempotent');

  // 118.4: npx add-skill documented in docs/how-to/use-lean-beam.md
  const docPath = path.resolve(process.cwd(), 'docs/how-to/use-lean-beam.md');
  assert.ok(fs.existsSync(docPath), 'docs/how-to/use-lean-beam.md must exist');
  const docContent = fs.readFileSync(docPath, 'utf-8');
  assert.ok(docContent.includes('npx add-skill ejgallego/lean-beam'), 'Doc must document npx add-skill command');
  assert.ok(docContent.includes('rocq-beam'), 'Doc must mention rocq-beam scope status');
  console.log('  ✓ 118.4 npx add-skill ejgallego/lean-beam and rocq-beam scope documented');

  // 118.5: Skill-Backed Verification for explain, refactor, test
  const skillNames = ['polyglot-explain', 'polyglot-refactor', 'polyglot-test'] as const;
  for (const name of skillNames) {
    const skillPath = path.resolve(process.cwd(), `assets/skills/${name}.md`);
    assert.ok(fs.existsSync(skillPath), `${name}.md must exist in assets/skills/`);
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('## Prerequisites'), `${name} must define Prerequisites`);
    assert.ok(content.includes('## Steps'), `${name} must define Steps`);
    assert.ok(content.includes('## Failure Modes'), `${name} must define Failure Modes`);
    assert.ok(
      content.includes('DIRECT_LLM_FALLBACK') || content.includes('direct LLM call'),
      `${name} must specify fallback behavior`
    );
  }

  const chatDocPath = path.resolve(process.cwd(), 'docs/how-to/use-llm-chat.md');
  assert.ok(fs.existsSync(chatDocPath), 'docs/how-to/use-llm-chat.md must exist');
  const chatDoc = fs.readFileSync(chatDocPath, 'utf-8');
  assert.ok(chatDoc.includes('direct LLM call'), 'use-llm-chat.md must document direct LLM call fallback');
  assert.ok(chatDoc.includes('Skill-Backed Verification'), 'use-llm-chat.md must document Skill-Backed Verification');
  console.log('  ✓ 118.5 Skill-Backed Verification confirmed (prerequisites, steps, failure modes, direct LLM call fallback)');
}
