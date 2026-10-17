import type {
  BlueprintSyncMode,
  BlueprintSyncRequest,
  BlueprintSyncResult,
  BlueprintDiscrepancy,
} from '../../types/proof-automation';
import type { BlueprintNode, ArchonWorkspace } from '../../types/blueprint';
import { extractBlueprintDAG, type SourceFilePayload } from '../collaboration/blueprint-extractor';

export class BlueprintSyncService {
  /**
   * Synchronizes blueprint DAG and code in a given workspace across extract, reconcile, and push modes.
   */
  public syncWorkspace(
    workspace: ArchonWorkspace,
    request: BlueprintSyncRequest
  ): BlueprintSyncResult {
    const startTime = Date.now();
    const mode = request.mode;

    switch (mode) {
      case 'extract': {
        const files: SourceFilePayload[] = (request.files || []).map((f) => ({
          path: f.path,
          content: f.content,
          language: f.path.endsWith('.py') ? 'python' : 'lean4',
        }));

        const extracted = extractBlueprintDAG(files);
        return {
          mode: 'extract',
          nodes: extracted.nodes,
          timeMs: Date.now() - startTime,
        };
      }

      case 'reconcile': {
        const files: SourceFilePayload[] = (request.files || []).map((f) => ({
          path: f.path,
          content: f.content,
          language: f.path.endsWith('.py') ? 'python' : 'lean4',
        }));

        const extracted = extractBlueprintDAG(files);
        const codeNodeMap = new Map<string, BlueprintNode>(extracted.nodes.map((n) => [n.id, n]));
        const wsNodeMap = new Map<string, BlueprintNode>(workspace.nodes.map((n) => [n.id, n]));

        const discrepancies: BlueprintDiscrepancy[] = [];

        // Check for nodes added in code
        for (const codeNode of extracted.nodes) {
          const wsNode = wsNodeMap.get(codeNode.id);
          if (!wsNode) {
            discrepancies.push({
              id: codeNode.id,
              type: 'added_in_code',
              details: `Declaration ${codeNode.id} found in code but missing from blueprint DAG`,
              codeSignature: codeNode.signature,
            });
          } else if (wsNode.signature.trim() !== codeNode.signature.trim()) {
            discrepancies.push({
              id: codeNode.id,
              type: 'signature_drift',
              details: `Signature in code differs from blueprint definition`,
              codeSignature: codeNode.signature,
              blueprintSignature: wsNode.signature,
            });
          }
        }

        // Check for nodes missing in code
        for (const wsNode of workspace.nodes) {
          if (!codeNodeMap.has(wsNode.id)) {
            discrepancies.push({
              id: wsNode.id,
              type: 'missing_in_code',
              details: `Blueprint node ${wsNode.id} is missing from source files`,
              blueprintSignature: wsNode.signature,
            });
          }
        }

        return {
          mode: 'reconcile',
          driftDetected: discrepancies.length > 0,
          discrepancies,
          timeMs: Date.now() - startTime,
        };
      }

      case 'push': {
        // Generate Lean stubs for unformalized nodes while strictly skipping frozen/verified nodes
        const skippedFrozenNodes: string[] = [];
        const stubs: string[] = [];

        for (const node of workspace.nodes) {
          // Frozen or already kernel-verified nodes are immutable
          if (node.status === 'kernel_verified' || (node as any).frozen === true) {
            skippedFrozenNodes.push(node.id);
            continue;
          }

          if (node.language === 'lean4') {
            const doc = node.statement ? `/-- ${node.statement} -/\n` : '';
            stubs.push(`${doc}${node.signature} := by\n  sorry\n`);
          } else if (node.language === 'python') {
            stubs.push(`def ${node.id}():\n    \"\"\"${node.statement || 'Empirical witness'}\"\"\"\n    raise NotImplementedError(\"Stub\")\n`);
          }
        }

        return {
          mode: 'push',
          generatedStubs: stubs.join('\n'),
          skippedFrozenNodes,
          timeMs: Date.now() - startTime,
        };
      }
    }
  }
}
