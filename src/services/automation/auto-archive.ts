/**
 * Auto-Archive Automation Service (Sprint 11.0.2, Task A1)
 *
 * Tracks user activity and proposes an automated archive of the VFS
 * excluding transient and build directories (.lake, __pycache__, .git, node_modules).
 */

import { ExternalStoreBase } from '../stores/external-store-base';
import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { settingsStore } from '../settings/settings-store';
import { StructuredLogger } from '../logging/logger';

export const EXCLUDED_ARCHIVE_PATHS = Object.freeze([
  '.lake',
  '__pycache__',
  '.git',
  'node_modules',
  '.trash',
]);

export interface AutoArchiveProposal {
  readonly id: string;
  readonly timestamp: number;
  readonly fileCount: number;
  readonly files: readonly string[];
  status: 'pending' | 'accepted' | 'rejected';
}

export interface AutoArchiveSnapshot {
  readonly activeProposal: AutoArchiveProposal | null;
  readonly lastArchivedAt: number | null;
}

export class AutoArchiveService extends ExternalStoreBase<AutoArchiveSnapshot> {
  private activeProposal: AutoArchiveProposal | null = null;
  private lastArchivedAt: number | null = null;
  private readonly logger = new StructuredLogger('AutoArchiveService');

  constructor() {
    super({ id: 'autoArchiveService', multiTabSync: false, persistToIndexedDb: false });
  }

  protected computeSnapshot(): AutoArchiveSnapshot {
    return {
      activeProposal: this.activeProposal,
      lastArchivedAt: this.lastArchivedAt,
    };
  }

  public shouldExcludePath(path: string): boolean {
    return EXCLUDED_ARCHIVE_PATHS.some((exc) => path.startsWith(exc) || path.includes(`/${exc}/`));
  }

  public filterArchiveFiles(filePaths: readonly string[]): string[] {
    return filePaths.filter((p) => !this.shouldExcludePath(p));
  }

  /**
   * Triggers an automated archive proposal if enabled by flags & settings
   */
  public proposeArchive(availableFiles: readonly string[]): AutoArchiveProposal | null {
    const isAgentic = featureFlagRegistry.isEnabled('ENABLE_AGENTIC_AUTOMATION');
    const settings = settingsStore.getSnapshot().settings;
    if (!isAgentic && !settings.chat.autoArchiveEnabled) {
      return null;
    }

    const eligible = this.filterArchiveFiles(availableFiles);
    if (eligible.length === 0) return null;

    const proposal: AutoArchiveProposal = {
      id: `proposal-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      fileCount: eligible.length,
      files: eligible,
      status: 'pending',
    };

    this.activeProposal = proposal;
    this.logger.info('Auto-archive proposal generated', undefined, {
      fileCount: eligible.length,
      proposalId: proposal.id,
    });
    this.notify();
    return proposal;
  }

  public acceptProposal(): void {
    if (this.activeProposal) {
      this.activeProposal.status = 'accepted';
      this.lastArchivedAt = Date.now();
      this.logger.info('Auto-archive proposal accepted by user', undefined, {
        proposalId: this.activeProposal.id,
      });
      this.activeProposal = null;
      this.notify();
    }
  }

  public rejectProposal(): void {
    if (this.activeProposal) {
      this.activeProposal.status = 'rejected';
      this.logger.info('Auto-archive proposal rejected by user', undefined, {
        proposalId: this.activeProposal.id,
      });
      this.activeProposal = null;
      this.notify();
    }
  }
}

export const autoArchiveService = new AutoArchiveService();
