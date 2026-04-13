import React, { useState, useEffect } from 'react';
import { ValidationResult, ScannerMessage, ComponentBlock, ComponentStandard } from '../shared/types';
import { GlobalSummary } from './components/GlobalSummary';
import { ResultCard } from './components/ResultCard';
import { MainLayout } from './components/MainLayout';
import { StandardBlock } from './components/StandardBlock';
import { Plus } from 'lucide-react';
import { sendTabMessage } from '../shared/messaging';

type ViewState = 'HOME' | 'SCANNING' | 'RESULTS' | 'ERROR';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Default to empty; useEffect hydrator pulls overrides securely natively
  const [components, setComponents] = useState<ComponentBlock[]>([]);

  useEffect(() => {
    chrome.storage.local.get('ui_components_data', (result) => {
      if (result.ui_components_data && Array.isArray(result.ui_components_data)) {
        setComponents(result.ui_components_data);
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ ui_components_data: components });
  }, [components]);

  const addComponent = () => {
    const newBlock: ComponentBlock = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: '',
      htmlTag: '',
      cssClass: '',
      cssId: '',
      styleRules: []
    };
    setComponents([...components, newBlock]);
  };

  const handleUpdateComponent = (id: string, updates: Partial<ComponentBlock>) => {
    setComponents(prev => prev.map(block => block.id === id ? { ...block, ...updates } : block));
  };

  const handleRemoveComponent = (id: string) => {
    setComponents(prev => prev.filter(block => block.id !== id));
  };

  const isScanDisabled = components.length === 0 || components.some(c => 
    !c.name.trim() || 
    !c.htmlTag.trim() || 
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

      if (!tab || !tab.id) {
        throw new Error('No active tab found.');
      }

      // Handle cases where the user tries to scan a restricted Chrome page
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('https://chrome.google.com/webstore')) {
        throw new Error('Cannot scan restricted browser pages.');
      }

      // 1. Content Script Injection Check
      const checkResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return (window as any).__UI_VALIDATOR_LOADED__ === true;
        }
      }).catch(() => [{ result: false }]);

      const isLoaded = checkResult?.[0]?.result === true;

      if (!isLoaded) {
        console.log('Content script missing. Injecting manually...');

        const injectionPath = 'src/content/index.ts-loader.js';

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [injectionPath]
        }).catch(err => {
          console.warn('Manual injection error:', err);
        });

        // Give the script a moment to evaluate
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      const mapStateToScannerFormat = (blocks: ComponentBlock[]): ComponentStandard[] => {
        return blocks.map(block => {
          let selectorStr = block.htmlTag;
          if (block.cssClass) selectorStr += `.${block.cssClass}`;
          if (block.cssId) selectorStr += `#${block.cssId}`;
    
          const mappedStyles = block.styleRules
            .filter(rule => rule.property.trim() && rule.value.trim())
            .map(rule => ({
              property: rule.property.trim(),
              expectedValue: rule.value.trim(),
              severity: rule.severity,
              state: rule.state || 'default'
            }));
    
          return {
            id: block.id,
            name: block.name,
            selector: selectorStr,
            styles: mappedStyles
          };
        });
      };

      const dynamicStandards = mapStateToScannerFormat(components);

      // Pre-Scan Syntax Verification bounding limits targeting standard error tracking UI
      for (const std of dynamicStandards) {
        try {
          // Native validation mimicking DOM checks blocking malformed queries escaping
          document.createDocumentFragment().querySelector(std.selector);
        } catch (e) {
          throw new Error(`Invalid Selector Computed: "${std.selector}" for component "${std.name}". Please map legitimate bounds.`);
        }
      }

      // 2. Retry Logic (Max 3 attempts)
      let response: ValidationResult[] | undefined;
      let attempts = 0;
      let lastError: any = null;

      while (attempts < 3) {
        try {
          response = await sendTabMessage<ValidationResult[]>('START_SCAN', { standards: dynamicStandards });
          break; // Success! Break out of the loop
        } catch (err) {
          attempts++;
          lastError = err;
          if (attempts < 3) {
            await new Promise(resolve => setTimeout(resolve, 500)); // wait 500ms before retry
          }
        }
      }

      if (!response) {
        throw new Error(lastError?.message || 'Receiving end does not exist after 3 attempts.');
      }

      console.log('Received ValidationResult[] from content script:', response);
      setResults(response);
      setCurrentView('RESULTS');
    } catch (err) {
      console.error('Handshake/Scan error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setCurrentView('ERROR');
    }
  };

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
                Start Scan
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
