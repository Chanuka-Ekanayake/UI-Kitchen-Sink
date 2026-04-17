import React, { useState } from 'react';
import { ComponentBlock } from '../../shared/types';
import { MergeConflict, MergeResolution } from '../utils/mergeEngine';
import { ChevronRight, SkipForward, RefreshCw, CopyPlus, X } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MergeConflictModalProps {
  conflicts: MergeConflict[];
  /** Called when the user has resolved all conflicts */
  onComplete: (resolutions: Record<string, MergeResolution>) => void;
  /** Called when the user cancels the entire import */
  onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectorLabel(c: ComponentBlock): string {
  let s = c.htmlTag || '*';
  if (c.cssClass) s += `.${c.cssClass}`;
  if (c.cssId) s += `#${c.cssId}`;
  return s;
}

function RuleList({ comp }: { comp: ComponentBlock }) {
  if (comp.styleRules.length === 0) {
    return <p className="text-xs text-gray-400 italic">No rules</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {comp.styleRules.map((r) => (
        <li key={r.id} className="flex items-start gap-1.5 text-xs">
          <span className={`shrink-0 mt-0.5 px-1 py-px rounded text-[9px] font-bold uppercase ${r.severity === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            {r.severity}
          </span>
          <span className="font-mono text-gray-700">
            {r.property}: <span className="text-blue-600">{r.value}</span>
            {r.state !== 'default' && <span className="text-gray-400"> ({r.state})</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MergeConflictModal({ conflicts, onComplete, onCancel }: MergeConflictModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [resolutions, setResolutions] = useState<Record<string, MergeResolution>>({});
  const [applyToAll, setApplyToAll] = useState(false);
  const [bulkResolution, setBulkResolution] = useState<MergeResolution | null>(null);

  const current = conflicts[currentIdx];
  const total = conflicts.length;
  const isLast = currentIdx === total - 1;

  const resolve = (resolution: MergeResolution) => {
    if (applyToAll) {
      // Apply this resolution to all remaining unresolved conflicts
      const bulkMap: Record<string, MergeResolution> = { ...resolutions };
      for (let i = currentIdx; i < total; i++) {
        bulkMap[conflicts[i].id] = resolution;
      }
      setBulkResolution(resolution);
      onComplete(bulkMap);
      return;
    }

    const updated = { ...resolutions, [current.id]: resolution };
    setResolutions(updated);

    if (isLast) {
      onComplete(updated);
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-base">⚠</span>
            <span className="text-sm font-semibold text-amber-800">Merge Conflict</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {currentIdx + 1} / {total}
            </span>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors" title="Cancel import">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Conflict body */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[65vh]">
          <p className="text-xs text-gray-500 mb-1">
            The following selector already exists in the target profile with different styles.
          </p>

          {/* Selector pill */}
          <div className="flex items-center justify-center">
            <span className="font-mono text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {selectorLabel(current.existing)}
            </span>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-2">
            {/* Existing */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Original</p>
              <p className="text-xs font-semibold text-gray-700 mb-2 truncate" title={current.existing.name}>
                {current.existing.name || <span className="italic text-gray-400">Unnamed</span>}
              </p>
              <RuleList comp={current.existing} />
            </div>

            {/* Incoming */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400 mb-2">Imported</p>
              <p className="text-xs font-semibold text-gray-700 mb-2 truncate" title={current.incoming.name}>
                {current.incoming.name || <span className="italic text-gray-400">Unnamed</span>}
              </p>
              <RuleList comp={current.incoming} />
            </div>
          </div>

          {/* Apply to all checkbox */}
          {total > 1 && (
            <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={e => setApplyToAll(e.target.checked)}
                className="rounded border-gray-300 accent-[#008000]"
              />
              <span className="text-xs text-gray-500">Apply to all remaining {total - currentIdx - 1} conflict(s)</span>
            </label>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
          <button
            onClick={() => resolve('KEEP_ORIGINAL')}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
          >
            <SkipForward size={13} />
            Keep Original (Skip imported)
          </button>
          <button
            onClick={() => resolve('KEEP_NEW')}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-slate-700 border border-slate-300 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all"
          >
            <RefreshCw size={13} />
            Keep New (Overwrite)
          </button>
          <button
            onClick={() => resolve('KEEP_BOTH')}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-[#008000] border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-all"
          >
            <CopyPlus size={13} />
            Keep Both (Save as copy)
          </button>
        </div>
      </div>
    </div>
  );
}
