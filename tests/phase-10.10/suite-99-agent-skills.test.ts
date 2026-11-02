/**
 * Test Suite 99: Agent Skills Bundle (Phase 10.10, Task S1 & S2)
 */

import assert from 'node:assert/strict';
import { skillBundleGenerator, type AgentSkillDefinition } from '../../src/services/skills/skill-bundle-generator';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite99(): Promise<void> {
  console.log('\n--- Test Suite 99: Agent Skills Bundle ---');

  const validSkill: AgentSkillDefinition = {
    name: 'polyglot-test-skill',
    description: 'A test skill for AAIF agent skills standard.',
    tools: ['polyglot_verify_proof_kernel'],
    body: '## Instructions\nCall the kernel verification tool.',
  };

  // 99.1: SkillBundleGenerator validates name length <= 64
  const longNameSkill: AgentSkillDefinition = {
    ...validSkill,
    name: 'a'.repeat(65),
  };
  assert.throws(
    () => skillBundleGenerator.validate(longNameSkill),
    (err: unknown) => err instanceof BridgeError && err.code === 'SKILL_NAME_TOO_LONG'
  );
  console.log('  ✓ 99.1 Skill name > 64 chars rejected with SKILL_NAME_TOO_LONG (422)');

  // 99.2: SkillBundleGenerator validates description length <= 1024
  const longDescSkill: AgentSkillDefinition = {
    ...validSkill,
    description: 'd'.repeat(1025),
  };
  assert.throws(
    () => skillBundleGenerator.validate(longDescSkill),
    (err: unknown) => err instanceof BridgeError && err.code === 'SKILL_DESCRIPTION_TOO_LONG'
  );
  console.log('  ✓ 99.2 Skill description > 1024 chars rejected with SKILL_DESCRIPTION_TOO_LONG (422)');

  // 99.3: SkillBundleGenerator validates body line count <= 500
  const longBodySkill: AgentSkillDefinition = {
    ...validSkill,
    body: 'line\n'.repeat(501),
  };
  assert.throws(
    () => skillBundleGenerator.validate(longBodySkill),
    (err: unknown) => err instanceof BridgeError && err.code === 'SKILL_BODY_TOO_LONG'
  );
  console.log('  ✓ 99.3 Skill body > 500 lines rejected with SKILL_BODY_TOO_LONG (422)');

  // 99.4: Generates Claude Code format (.claude/skills/<name>/SKILL.md)
  const claude = skillBundleGenerator.generateForTarget(validSkill, 'claude-code');
  assert.equal(claude.relativePath, '.claude/skills/polyglot-test-skill/SKILL.md');
  assert.ok(claude.content.startsWith('---\nname: polyglot-test-skill'));
  assert.ok(claude.content.includes('tools: ["polyglot_verify_proof_kernel"]'));
  console.log('  ✓ 99.4 Emits valid Claude Code format with YAML frontmatter');

  // 99.5: Generates Codex CLI format (.agents/skills/<name>/SKILL.md)
  const codex = skillBundleGenerator.generateForTarget(validSkill, 'codex-cli');
  assert.equal(codex.relativePath, '.agents/skills/polyglot-test-skill/SKILL.md');
  assert.ok(codex.content.startsWith('---\nname: polyglot-test-skill'));
  console.log('  ✓ 99.5 Emits valid Codex CLI format');

  // 99.6: Generates Cursor format (.cursor/rules/<name>.mdc) with frontmatter
  const cursor = skillBundleGenerator.generateForTarget(validSkill, 'cursor');
  assert.equal(cursor.relativePath, '.cursor/rules/polyglot-test-skill.mdc');
  assert.ok(cursor.content.includes('globs: *.lean,*.py,*.tex'));
  console.log('  ✓ 99.6 Emits valid Cursor rules format (.cursor/rules/<name>.mdc)');
}
