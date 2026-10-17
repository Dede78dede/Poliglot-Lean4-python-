import type {
  ArchonWorkspace,
  LedgerEntry,
} from '../../types/blueprint';
import {
  computeLedgerEntryHash,
  GENESIS_PREV_HASH,
} from './workspace-store.types';

export class WorkspaceLedgerService {
  public getLedgerSync(ws: ArchonWorkspace | undefined, sinceSeq: number): LedgerEntry[] {
    if (!ws) return [];
    return ws.ledger.filter((entry: LedgerEntry) => entry.seq > sinceSeq);
  }

  public appendEntry(
    ws: ArchonWorkspace,
    entry: Omit<LedgerEntry, 'seq' | 'prevHash' | 'integrityHash'>
  ): { updatedWs: ArchonWorkspace; entry: LedgerEntry } {
    const nextSeq = (ws.ledger[ws.ledger.length - 1]?.seq || 0) + 1;
    const lastEntry = ws.ledger[ws.ledger.length - 1];
    const prevHash = lastEntry ? lastEntry.integrityHash : GENESIS_PREV_HASH;
    const integrityHash = computeLedgerEntryHash(
      nextSeq,
      prevHash,
      entry.timestamp,
      entry.author.id,
      entry.type,
      entry.nodeId,
      entry.payload
    );

    const fullEntry: LedgerEntry = {
      ...entry,
      seq: nextSeq,
      prevHash,
      integrityHash,
    };

    const updatedWs: ArchonWorkspace = {
      ...ws,
      ledger: [...ws.ledger, fullEntry],
      updatedAt: Date.now(),
    };

    return { updatedWs, entry: fullEntry };
  }

  public verifyChain(ws: ArchonWorkspace | undefined): { valid: boolean; brokenSeq?: number; error?: string } {
    if (!ws) {
      return { valid: false, error: 'WORKSPACE_NOT_FOUND' };
    }
    const ledger = ws.ledger;
    if (ledger.length === 0) {
      return { valid: true };
    }

    for (let i = 0; i < ledger.length; i++) {
      const entry = ledger[i];
      const checkResult = this.checkEntryIntegrity(entry, i > 0 ? ledger[i - 1] : undefined);
      if (!checkResult.valid) {
        return checkResult;
      }
    }

    return { valid: true };
  }

  private checkEntryIntegrity(
    entry: LedgerEntry,
    prevEntry?: LedgerEntry
  ): { valid: boolean; brokenSeq?: number; error?: string } {
    if (!prevEntry) {
      if (entry.prevHash !== GENESIS_PREV_HASH) {
        return { valid: false, brokenSeq: entry.seq, error: 'INVALID_GENESIS_PREV_HASH' };
      }
    } else {
      if (entry.seq !== prevEntry.seq + 1) {
        return { valid: false, brokenSeq: entry.seq, error: 'NON_MONOTONIC_SEQUENCE' };
      }
      if (entry.prevHash !== prevEntry.integrityHash) {
        return { valid: false, brokenSeq: entry.seq, error: 'PREV_HASH_MISMATCH' };
      }
    }

    const expectedHash = computeLedgerEntryHash(
      entry.seq,
      entry.prevHash,
      entry.timestamp,
      entry.author.id,
      entry.type,
      entry.nodeId,
      entry.payload
    );
    if (entry.integrityHash !== expectedHash) {
      return { valid: false, brokenSeq: entry.seq, error: 'INTEGRITY_HASH_MISMATCH' };
    }

    return { valid: true };
  }
}
