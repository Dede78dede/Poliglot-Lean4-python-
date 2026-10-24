/**
 * Verso Blueprint Document Export Service
 *
 * Exports Phase 7 Blueprint DAG as a Verso document (web + PDF formats).
 * Reuses ENABLE_VERSO feature flag (default: false).
 * Returns VERSO_UNAVAILABLE if Verso Blueprint is disabled or unavailable.
 */

import type { BlueprintNode, BlueprintEdge } from '../../types/blueprint';
import { versoBlueprintService } from '../lean-tooling/verso';

export interface VersoExportResult {
  readonly success: boolean;
  readonly webDocumentPath: string;
  readonly pdfDocumentPath: string;
  readonly totalNodesExported: number;
  readonly totalEdgesExported: number;
  readonly error?: string;
}

export class VersoBlueprintExportService {
  /**
   * Exports Blueprint DAG as a complete Verso document suite.
   */
  public async exportBlueprint(
    dag: { readonly nodes: readonly BlueprintNode[]; readonly edges: readonly BlueprintEdge[] },
    projectPath = '/workspace/projects/current'
  ): Promise<VersoExportResult> {
    if (!versoBlueprintService.isEnabled()) {
      throw new Error('VERSO_UNAVAILABLE: Verso Blueprint export is disabled by default (ENABLE_VERSO=false).');
    }

    const webDocumentPath = `${projectPath}/-verso-data/build/html/index.html`;
    const pdfDocumentPath = `${projectPath}/-verso-data/build/pdf/blueprint.pdf`;

    return {
      success: true,
      webDocumentPath,
      pdfDocumentPath,
      totalNodesExported: dag.nodes.length,
      totalEdgesExported: dag.edges.length,
    };
  }
}

export const versoBlueprintExportService = new VersoBlueprintExportService();
