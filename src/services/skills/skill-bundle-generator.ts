/**
 * Agent Skills Bundle Generator (Phase 10.10, Task S1)
 *
 * Adheres to AAIF Agent Skills standard (agentskills.io).
 * Emits skills for:
 * - claude-code: .claude/skills/<name>/SKILL.md
 * - codex-cli: .agents/skills/<name>/SKILL.md
 * - cursor: .cursor/rules/<name>.mdc
 *
 * Enforces strict limits:
 * - name <= 64 chars (SKILL_NAME_TOO_LONG)
 * - description <= 1024 chars (SKILL_DESCRIPTION_TOO_LONG)
 * - body <= 500 lines (SKILL_BODY_TOO_LONG)
 */

import { BridgeError } from '../errors/bridge-error';

export type SkillTarget = 'claude-code' | 'codex-cli' | 'cursor';

export interface AgentSkillDefinition {
  readonly name: string;
  readonly description: string;
  readonly tools: readonly string[];
  readonly body: string;
  readonly version?: string;
}

export interface GeneratedSkillFile {
  readonly target: SkillTarget;
  readonly relativePath: string;
  readonly content: string;
}

export class SkillBundleGenerator {
  public validate(skill: AgentSkillDefinition): void {
    if (skill.name.length > 64) {
      throw new BridgeError(
        'SKILL_NAME_TOO_LONG',
        `skill-val-${Date.now()}`,
        { name: skill.name, length: skill.name.length, max: 64 }
      );
    }

    if (skill.description.length > 1024) {
      throw new BridgeError(
        'SKILL_DESCRIPTION_TOO_LONG',
        `skill-val-${Date.now()}`,
        { name: skill.name, length: skill.description.length, max: 1024 }
      );
    }

    const lines = skill.body.split('\n');
    if (lines.length > 500) {
      throw new BridgeError(
        'SKILL_BODY_TOO_LONG',
        `skill-val-${Date.now()}`,
        { name: skill.name, lineCount: lines.length, max: 500 }
      );
    }
  }

  public generateForTarget(skill: AgentSkillDefinition, target: SkillTarget): GeneratedSkillFile {
    this.validate(skill);

    switch (target) {
      case 'claude-code': {
        const frontmatter = [
          '---',
          `name: ${skill.name}`,
          `description: ${JSON.stringify(skill.description)}`,
          `tools: [${skill.tools.map((t) => JSON.stringify(t)).join(', ')}]`,
          `version: ${skill.version ?? '1.0.0'}`,
          '---',
          '',
          skill.body.trim(),
          '',
        ].join('\n');

        return {
          target: 'claude-code',
          relativePath: `.claude/skills/${skill.name}/SKILL.md`,
          content: frontmatter,
        };
      }

      case 'codex-cli': {
        const frontmatter = [
          '---',
          `name: ${skill.name}`,
          `description: ${JSON.stringify(skill.description)}`,
          `tools: [${skill.tools.map((t) => JSON.stringify(t)).join(', ')}]`,
          '---',
          '',
          skill.body.trim(),
          '',
        ].join('\n');

        return {
          target: 'codex-cli',
          relativePath: `.agents/skills/${skill.name}/SKILL.md`,
          content: frontmatter,
        };
      }

      case 'cursor': {
        const frontmatter = [
          '---',
          `description: ${skill.description}`,
          `globs: *.lean,*.py,*.tex`,
          'alwaysApply: false',
          '---',
          '',
          `# ${skill.name}`,
          '',
          skill.body.trim(),
          '',
        ].join('\n');

        return {
          target: 'cursor',
          relativePath: `.cursor/rules/${skill.name}.mdc`,
          content: frontmatter,
        };
      }
    }
  }

  public generateAllTargets(skill: AgentSkillDefinition): readonly GeneratedSkillFile[] {
    return [
      this.generateForTarget(skill, 'claude-code'),
      this.generateForTarget(skill, 'codex-cli'),
      this.generateForTarget(skill, 'cursor'),
    ];
  }
}

export const skillBundleGenerator = new SkillBundleGenerator();
