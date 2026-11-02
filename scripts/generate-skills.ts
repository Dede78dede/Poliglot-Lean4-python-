/**
 * Generate Agent Skills Script (Phase 10.10, Task S2)
 *
 * Generates AAIF-compliant skills for Claude Code, Codex CLI, and Cursor.
 * Uses .polyglot-skills-manifest.json for idempotent tracking.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  skillBundleGenerator,
  type AgentSkillDefinition,
  type SkillTarget,
} from '../src/services/skills/skill-bundle-generator';

export const CANONICAL_SKILLS: readonly AgentSkillDefinition[] = [
  {
    name: 'polyglot-prove-theorem',
    description: 'Autoformalize and verify formal Lean 4 theorems with independent kernel cross-checks.',
    tools: [
      'polyglot_search_proof_library',
      'polyglot_get_proof_automation_status',
      'polyglot_verify_proof_kernel',
      'polyglot_propose_proof_patch',
    ],
    body: fs.readFileSync(path.resolve(process.cwd(), 'assets/skills/polyglot-prove-theorem.md'), 'utf-8'),
    version: '1.0.0',
  },
  {
    name: 'polyglot-import-paper',
    description: 'Ingest arXiv/LaTeX papers into formal Lean workspaces with span ledger alignment.',
    tools: [
      'polyglot_get_bibliography',
      'polyglot_get_project_manifest',
    ],
    body: fs.readFileSync(path.resolve(process.cwd(), 'assets/skills/polyglot-import-paper.md'), 'utf-8'),
    version: '1.0.0',
  },
  {
    name: 'polyglot-search-mathlib',
    description: 'Search Mathlib using semantic embeddings, token-bucket limits, and RRF rank fusion.',
    tools: [
      'polyglot_search_proof_library',
    ],
    body: fs.readFileSync(path.resolve(process.cwd(), 'assets/skills/polyglot-search-mathlib.md'), 'utf-8'),
    version: '1.0.0',
  },
  {
    name: 'polyglot-generate-blueprint',
    description: 'Generate dependency blueprints with topological sorting and sorry_using stubs.',
    tools: [
      'polyglot_get_femev_status',
    ],
    body: fs.readFileSync(path.resolve(process.cwd(), 'assets/skills/polyglot-generate-blueprint.md'), 'utf-8'),
    version: '1.0.0',
  },
  {
    name: 'polyglot-distribute-code',
    description: 'Package verified formal specifications and research artifacts for distribution.',
    tools: [
      'polyglot_verify_proof_kernel',
      'polyglot_get_context_keys',
      'polyglot_get_project_manifest',
    ],
    body: fs.readFileSync(path.resolve(process.cwd(), 'assets/skills/polyglot-distribute-code.md'), 'utf-8'),
    version: '1.0.0',
  },
  {
    name: 'polyglot-probe-tactic',
    description: 'Speculatively evaluate Lean 4 tactics without file mutation using the lean-beam MCP broker.',
    tools: [
      'polyglot_probe_tactic',
      'polyglot_get_proof_automation_status',
    ],
    body: fs.readFileSync(path.resolve(process.cwd(), 'assets/skills/polyglot-probe-tactic.md'), 'utf-8'),
    version: '1.0.0',
  },
];

export function generateAllSkills(outDir: string = process.cwd()): {
  readonly totalGenerated: number;
  readonly files: readonly string[];
  readonly manifestPath: string;
} {
  const generatedFiles: string[] = [];
  const targets: readonly SkillTarget[] = ['claude-code', 'codex-cli', 'cursor'];

  for (const skill of CANONICAL_SKILLS) {
    for (const target of targets) {
      const gen = skillBundleGenerator.generateForTarget(skill, target);
      const absPath = path.resolve(outDir, gen.relativePath);
      const parentDir = path.dirname(absPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(absPath, gen.content, 'utf-8');
      generatedFiles.push(gen.relativePath);
    }
  }

  // Write manifest
  const manifestPath = path.resolve(outDir, '.polyglot-skills-manifest.json');
  const manifestData = {
    generatedAt: new Date().toISOString(),
    standard: 'AAIF Agent Skills (agentskills.io)',
    skillCount: CANONICAL_SKILLS.length,
    skills: CANONICAL_SKILLS.map((s) => ({
      name: s.name,
      description: s.description,
      tools: s.tools,
    })),
    files: generatedFiles,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');

  return {
    totalGenerated: generatedFiles.length,
    files: generatedFiles,
    manifestPath: '.polyglot-skills-manifest.json',
  };
}

if (process.argv[1] && process.argv[1].endsWith('generate-skills.ts')) {
  const res = generateAllSkills();
  console.log(`Generated ${res.totalGenerated} skill files across 3 targets.`);
}
