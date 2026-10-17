import React from 'react';
import { HardDrive, GitBranch, Database, RefreshCw } from 'lucide-react';
import { useStorageProvider } from '../../context/StorageContext';

export function StorageSyncButton(): React.JSX.Element {
  const { target, syncStatus, isSyncing, openStorageModal } = useStorageProvider();

  let Icon = Database;
  let label = 'Browser DB';

  if (target.type === 'local') {
    Icon = HardDrive;
    label = target.folderName;
  } else if (target.type === 'github') {
    Icon = GitBranch;
    label = `${target.repo}@${target.branch}`;
  }

  const statusColor =
    syncStatus === 'synced'
      ? 'bg-emerald-400'
      : syncStatus === 'uncommitted'
        ? 'bg-amber-400'
        : syncStatus === 'syncing'
          ? 'bg-blue-400 animate-ping'
          : 'bg-neutral-500';

  return (
    <button
      type="button"
      onClick={openStorageModal}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-slate-300 hover:text-white transition-all text-xs font-medium"
      title="Storage Persistence & GitHub Sync"
    >
      <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      <span className="max-w-[120px] truncate">{label}</span>
      {isSyncing ? (
        <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
      ) : (
        <span className={`w-2 h-2 rounded-full ${statusColor} shrink-0`} />
      )}
    </button>
  );
}
