import React, { useState } from 'react';
import { Link, RefreshCcw } from 'lucide-react';

export function RemoteSyncPanel() {
  const [url, setUrl] = useState('');

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
        <input
          id="style-guide-url"
          type="url"
          placeholder="https://example.com/design-system"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008000]/50 placeholder-gray-400"
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="text-[11px] font-medium text-gray-400">Status: <span className="text-gray-500">Not Connected</span></div>
        <button
          className="flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium text-white bg-[#008000] hover:bg-[#006000] rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!url}
        >
          <RefreshCcw size={13} />
          Connect & Sync
        </button>
      </div>
    </div>
  );
}
