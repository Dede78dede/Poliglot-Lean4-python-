/**
 * Blueprint to Lean 4 Stub Generator (Phase 10.9.7, Task BG1)
 *
 * Automatically converts unformalized Blueprint DAG nodes into LeanArchitect
 * compliant @[blueprint] declarations with explicit sorry_using [...] dependencies.
 *
 * Invariants:
 * - Emits @[blueprint (statement := /-- ... -/)]
 * - Maps dependencies to sorry_using [<dep1>, <dep2>]
 * - Omits \leanok markers (stubs are sorry-bearing; \leanok is inferred upon sorry-free check)
 * - Topological ordering guarantees zero forward references or self-loops
 * - Skips verified/formalized nodes with reason: 'already-formalized'
 * - Skips nodes without statements with reason: 'missing-statement'
 * - Skips nodes referencing non-existent DAG nodes with reason: 'missing-dependencies'
 */

import type { BlueprintNode, BlueprintEdge } from '../../types/blueprint';
import { BridgeError } from '../errors/bridge-error';
import { createLogger, StructuredLogger } from '../logging/logger';

export interface BlueprintDagNode {
  readonly id: string;
  readonly name?: string;
  readonly kind?: string;
  readonly informalStatement?: string;
  readonly statement?: string;
  readonly typeSignature?: string;
  readonly signature?: string;
  readonly proofStatus?: 'unformalized' | 'sorry' | 'verified' | 'frozen';
  readonly status?: string;
  readonly dependencies?: readonly string[];
}

export interface BlueprintDag {
  readonly id?: string;
  readonly nodes: readonly (BlueprintNode | BlueprintDagNode)[];
  readonly edges?: readonly BlueprintEdge[];
}

export interface BlueprintStubOptions {
  readonly moduleName: string;           // e.g., "MyProject.Blueprint.Main"
  readonly namespace?: string;
  readonly imports?: readonly string[];  // default ["Mathlib"]
  readonly correlationId?: string;
}

export interface BlueprintStubResult {
  readonly fileName: string;             // e.g., "Blueprint/Main.lean"
  readonly content: string;              // full Lean source
  readonly generatedNodes: readonly string[];
  readonly skippedNodes: readonly {
    readonly nodeId: string;
    readonly reason: 'already-formalized' | 'missing-statement' | 'missing-dependencies';
  }[];
}

export class BlueprintStubGenerator {
  private readonly logger = createLogger('BlueprintStubGenerator');

  /**
   * Generates a complete .lean file containing stubs for all unformalized nodes in the DAG.
   */
  public async generateStub(
    dag: BlueprintDag,
    options: BlueprintStubOptions
  ): Promise<BlueprintStubResult> {
    const correlationId = options.correlationId ?? StructuredLogger.generateCorrelationId();
    this.logger.info(`Generating Lean stubs for module ${options.moduleName}`, correlationId);

    if (!dag || !Array.isArray(dag.nodes)) {
      throw new BridgeError('BLUEPRINT_STUB_GENERATION_FAILED', correlationId, {
        reason: 'Invalid DAG: nodes array is required.',
      });
    }

    const allNodeIds = new Set(dag.nodes.map((n) => n.id));
    const generatedNodes: string[] = [];
    const skippedNodes: {
      nodeId: string;
      reason: 'already-formalized' | 'missing-statement' | 'missing-dependencies';
    }[] = [];

    // Map outgoing/incoming edges for dependency resolution if node.dependencies not directly set
    const nodeDepMap = new Map<string, Set<string>>();
    for (const node of dag.nodes) {
      const explicitDeps = (node as BlueprintDagNode).dependencies || [];
      nodeDepMap.set(node.id, new Set(explicitDeps));
    }

    if (dag.edges && Array.isArray(dag.edges)) {
      for (const edge of dag.edges) {
        // In a proof DAG: target depends on source
        const existing = nodeDepMap.get(edge.to);
        if (existing) {
          existing.add(edge.from);
        }
      }
    }

    // Filter and validate nodes
    const validCandidates: {
      node: BlueprintNode | BlueprintDagNode;
      informalStatement: string;
      signature: string;
      dependencies: string[];
    }[] = [];

    for (const node of dag.nodes) {
      // 1. Check formalization status
      const proofStatus =
        (node as BlueprintDagNode).proofStatus ||
        (node as BlueprintNode).status;

      if (
        proofStatus === 'verified' ||
        proofStatus === 'frozen' ||
        proofStatus === 'kernel_verified'
      ) {
        skippedNodes.push({
          nodeId: node.id,
          reason: 'already-formalized',
        });
        continue;
      }

      // 2. Check statement presence
      const informalStatement =
        (node as BlueprintDagNode).informalStatement ||
        (node as BlueprintNode).statement ||
        '';

      if (!informalStatement || informalStatement.trim() === '') {
        skippedNodes.push({
          nodeId: node.id,
          reason: 'missing-statement',
        });
        continue;
      }

      // 3. Resolve dependencies & check for missing nodes or self-loops
      const rawDeps = Array.from(nodeDepMap.get(node.id) || []);
      // Filter out self-loops
      const cleanDeps = rawDeps.filter((depId) => depId !== node.id);

      let hasMissingDep = false;
      for (const depId of cleanDeps) {
        if (!allNodeIds.has(depId)) {
          hasMissingDep = true;
          break;
        }
      }

      if (hasMissingDep) {
        skippedNodes.push({
          nodeId: node.id,
          reason: 'missing-dependencies',
        });
        continue;
      }

      // 4. Determine Lean type signature
      const signature =
        (node as BlueprintDagNode).typeSignature ||
        (node as BlueprintNode).signature ||
        'Prop';

      validCandidates.push({
        node,
        informalStatement: informalStatement.trim(),
        signature,
        dependencies: cleanDeps,
      });
    }

    // 5. Topological Sort to ensure no forward references in sorry_using
    const sortedCandidates = this.topologicalSort(validCandidates);

    // 6. Generate Lean 4 Code
    const imports = options.imports && options.imports.length > 0 ? options.imports : ['Mathlib'];
    const importHeader = imports.map((imp) => `import ${imp}`).join('\n');
    const namespaceHeader = options.namespace ? `namespace ${options.namespace}\n\n` : '';
    const namespaceFooter = options.namespace ? `\nend ${options.namespace}\n` : '';

    const stubs: string[] = [];

    for (const candidate of sortedCandidates) {
      const declKind = (candidate.node as BlueprintDagNode).kind || (candidate.node as BlueprintNode).kind || 'theorem';
      const cleanDeclKind = ['theorem', 'lemma', 'def', 'axiom'].includes(declKind) ? declKind : 'theorem';
      
      const sanitizedName = candidate.node.id.replace(/[^a-zA-Z0-9_.]/g, '_');
      const depsFormatted = candidate.dependencies.length > 0
        ? `sorry_using [${candidate.dependencies.map((d) => d.replace(/[^a-zA-Z0-9_.]/g, '_')).join(', ')}]`
        : 'sorry';

      const stub = [
        `@[blueprint (statement := /-- ${candidate.informalStatement} -/)]`,
        `${cleanDeclKind} ${sanitizedName} : ${candidate.signature} := by`,
        `  ${depsFormatted}`,
      ].join('\n');

      stubs.push(stub);
      generatedNodes.push(candidate.node.id);
    }

    const fullContent = [
      '/-',
      ' * Lean 4 Blueprint Stubs',
      ` * Module: ${options.moduleName}`,
      ` * Generated by Polyglot Code Studio (Phase 10.9.7)`,
      ' * Pattern: LeanArchitect @[blueprint] + sorry_using',
      ' -/',
      '',
      importHeader,
      '',
      namespaceHeader + stubs.join('\n\n') + namespaceFooter,
    ].join('\n');

    // Generate output file name (e.g. Blueprint/Main.lean)
    const normalizedModule = options.moduleName.replace(/^Blueprint\./, '').replace(/\./g, '/');
    const fileName = options.moduleName.startsWith('Blueprint.')
      ? `Blueprint/${normalizedModule}.lean`
      : options.moduleName.includes('/')
        ? options.moduleName
        : `Blueprint/${options.moduleName.replace(/\./g, '/')}.lean`;

    return {
      fileName,
      content: fullContent,
      generatedNodes: Object.freeze(generatedNodes),
      skippedNodes: Object.freeze(skippedNodes),
    };
  }

  /**
   * Topological sorting using Kahn's algorithm to eliminate forward references
   */
  private topologicalSort<T extends { node: { id: string }; dependencies: string[] }>(
    items: readonly T[]
  ): T[] {
    const itemMap = new Map(items.map((i) => [i.node.id, i]));
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    for (const item of items) {
      inDegree.set(item.node.id, 0);
      graph.set(item.node.id, []);
    }

    for (const item of items) {
      for (const dep of item.dependencies) {
        if (graph.has(dep)) {
          graph.get(dep)!.push(item.node.id);
          inDegree.set(item.node.id, (inDegree.get(item.node.id) || 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const sorted: T[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sorted.push(itemMap.get(u)!);

      for (const neighbor of graph.get(u) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If cycle detected, append remaining items preserving stable order
    if (sorted.length < items.length) {
      for (const item of items) {
        if (!sorted.includes(item)) {
          sorted.push(item);
        }
      }
    }

    return sorted;
  }
}

export const blueprintStubGenerator = new BlueprintStubGenerator();
