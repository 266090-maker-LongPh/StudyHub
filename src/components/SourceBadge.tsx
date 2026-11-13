import type { SourceRef } from '../types';

interface SourceBadgeProps {
  source: SourceRef;
  compact?: boolean;
}

export function SourceBadge({ source, compact = false }: SourceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      title={`${source.file} — ${source.loc}`}
    >
      <span className="font-semibold text-blue-700 dark:text-blue-400">Nguồn:</span>
      <span className="truncate max-w-[200px] sm:max-w-xs">{source.file}</span>
      <span className="text-slate-400">•</span>
      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
        {source.loc}
      </span>
    </span>
  );
}
