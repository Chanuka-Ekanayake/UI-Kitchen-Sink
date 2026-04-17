import React from 'react';
import { Profile } from '../../shared/types';
import { FilePlus2, GitMerge, X } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImportOptionModalProps {
  /** The parsed-but-not-yet-committed profile from the file */
  importedProfile: Profile;
  /** Name of the active profile (shown on the Merge button) */
  activeProfileName: string | null;
  onSelectNew: () => void;
  onSelectMerge: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportOptionModal({
  importedProfile,
  activeProfileName,
  onSelectNew,
  onSelectMerge,
  onCancel,
}: ImportOptionModalProps) {
  const componentCount = importedProfile.components.length;

  return (
    // Backdrop — click outside to cancel
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

        {/* File metadata */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs text-gray-500 mb-1">Importing</p>
          <p className="text-sm font-semibold text-gray-800 truncate" title={importedProfile.name}>
            {importedProfile.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {componentCount} component{componentCount !== 1 ? 's' : ''}
          </p>
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
              <p className="text-sm font-semibold text-gray-800">Create New Profile</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                Add as a standalone profile. A unique name will be assigned if needed.
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
                Append components into{' '}
                <span className="font-medium text-blue-600 truncate">
                  {activeProfileName ?? 'No active profile'}
                </span>
                . Conflicts will be resolved interactively.
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
  );
}
