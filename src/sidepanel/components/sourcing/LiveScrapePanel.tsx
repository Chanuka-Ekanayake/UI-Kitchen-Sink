import React from 'react';
import { Zap, Search } from 'lucide-react';

export function LiveScrapePanel() {
  return (
    <div className="flex flex-col gap-3 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
      <div className="flex items-center gap-2 text-purple-600">
        <div className="bg-purple-100 p-1.5 rounded-md">
          <Zap size={16} />
        </div>
        <h3 className="font-semibold text-sm">Live Scrape</h3>
      </div>
      <p className="text-xs text-gray-500">
        Automatically detect and record components from the active tab.
      </p>

      <button className="flex items-center justify-center gap-2 w-full py-3 mt-2 font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-sm active:scale-95">
        <Search size={15} />
        Scrape Current Page
      </button>

      <div className="mt-3">
        <h4 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Results Review</h4>
        <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-center px-4">
          <p className="text-xs text-gray-400 italic">No components harvested yet.</p>
        </div>
      </div>
    </div>
  );
}
