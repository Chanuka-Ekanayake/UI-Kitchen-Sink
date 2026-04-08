import { ValidationResult, ScannerMessage } from '../shared/types';

console.log('Content script loaded on', window.location.href);

chrome.runtime.onMessage.addListener(
  (request: ScannerMessage, sender, sendResponse) => {
    if (request.action === 'START_SCAN') {
      console.log('Received START_SCAN message with standards:', request.standards);
      
      // Provide a mock response to test the bridge as instructed
      const mockResult: ValidationResult[] = [
        {
          elementSelector: 'button.btn-primary',
          componentName: 'Primary Button',
          score: 50,
          results: [
            {
              property: 'background-color',
              expected: 'rgb(0, 128, 0)',
              actual: 'rgb(5, 150, 105)',
              passed: false,
              severity: 'error'
            },
            {
              property: 'border-radius',
              expected: '5px',
              actual: '5px',
              passed: true,
              severity: 'warning'
            }
          ]
        }
      ];

      // Use a brief timeout to simulate asynchronous scanning work
      setTimeout(() => {
        console.log('Sending back mock ValidationResult array');
        sendResponse(mockResult);
      }, 300);

      // Crucial: return true to keep the message channel open for the async response
      return true;
    }
  }
);

export {};
