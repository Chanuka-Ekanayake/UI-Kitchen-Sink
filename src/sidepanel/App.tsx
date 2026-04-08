import React, { useState } from 'react';
import { ValidationResult, ScannerMessage } from '../shared/types';
import { MOCK_STANDARDS } from '../shared/schema';

export default function App() {
  const [status, setStatus] = useState<string>('Ready to scan');

  const handleScan = async () => {
    try {
      setStatus('Scanning...');
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (!tab || !tab.id) {
        throw new Error('No active tab found.');
      }

      // Handle cases where the user tries to scan a restricted Chrome page
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('https://chrome.google.com/webstore')) {
        throw new Error('Cannot scan restricted browser pages.');
      }

      const message: ScannerMessage = {
        action: 'START_SCAN',
        standards: MOCK_STANDARDS
      };

      const response = await chrome.tabs.sendMessage(tab.id, message) as ValidationResult[];
      
      console.log('Received ValidationResult[] from content script:', response);
      setStatus('Scan successful! Check sidepanel console.');
    } catch (error) {
      console.error('Handshake/Scan error:', error);
      setStatus(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center font-sans tracking-wide">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center max-w-sm w-full">
        <h1 className="text-xl font-semibold text-gray-800 mb-6 font-medium">UI Standardization Scanner</h1>
        
        <button 
          onClick={handleScan}
          className="bg-[#008000] hover:bg-[#006000] text-white font-medium py-2.5 px-6 rounded-md transition-all shadow-sm active:scale-95 w-full"
        >
          Scan Page
        </button>
        
        <p className="mt-4 text-sm text-gray-500 min-h-[20px] text-center">
          {status}
        </p>
      </div>
    </div>
  );
}
