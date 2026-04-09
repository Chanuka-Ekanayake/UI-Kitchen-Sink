import React, { useState, useEffect } from 'react';
import { ValidationResult, ScannerMessage } from '../shared/types';
import { MOCK_STANDARDS } from '../shared/schema';
import { GlobalSummary } from './components/GlobalSummary';
import { ResultCard } from './components/ResultCard';

export default function App() {
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearResults = () => {
    setResults(null);
    setError(null);
  };

  const handleScan = async () => {
    try {
      setIsScanning(true);
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
          console.warn(`CRITICAL: Failed trying to load path: ${injectionPath}. Check dist/manifest.json to verify the exact build artifact name.`);
        });

        // Give the script a moment to evaluate
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      const message: ScannerMessage = {
        action: 'START_SCAN',
        standards: MOCK_STANDARDS
      };

      // 2. Retry Logic (Max 3 attempts)
      let response: ValidationResult[] | undefined;
      let attempts = 0;
      let lastError: any = null;

      while (attempts < 3) {
        try {
          response = await chrome.tabs.sendMessage(tab.id, message) as ValidationResult[];
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
      setIsScanning(false);
    } catch (err) {
      console.error('Handshake/Scan error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsScanning(false);
    }
  };

  const renderContent = () => {
    // View 2: Loading State
    if (isScanning) {
      return (
        <div className="flex flex-col items-center justify-center py-8 opacity-100 transition-opacity duration-300">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#008000] mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Scanning in progress...</p>
        </div>
      );
    }

    // View 4: Error State
    if (error !== null) {
      return (
        <div className="flex flex-col items-center w-full opacity-100 transition-opacity duration-300">
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
    }

    // View 3: Dashboard View
    if (results !== null) {
      return (
        <div className="w-full opacity-100 transition-opacity duration-300 flex flex-col">
          <GlobalSummary results={results} />
          
          <div className="flex-1 w-full mb-4 overflow-y-auto max-h-[400px] pr-2 pb-1 scrollbar-thin">
            {results.map((result, idx) => (
              <ResultCard key={`${result.elementSelector}-${idx}`} result={result} />
            ))}
          </div>

          <button
            onClick={clearResults}
            className="text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-100 font-medium py-2 px-6 rounded-md transition-all shadow-sm w-full text-sm"
          >
            Clear Results
          </button>
        </div>
      );
    }

    // View 1: Home View (Empty State)
    return (
      <div className="w-full opacity-100 transition-opacity duration-300">
        <button
          onClick={handleScan}
          className="bg-[#008000] hover:bg-[#006000] text-white font-medium py-2.5 px-6 rounded-md transition-all shadow-sm active:scale-95 w-full"
        >
          Scan Page
        </button>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center font-sans tracking-wide">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center max-w-sm w-full transition-all duration-300">
        <h1 className="text-xl font-medium text-gray-800 mb-6 text-center">
          UI Standardization Scanner
        </h1>
        {renderContent()}
      </div>
    </div>
  );
}
