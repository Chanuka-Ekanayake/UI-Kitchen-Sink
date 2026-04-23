import React, { useState, useEffect } from 'react';
import { Link, RefreshCcw, AlertTriangle, ExternalLink } from 'lucide-react';
import { Profile } from '../../../shared/types';
import { AuthError } from '../../utils/remoteScraper';

interface RemoteSyncPanelProps {
  activeProfile: Profile | null;
  onSync: (url: string) => Promise<void>;
}

export function RemoteSyncPanel({ activeProfile, onSync }: RemoteSyncPanelProps) {
  const [url, setUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorData, setErrorData] = useState<{ message: string, isAuthError: boolean } | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  // Sync internal UI URL with activeProfile if it changes
  useEffect(() => {
    if (activeProfile?.sourceUrl) {
      setUrl(activeProfile.sourceUrl);
    } else {
      setUrl('');
    }
    setErrorData(null);
    setAuthResolved(false);
  }, [activeProfile?.sourceUrl]);

  // Listen to storage changes to Auto-Refresh auth errors for simulation
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.mock_auth_success && changes.mock_auth_success.newValue === true) {
        setErrorData(null);
        setAuthResolved(true);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleSync = async () => {
    if (!url || !activeProfile) return;
    setIsSyncing(true);
    setErrorData(null);
    try {
      await onSync(url);
      setAuthResolved(false); // Clear the retry state on success
    } catch (err: any) {
      const isAuthError = err.name === 'AuthError' || err instanceof AuthError;
      const message = isAuthError 
        ? 'Access Denied: This Style Guide requires authentication.' 
        : (err.message ?? 'Unknown error occurred.');
      setErrorData({ message, isAuthError });
    } finally {
      setIsSyncing(false);
    }
  };

  const isConnected = !!activeProfile?.sourceUrl;
  const showRefresh = isConnected && url === activeProfile?.sourceUrl;
  const hasUnsavedUrlChange = isConnected && url !== activeProfile?.sourceUrl;

  const formattedDate = activeProfile?.lastSyncDate 
    ? new Date(activeProfile.lastSyncDate).toLocaleString() 
    : 'Not Connected';

  return (
    <div className="flex flex-col gap-3 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
      <div className="flex items-center gap-2 text-[#008000]">
        <div className="bg-[#008000]/10 p-1.5 rounded-md">
          <Link size={16} />
        </div>
        <h3 className="font-semibold text-sm">Remote Sync</h3>
      </div>
      <p className="text-xs text-gray-500">
        Connect to an external Style Guide URL to synchronise design tokens and components automatically.
      </p>
      
      <div className="flex flex-col gap-2 mt-1">
        <label htmlFor="style-guide-url" className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
          Style Guide URL
        </label>
        <div className="relative">
          <input
            id="style-guide-url"
            type="url"
            placeholder="https://example.com/design-system"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!activeProfile || isSyncing}
            className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008000]/50 placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400 font-mono"
          />
        </div>
      </div>

      {errorData && (
        <div className="flex flex-col gap-2 p-3 mt-1 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{errorData.message}</p>
          </div>
          {errorData.isAuthError && (
            <a 
              href={url.includes('localhost') ? 'http://localhost:5173/mock-login.html' : url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 ml-5 w-fit font-semibold text-white bg-red-500 hover:bg-red-600 rounded shadow-sm transition-colors cursor-pointer"
            >
              <ExternalLink size={12} />
              Open Login Page
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex flex-col">
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Status</div>
          <div className="text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
            {isSyncing ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Syncing...</>
            ) : isConnected && !hasUnsavedUrlChange ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Synced: <span className="font-normal text-gray-500 break-words">{formattedDate}</span></>
            ) : hasUnsavedUrlChange ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending Connect</>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> Not Connected</>
            )}
          </div>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center justify-center gap-1.5 py-2 px-4 shrink-0 text-xs font-medium text-white bg-[#008000] hover:bg-[#006000] rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!url || !activeProfile || isSyncing}
        >
          <RefreshCcw size={13} className={isSyncing ? "animate-spin" : ""} />
          {authResolved ? 'Retry Sync' : (showRefresh ? 'Refresh' : 'Connect & Sync')}
        </button>
      </div>

      <button 
        onClick={() => chrome?.storage?.local?.remove('mock_auth_success')}
        className="text-[9px] text-gray-400 hover:text-gray-600 underline self-end"
      >
        Reset Auth (Dev)
      </button>
    </div>
  );
}
