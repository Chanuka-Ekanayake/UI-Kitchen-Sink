import React, { useState } from 'react';
import { Profile } from '../../shared/types';
import { FilePlus2, GitMerge, X, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImportOptionModalProps {
  importedProfile: Profile;
  activeProfileName: string | null;
  sourceType?: 'json' | 'css';
  /** General parse / performance warnings */
  cssWarnings?: string[];
  /** Selectors filtered out as too complex */
  ignoredSelectors?: string[];
  onSelectNew: () => void;
  onSelectMerge: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportOptionModal({
  importedProfile,
  activeProfileName,
  sourceType = 'json',
  cssWarnings = [],
  ignoredSelectors = [],
  onSelectNew,
  onSelectMerge,
  onCancel,
}: ImportOptionModalProps) {
  const componentCount = importedProfile.components.length;
  const isCss = sourceType === 'css';
  const [showIgnored, setShowIgnored] = useState(false);

  const previewIgnored = ignoredSelectors.slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Import Profile</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
            title="Cancel import"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[70vh]">

          {/* File metadata */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs text-gray-500">{isCss ? 'Converted from CSS' : 'Importing'}</p>
              {isCss && (
                <span className="bg-purple-100 text-purple-700 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">CSS</span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-800 truncate" title={importedProfile.name}>
              {importedProfile.name}
            </p>

            {/* Audit breakdown */}
            {isCss ? (
              <div className="mt-2 flex flex-col gap-1.5">
                {/* Success row */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-lg leading-none">✅</span>
                  <span className="text-gray-700 font-medium">
                    {componentCount} component{componentCount !== 1 ? 's' : ''} created
                  </span>
                </div>
                {/* Unsupported row */}
                {ignoredSelectors.length > 0 && (
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setShowIgnored(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-left"
                    >
                      <span className="text-lg leading-none">⚠️</span>
                      <span className="text-amber-700 font-medium">
                        {ignoredSelectors.length} complex selector{ignoredSelectors.length !== 1 ? 's' : ''} skipped
                      </span>
                      {showIgnored
                        ? <ChevronUp size={12} className="text-amber-500 ml-auto" />
                        : <ChevronDown size={12} className="text-amber-500 ml-auto" />
                      }
                    </button>
                    {showIgnored && (
                      <div className="mt-1.5 ml-7 flex flex-col gap-0.5 max-h-28 overflow-y-auto scrollbar-thin">
                        {previewIgnored.map((sel, i) => (
                          <code key={i} className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 font-mono truncate block">
                            {sel}
                          </code>
                        ))}
                        {ignoredSelectors.length > 8 && (
                          <p className="text-[9px] text-gray-400 italic ml-0.5">
                            +{ignoredSelectors.length - 8} more…
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">
                {componentCount} component{componentCount !== 1 ? 's' : ''} extracted
              </p>
            )}

            {/* General warnings */}
            {cssWarnings.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {cssWarnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1 leading-snug">
                    ℹ {w}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-4 flex flex-col gap-2.5">
            <p className="text-xs text-gray-500 text-center mb-0.5">Where should this data go?</p>

            {/* Create New Profile */}
            <button
              onClick={onSelectNew}
              className="flex items-start gap-3 w-full px-4 py-3 text-left rounded-xl border-2 border-[#008000]/30 bg-green-50 hover:border-[#008000] hover:bg-green-100 transition-all group"
            >
              <FilePlus2 size={18} className="text-[#008000] mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Import as New Profile</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                  Creates a standalone profile containing only this import's components. A unique name will be assigned if needed.
                </p>
              </div>
            </button>

            {/* Merge into Active */}
            <button
              onClick={onSelectMerge}
              disabled={!activeProfileName}
              className="flex items-start gap-3 w-full px-4 py-3 text-left rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all group"
            >
              <GitMerge size={18} className="text-blue-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Merge into Active Profile</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                  Appends rules to your current view —{' '}
                  <span className="font-medium text-blue-600">
                    {activeProfileName ?? 'no profile selected'}
                  </span>
                  . Duplicates are skipped; selector conflicts are resolved interactively.
                </p>
              </div>
            </button>

            {/* Cancel */}
            <button
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
