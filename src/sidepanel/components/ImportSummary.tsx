import React, { useState } from 'react';
import { CheckCircle2, SkipForward, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportSummaryData {
  mode: 'new' | 'merge';
  /** Profile name that was created / merged into */
  targetProfileName: string;
  /** Components successfully written */
  addedCount: number;
  /** Components skipped as exact duplicates */
  skippedCount: number;
  /** Conflicts resolved via user choice */
  conflictsResolved: number;
  /** Selectors the CSS parser could not handle */
  ignoredSelectors: string[];
  /** Whether the source was a CSS file */
  isCss: boolean;
}

interface ImportSummaryProps {
  data: ImportSummaryData;
  onClose: () => void;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function StatRow({
  icon,
  label,
  count,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colorClass}`}>
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-xs font-medium">{label}</span>
      <span className="text-sm font-bold tabular-nums">{count}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportSummary({ data, onClose }: ImportSummaryProps) {
  const [showErrors, setShowErrors] = useState(false);
  const {
    mode, targetProfileName, addedCount, skippedCount,
    conflictsResolved, ignoredSelectors, isCss,
  } = data;

  const hasProblems = ignoredSelectors.length > 0;
  const preview = ignoredSelectors.slice(0, 8);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Import Results</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[75vh] px-4 py-3 flex flex-col gap-3">

          {/* Context subtitle */}
          <p className="text-xs text-gray-500 leading-snug">
            {mode === 'new'
              ? <>Created new profile <span className="font-semibold text-gray-700">{targetProfileName}</span>.</>
              : <>Merged into <span className="font-semibold text-gray-700">{targetProfileName}</span>.</>
            }
            {isCss && <span className="ml-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded uppercase">CSS</span>}
          </p>

          {/* Stats */}
          <div className="flex flex-col gap-1.5">
            <StatRow
              icon={<CheckCircle2 size={15} className="text-[#008000]" />}
              label={isCss ? 'CSS rules converted' : 'Components added'}
              count={addedCount}
              colorClass="bg-green-50 border-green-100 text-green-800"
            />
            <StatRow
              icon={<SkipForward size={15} className="text-amber-500" />}
              label="Skipped (exact duplicates)"
              count={skippedCount}
              colorClass="bg-amber-50 border-amber-100 text-amber-800"
            />
            {conflictsResolved > 0 && (
              <StatRow
                icon={<CheckCircle2 size={15} className="text-blue-500" />}
                label="Conflicts resolved"
                count={conflictsResolved}
                colorClass="bg-blue-50 border-blue-100 text-blue-800"
              />
            )}
            {hasProblems && (
              <div className={`rounded-xl border bg-red-50 border-red-100 text-red-800`}>
                <button
                  type="button"
                  onClick={() => setShowErrors(v => !v)}
                  className="flex items-center gap-3 w-full p-3"
                >
                  <AlertTriangle size={15} className="text-red-500 shrink-0" />
                  <span className="flex-1 text-xs font-medium text-left">Unsupported selectors</span>
                  <span className="text-sm font-bold tabular-nums mr-2">{ignoredSelectors.length}</span>
                  {showErrors
                    ? <ChevronUp size={13} className="text-red-400 shrink-0" />
                    : <ChevronDown size={13} className="text-red-400 shrink-0" />
                  }
                </button>
                {showErrors && (
                  <div className="border-t border-red-100 px-3 py-2 flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-thin">
                    <p className="text-[9px] text-red-400 italic mb-0.5 leading-tight">
                      These selectors use combinators or complex pseudo-functions the engine cannot audit.
                    </p>
                    {preview.map((sel, i) => (
                      <code key={i} className="text-[9px] font-mono text-red-700 bg-red-100 rounded px-1.5 py-0.5 truncate block">
                        {sel}
                      </code>
                    ))}
                    {ignoredSelectors.length > 8 && (
                      <p className="text-[9px] text-red-300 italic mt-0.5">
                        +{ignoredSelectors.length - 8} more…
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Friendly message */}
          {addedCount === 0 && skippedCount === 0 && (
            <p className="text-xs text-center text-gray-400 italic py-1">
              No new data was written to the profile.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#008000] hover:bg-[#006000] rounded-xl transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
