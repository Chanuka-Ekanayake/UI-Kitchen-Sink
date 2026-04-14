import React, { useState, useEffect, useMemo } from 'react';
import { ValidationResult, ComponentBlock, ComponentStandard, Profile } from '../shared/types';
import { GlobalSummary } from './components/GlobalSummary';
import { ResultCard } from './components/ResultCard';
import { MainLayout } from './components/MainLayout';
import { StandardBlock } from './components/StandardBlock';
import { Plus, FolderPlus, Trash2, Pencil, Check, X, ChevronDown } from 'lucide-react';
import { sendTabMessage } from '../shared/messaging';

type ViewState = 'HOME' | 'SCANNING' | 'RESULTS' | 'ERROR';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefaultProfile(name = 'Default Profile'): Profile {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name,
    components: [],
  };
}

function createEmptyComponent(): ComponentBlock {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name: '',
    htmlTag: '',
    cssClass: '',
    cssId: '',
    isEnabled: true,
    styleRules: [],
  };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multi-profile state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Profile CRUD UI state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // ─── Derived state ────────────────────────────────────────────────

  const activeProfile = useMemo(
    () => profiles.find(p => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  );

  const components = activeProfile?.components ?? [];

  // ─── Hydration ────────────────────────────────────────────────────

  useEffect(() => {
    chrome.storage.local.get(['ui_profiles', 'ui_active_profile_id'], (result) => {
      let loadedProfiles: Profile[] = result.ui_profiles ?? [];
      let loadedActiveId: string | null = result.ui_active_profile_id ?? null;

      // Migration: if old flat data exists, wrap it into a Default profile
      if (loadedProfiles.length === 0) {
        chrome.storage.local.get('ui_components_data', (legacy) => {
          const defaultProfile = createDefaultProfile();
          if (legacy.ui_components_data && Array.isArray(legacy.ui_components_data)) {
            defaultProfile.components = legacy.ui_components_data.map((c: any) => ({
              ...c,
              isEnabled: c.isEnabled ?? true,
            }));
          }
          setProfiles([defaultProfile]);
          setActiveProfileId(defaultProfile.id);
          setIsHydrated(true);
        });
      } else {
        // Ensure isEnabled exists on all components (forward compat)
        loadedProfiles = loadedProfiles.map(p => ({
          ...p,
          components: p.components.map(c => ({ ...c, isEnabled: c.isEnabled ?? true })),
        }));
        if (!loadedActiveId || !loadedProfiles.some(p => p.id === loadedActiveId)) {
          loadedActiveId = loadedProfiles[0].id;
        }
        setProfiles(loadedProfiles);
        setActiveProfileId(loadedActiveId);
        setIsHydrated(true);
      }
    });
  }, []);

  // ─── Auto-save ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isHydrated) return;
    chrome.storage.local.set({
      ui_profiles: profiles,
      ui_active_profile_id: activeProfileId,
    });
  }, [profiles, activeProfileId, isHydrated]);

  // ─── Profile CRUD ─────────────────────────────────────────────────

  const createProfile = (name: string) => {
    const np = createDefaultProfile(name);
    setProfiles(prev => [...prev, np]);
    setActiveProfileId(np.id);
    setProfileDropdownOpen(false);
  };

  const deleteProfile = (id: string) => {
    setProfiles(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length === 0) {
        const fallback = createDefaultProfile();
        setActiveProfileId(fallback.id);
        return [fallback];
      }
      if (activeProfileId === id) {
        setActiveProfileId(next[0].id);
      }
      return next;
    });
  };

  const renameProfile = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
    setRenamingId(null);
    setRenameValue('');
  };

  const startRename = (p: Profile) => {
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  // ─── Component CRUD (scoped to active profile) ────────────────────

  const updateActiveProfileComponents = (updater: (comps: ComponentBlock[]) => ComponentBlock[]) => {
    if (!activeProfileId) return;
    setProfiles(prev => prev.map(p =>
      p.id === activeProfileId ? { ...p, components: updater(p.components) } : p
    ));
  };

  const addComponent = () => {
    updateActiveProfileComponents(comps => [...comps, createEmptyComponent()]);
  };

  const handleUpdateComponent = (id: string, updates: Partial<ComponentBlock>) => {
    updateActiveProfileComponents(comps =>
      comps.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };

  const handleRemoveComponent = (id: string) => {
    updateActiveProfileComponents(comps => comps.filter(c => c.id !== id));
  };

  const toggleComponent = (id: string) => {
    updateActiveProfileComponents(comps =>
      comps.map(c => c.id === id ? { ...c, isEnabled: !c.isEnabled } : c)
    );
  };

  // ─── Scan logic ───────────────────────────────────────────────────

  const enabledComponents = components.filter(c => c.isEnabled);

  const isScanDisabled = enabledComponents.length === 0 || enabledComponents.some(c =>
    !c.name.trim() ||
    (!c.htmlTag.trim() && !c.cssClass.trim() && !c.cssId.trim()) ||
    c.styleRules.some(r => !r.property.trim() || !r.value.trim())
  );

  const clearResults = () => {
    setResults(null);
    setError(null);
    setCurrentView('HOME');
  };

  const handleScan = async () => {
    try {
      setCurrentView('SCANNING');
      setError(null);
      setResults(null);

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab || !tab.id) throw new Error('No active tab found.');
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('https://chrome.google.com/webstore')) {
        throw new Error('Cannot scan restricted browser pages.');
      }

      // Content script injection check
      const checkResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => (window as any).__UI_VALIDATOR_LOADED__ === true,
      }).catch(() => [{ result: false }]);

      if (checkResult?.[0]?.result !== true) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/index.ts-loader.js'],
        }).catch(err => console.warn('Manual injection error:', err));
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Map only enabled components from active profile
      const mapStateToScannerFormat = (blocks: ComponentBlock[]): ComponentStandard[] => {
        return blocks.map(block => {
          let selectorStr = block.htmlTag || '';
          if (block.cssClass) selectorStr += `.${block.cssClass}`;
          if (block.cssId) selectorStr += `#${block.cssId}`;

          // Fallback: if only class or id was provided (no tag)
          if (!selectorStr) return null;

          return {
            id: block.id,
            name: block.name,
            selector: selectorStr,
            styles: block.styleRules
              .filter(rule => rule.property.trim() && rule.value.trim())
              .map(rule => ({
                property: rule.property.trim(),
                expectedValue: rule.value.trim(),
                severity: rule.severity,
                state: rule.state || 'default',
              })),
          };
        }).filter(Boolean) as ComponentStandard[];
      };

      const dynamicStandards = mapStateToScannerFormat(enabledComponents);

      for (const std of dynamicStandards) {
        try {
          document.createDocumentFragment().querySelector(std.selector);
        } catch {
          throw new Error(`Invalid Selector: "${std.selector}" for component "${std.name}".`);
        }
      }

      let response: ValidationResult[] | undefined;
      let attempts = 0;
      let lastError: any = null;

      while (attempts < 3) {
        try {
          response = await sendTabMessage<ValidationResult[]>('START_SCAN', { standards: dynamicStandards });
          break;
        } catch (err) {
          attempts++;
          lastError = err;
          if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!response) throw new Error(lastError?.message || 'Receiving end does not exist after 3 attempts.');

      setResults(response);
      setCurrentView('RESULTS');
    } catch (err) {
      console.error('Scan error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setCurrentView('ERROR');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

  const renderProfileSelector = () => (
    <div className="relative mb-3" onMouseLeave={() => setProfileDropdownOpen(false)}>
      <button
        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-[#008000]/40 transition-colors shadow-sm"
      >
        <span className="truncate">{activeProfile?.name ?? 'Select Profile'}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {profileDropdownOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto scrollbar-thin">
          {profiles.map(p => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer group ${p.id === activeProfileId ? 'bg-green-50 text-[#008000] font-semibold' : 'text-gray-700'}`}
            >
              {renamingId === p.id ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameProfile(p.id, renameValue); if (e.key === 'Escape') setRenamingId(null); }}
                    className="flex-1 text-xs font-medium bg-white border border-gray-300 rounded px-2 py-1 outline-none focus:border-[#008000]"
                  />
                  <button onClick={() => renameProfile(p.id, renameValue)} className="text-[#008000] hover:bg-green-50 p-1 rounded"><Check size={12} /></button>
                  <button onClick={() => setRenamingId(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={12} /></button>
                </div>
              ) : (
                <>
                  <span
                    className="truncate flex-1"
                    onClick={() => { setActiveProfileId(p.id); setProfileDropdownOpen(false); }}
                  >
                    {p.name}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    <button onClick={(e) => { e.stopPropagation(); startRename(p); }} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100" title="Rename"><Pencil size={11} /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50" title="Delete"><Trash2 size={11} /></button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Create new profile */}
          <div className="border-t border-gray-100 px-3 py-2">
            <button
              onClick={() => createProfile(`Profile ${profiles.length + 1}`)}
              className="flex items-center gap-2 w-full text-xs text-gray-500 hover:text-[#008000] font-medium py-1 transition-colors"
            >
              <FolderPlus size={13} />
              <span>New Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderContentView = () => {
    switch (currentView) {
      case 'SCANNING':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#008000] mb-4"></div>
            <p className="text-sm text-gray-500 font-medium">Scanning in progress...</p>
          </div>
        );

      case 'ERROR':
        return (
          <div className="flex flex-col items-center w-full">
            <div className="bg-red-50 text-red-700 p-4 rounded-md w-full mb-4 text-sm break-words border border-red-200">
              {error}
            </div>
            <button
              onClick={clearResults}
              className="text-[#008000] hover:text-[#006000] font-medium text-sm border border-[#008000] hover:bg-green-50 rounded-md px-4 py-2 transition-all w-full"
            >
              Try Again
            </button>
          </div>
        );

      case 'RESULTS':
        if (!results) return null;
        return (
          <div className="w-full h-full min-h-0 flex flex-col">
            <div className="shrink-0 w-full flex justify-center">
              <GlobalSummary results={results} />
            </div>
            <div className="flex-1 w-full min-h-0 mb-4 overflow-y-auto pr-2 pb-1 scrollbar-thin rounded-xl">
              {results.map((result, idx) => (
                <ResultCard key={`${result.elementSelector}-${idx}`} result={result} />
              ))}
            </div>
            <div className="shrink-0 w-full mt-auto pt-2">
              <button
                onClick={clearResults}
                className="text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-100 font-medium py-2 px-6 rounded-md transition-all shadow-sm w-full text-sm"
              >
                Clear Results
              </button>
            </div>
          </div>
        );

      case 'HOME':
      default:
        return (
          <div className="w-full h-full flex flex-col min-h-0">
            {/* Profile Selector */}
            {renderProfileSelector()}

            <div className="flex-1 w-full overflow-y-auto pr-2 pb-2 flex flex-col gap-4 scrollbar-thin">
              {components.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-center px-6">
                  <p className="text-sm font-medium text-gray-500">No components defined.</p>
                  <p className="text-xs text-gray-400 mt-1">Add your first component to begin the audit.</p>
                </div>
              ) : (
                components.map((block) => (
                  <div key={block.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <StandardBlock
                      block={block}
                      onUpdate={handleUpdateComponent}
                      onRemove={handleRemoveComponent}
                      onToggleEnabled={toggleComponent}
                    />
                  </div>
                ))
              )}

              <button
                onClick={addComponent}
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 hover:border-[#008000]/50 hover:bg-[#008000]/5 text-gray-500 hover:text-[#008000] font-medium rounded-xl transition-all"
              >
                <Plus size={16} />
                <span>Add Component Node</span>
              </button>
            </div>

            <div className="shrink-0 w-full pt-4 mt-auto border-t border-slate-100">
              <button
                onClick={handleScan}
                disabled={isScanDisabled}
                className="bg-[#008000] hover:bg-[#006000] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-md transition-all shadow-sm active:scale-95 w-full text-sm"
              >
                Start Scan{enabledComponents.length > 0 ? ` (${enabledComponents.length})` : ''}
              </button>
            </div>
          </div>
        );
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'HOME': return 'Ready';
      case 'SCANNING': return 'Analyzing UI...';
      case 'RESULTS': return 'Audit Report';
      case 'ERROR': return 'Scan Failed';
      default: return '';
    }
  };

  return (
    <MainLayout title={getViewTitle()}>
      <div className="w-full h-full transition-all duration-300 ease-in-out opacity-100 flex flex-col min-h-0">
        {renderContentView()}
      </div>
    </MainLayout>
  );
}
