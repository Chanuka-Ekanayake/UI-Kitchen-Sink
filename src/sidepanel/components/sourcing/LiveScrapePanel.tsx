import React, { useState } from 'react';
import { Zap, Search, CheckSquare, Square, Download } from 'lucide-react';
import { ComponentBlock } from '../../../shared/types';

interface LiveScrapePanelProps {
  onCommit: (components: ComponentBlock[]) => void;
}

export function LiveScrapePanel({ onCommit }: LiveScrapePanelProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [harvestedComponents, setHarvestedComponents] = useState<ComponentBlock[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleScrape = async () => {
    setIsScanning(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error("No active tab found.");

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'HARVEST_PAGE' });
      if (response && response.components) {
        setHarvestedComponents(response.components);
        // Default to selecting all harvested
        setSelectedIds(new Set(response.components.map((c: ComponentBlock) => c.id)));
      }
    } catch (err: any) {
      console.error("Harvester failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === harvestedComponents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(harvestedComponents.map(c => c.id)));
    }
  };

  const handleCommit = () => {
    const toCommit = harvestedComponents.filter(c => selectedIds.has(c.id));
    if (toCommit.length > 0) {
      onCommit(toCommit);
      setHarvestedComponents([]);
      setSelectedIds(new Set());
    }
  };

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

      <button 
        onClick={handleScrape}
        disabled={isScanning}
        className="flex items-center justify-center gap-2 w-full py-3 mt-2 font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
      >
        <Search size={15} className={isScanning ? "animate-spin" : ""} />
        {isScanning ? 'Scanning DOM...' : 'Scrape Current Page'}
      </button>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Review Queue</h4>
          {harvestedComponents.length > 0 && (
            <button 
              onClick={toggleAll}
              className="text-[10px] font-medium text-purple-600 hover:text-purple-800"
            >
              {selectedIds.size === harvestedComponents.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
        
        {harvestedComponents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-center px-4">
            <p className="text-xs text-gray-400 italic">No components harvested yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {harvestedComponents.map(comp => (
              <div 
                key={comp.id}
                className={`flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-colors ${selectedIds.has(comp.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => toggleSelection(comp.id)}
              >
                <div className="flex flex-col overflow-hidden">
                  <div className="text-xs font-semibold text-gray-800 truncate">{comp.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                    &lt;{comp.htmlTag}&gt; {comp.cssClass ? `.${comp.cssClass}` : ''} {comp.cssId ? `#${comp.cssId}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[10px] text-gray-400 font-medium whitespace-nowrap bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-100">
                    {comp.styleRules.length} rules
                  </div>
                  {selectedIds.has(comp.id) ? (
                    <CheckSquare size={16} className="text-purple-600 shrink-0" />
                  ) : (
                    <Square size={16} className="text-gray-400 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {harvestedComponents.length > 0 && (
        <button 
          onClick={handleCommit}
          disabled={selectedIds.size === 0}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all shadow-sm disabled:opacity-50"
        >
          <Download size={14} />
          Save {selectedIds.size} Component{selectedIds.size !== 1 ? 's' : ''} to Profile
        </button>
      )}
    </div>
  );
}
