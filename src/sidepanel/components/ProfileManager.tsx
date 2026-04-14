import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Profile } from '../../shared/types';
import { Plus, Pencil, Trash2, Check, X, ChevronDown, FolderOpen, ToggleLeft, ToggleRight } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileManagerProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onToggleAll: (isEnabled: boolean) => void;
}

export interface ProfileManagerHandle {
  triggerRename: (name: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfileManager = forwardRef<ProfileManagerHandle, ProfileManagerProps>(
  function ProfileManager({
    profiles,
    activeProfileId,
    onSwitch,
    onCreate,
    onRename,
    onDelete,
    onToggleAll,
  }, ref) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null;
  const canDelete = profiles.length > 1;

  // Master Toggle Logic
  const allComponents = activeProfile?.components || [];
  const totalCount = allComponents.length;
  const enabledCount = allComponents.filter(c => c.isEnabled).length;
  // true only if all components are enabled
  const isMasterEnabled = totalCount > 0 && enabledCount === totalCount;

  // Expose triggerRename to parent via ref
  useImperativeHandle(ref, () => ({
    triggerRename: (name: string) => {
      setIsRenaming(true);
      setRenameValue(name);
    },
  }));

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus rename input
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleCreate = () => {
    const name = `Profile ${profiles.length + 1}`;
    onCreate(name);
    setDropdownOpen(false);
    // Enter rename mode immediately so user can name it
    setTimeout(() => {
      setIsRenaming(true);
      setRenameValue(name);
    }, 50);
  };

  const handleStartRename = () => {
    if (!activeProfile) return;
    setIsRenaming(true);
    setRenameValue(activeProfile.name);
  };

  const handleCommitRename = () => {
    if (!activeProfile || !renameValue.trim()) return;
    onRename(activeProfile.id, renameValue.trim());
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!activeProfile || !canDelete) return;

    if (window.confirm('Are you sure you want to delete this profile and all its components?')) {
      onDelete(activeProfile.id);
      setDropdownOpen(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-sm border-b border-gray-200 px-1 pb-3 pt-1 -mx-1">
      <div className="flex items-center gap-1.5">

        {/* ── Profile Selector / Rename Input ──────────────────────── */}
        <div className="relative flex-1 min-w-0" ref={dropdownRef}>
          {isRenaming ? (
            /* Inline Rename Mode */
            <div className="flex items-center gap-1">
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCommitRename();
                  if (e.key === 'Escape') handleCancelRename();
                }}
                className="flex-1 min-w-0 text-sm font-medium text-gray-800 bg-white border border-[#008000] rounded-lg px-3 py-[7px] outline-none ring-2 ring-[#008000]/20 transition-shadow"
                placeholder="Profile name..."
              />
              <button
                onClick={handleCommitRename}
                disabled={!renameValue.trim()}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#008000] text-white hover:bg-[#006000] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
                title="Save name"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleCancelRename}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
                title="Cancel rename"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            /* Dropdown Trigger */
            <>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 w-full px-3 py-[7px] text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-[#008000]/40 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#008000]/30 focus:border-[#008000]"
              >
                <FolderOpen size={14} className="text-[#008000] shrink-0" />
                <span className="truncate flex-1 text-left">{activeProfile?.name ?? 'Select Profile'}</span>
                <ChevronDown
                  size={13}
                  className={`text-gray-400 transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="max-h-52 overflow-y-auto scrollbar-thin">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { onSwitch(p.id); setDropdownOpen(false); }}
                        className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors ${
                          p.id === activeProfileId
                            ? 'bg-green-50 text-[#008000] font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${p.id === activeProfileId ? 'bg-[#008000]' : 'bg-gray-300'}`} />
                        <span className="truncate flex-1">{p.name}</span>
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">
                          {p.components.length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* New Profile Button */}
                  <div className="border-t border-gray-100">
                    <button
                      onClick={handleCreate}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-gray-500 hover:text-[#008000] hover:bg-green-50/50 transition-colors"
                    >
                      <Plus size={14} />
                      <span>New Profile</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Action Icons ─────────────────────────────────────────── */}
        {!isRenaming && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Create */}
            <button
              onClick={handleCreate}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-[#008000] hover:bg-green-50 border border-transparent hover:border-green-200 transition-all"
              title="Create new profile"
            >
              <Plus size={16} />
            </button>

            {/* Rename */}
            <button
              onClick={handleStartRename}
              disabled={!activeProfile}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Rename profile"
            >
              <Pencil size={14} />
            </button>

            {/* Delete */}
            <div className="relative">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={!canDelete}
                className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title={canDelete ? 'Delete profile' : 'Cannot delete the last profile'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Header Row: Master Toggle & Selective Scan Status */}
      {activeProfile && totalCount > 0 && (
        <div className="flex items-center justify-between mt-2.5 px-0.5 pt-1.5 border-t border-gray-200/60">
          <button
            type="button"
            onClick={() => onToggleAll(!isMasterEnabled)}
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              isMasterEnabled ? 'text-[#008000]' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={isMasterEnabled ? 'Click to disable all components' : 'Click to enable all components'}
          >
            {isMasterEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Enable All
          </button>
          
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
             <span className={enabledCount > 0 ? 'text-[#008000]' : 'text-gray-400'}>{enabledCount}</span> / {totalCount} Active
          </div>
        </div>
      )}
    </div>
  );
});
