/**
 * LSpec GitHub Action CI Template Generator (Phase 10.9.7, Task LC1)
 *
 * Implements Reservoir 2026-10-07 official mechanism:
 * - Generates .github/workflows/lspec.yml
 * - Configures actions/checkout, leanprover/lean-action@v1 with target Lean toolchain
 * - Configures lake build and lake exe lspec
 * - Validates generated YAML syntax
 * - Emits warnings if LSpec is not declared in lakefile.toml/lakefile.lean
 * - Throws BridgeError(LSPEC_CI_TEMPLATE_FAILED) if lean-toolchain is missing
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BridgeError } from '../errors/bridge-error';
import { createLogger, StructuredLogger } from '../logging/logger';
import { featureFlagRegistry } from '../flags/feature-flag-registry';

export interface LSpecCiTemplateOptions {
  readonly projectName: string;          // e.g., "my-lean-project"
  readonly branch?: string;              // default "main"
  readonly leanVersion?: string;         // default read from lean-toolchain
  readonly includeCache?: boolean;       // default true
  readonly correlationId?: string;
}

export interface LSpecCiTemplateResult {
  readonly fileName: string;             // ".github/workflows/lspec.yml"
  readonly content: string;              // full YAML
  readonly warnings: readonly string[];  // e.g., "LSpec not found in lakefile.toml"
}

/**
 * Validates basic YAML structure without external dependencies
 */
export function validateYamlSyntax(yaml: string): { valid: boolean; error?: string } {
  if (!yaml || typeof yaml !== 'string') {
    return { valid: false, error: 'Empty YAML content' };
  }

  const lines = yaml.split('\n');
  let inBlockScalar = false;
  let blockScalarIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines and comment lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const indent = rawLine.search(/\S/);

    if (inBlockScalar) {
      if (indent > blockScalarIndent) {
        continue;
      } else {
        inBlockScalar = false;
      }
    }

    if (trimmed.endsWith('|') || trimmed.endsWith('|-') || trimmed.endsWith('>')) {
      inBlockScalar = true;
      blockScalarIndent = indent;
      continue;
    }

    // Check basic YAML key-value colon syntax or list item
    const isListItem = trimmed.startsWith('-');
    const hasColon = trimmed.includes(':');

    if (!isListItem && !hasColon) {
      return {
        valid: false,
        error: `Syntax error at line ${i + 1}: expected key-value pair or list item: "${trimmed}"`,
      };
    }
  }

  return { valid: true };
}

export class LSpecCiTemplateGenerator {
  private readonly logger = createLogger('LSpecCiTemplateGenerator');

  /**
   * Generates a GitHub Actions workflow YAML for running LSpec test suites in CI.
   */
  public async generateTemplate(
    projectPath: string,
    options: LSpecCiTemplateOptions
  ): Promise<LSpecCiTemplateResult> {
    const correlationId = options.correlationId ?? StructuredLogger.generateCorrelationId();
    this.logger.info(`Generating LSpec CI template for project ${options.projectName}`, correlationId);

    const warnings: string[] = [];

    // 1. Resolve Lean toolchain version
    let resolvedLeanVersion = options.leanVersion;

    if (!resolvedLeanVersion) {
      const toolchainPath = path.join(projectPath, 'lean-toolchain');
      if (fs.existsSync(toolchainPath)) {
        try {
          const raw = fs.readFileSync(toolchainPath, 'utf8').trim();
          // e.g. "leanprover/lean4:v4.35.0" -> "v4.35.0"
          resolvedLeanVersion = raw.replace(/^leanprover\/lean4:/, '');
        } catch {
          // Ignore and continue check below
        }
      }
    }

    // If still missing, throw LSPEC_CI_TEMPLATE_FAILED
    if (!resolvedLeanVersion) {
      this.logger.error('No lean-toolchain file found and leanVersion not specified', correlationId);
      throw new BridgeError('LSPEC_CI_TEMPLATE_FAILED', correlationId, {
        projectPath,
        reason: 'Missing lean-toolchain: could not resolve Lean version for GitHub Action.',
      });
    }

    // 2. Check if LSpec dependency is declared in lakefile.toml / lakefile.lean
    const lakefileTomlPath = path.join(projectPath, 'lakefile.toml');
    const lakefileLeanPath = path.join(projectPath, 'lakefile.lean');
    let hasLSpecDep = false;

    if (fs.existsSync(lakefileTomlPath)) {
      try {
        const tomlContent = fs.readFileSync(lakefileTomlPath, 'utf8');
        hasLSpecDep = tomlContent.toLowerCase().includes('lspec');
      } catch {
        // ignore
      }
    } else if (fs.existsSync(lakefileLeanPath)) {
      try {
        const leanContent = fs.readFileSync(lakefileLeanPath, 'utf8');
        hasLSpecDep = leanContent.toLowerCase().includes('lspec');
      } catch {
        // ignore
      }
    }

    if (!hasLSpecDep) {
      warnings.push('LSpec not found in lakefile.toml');
      this.logger.warn('LSpec dependency not declared in project lakefile', correlationId);
    }

    // 3. Assemble Canonical LSpec GitHub Action Workflow Content
    const targetBranch = options.branch || 'main';
    const includeCache = options.includeCache !== false;

    const cacheStep = includeCache
      ? `      - name: Cache .lake\n        uses: actions/cache@v4\n        with:\n          path: .lake\n          key: \${{ runner.os }}-lake-\${{ hashFiles('lake-manifest.json') }}\n          restore-keys: |\n            \${{ runner.os }}-lake-\n`
      : '';

    const content = `# =============================================================================
# LSpec Continuous Integration Workflow
# Generated automatically by Polyglot Code Studio (Phase 10.9.7)
# Toolchain: ${resolvedLeanVersion}
# =============================================================================
name: "LSpec CI"

on:
  push:
    branches:
      - ${targetBranch}
  pull_request:
    branches:
      - ${targetBranch}

jobs:
  lspec:
    name: Run LSpec Test Suites
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Lean 4 Toolchain
        uses: leanprover/lean-action@v1
        with:
          lean-version: "${resolvedLeanVersion}"

${cacheStep}      - name: Build Lake Project
        run: lake build

      - name: Execute LSpec Tests
        run: lake exe lspec
`;

    // 4. Validate YAML syntax
    const validation = validateYamlSyntax(content);
    if (!validation.valid) {
      throw new BridgeError('LSPEC_CI_TEMPLATE_FAILED', correlationId, {
        reason: `Generated YAML validation failed: ${validation.error}`,
      });
    }

    return {
      fileName: '.github/workflows/lspec.yml',
      content,
      warnings: Object.freeze(warnings),
    };
  }
}

export const lspecCiTemplateGenerator = new LSpecCiTemplateGenerator();
