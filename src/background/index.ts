import { ScannerMessage } from '../shared/types';

console.log('UI Validator Background Service Worker Running');

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Error enabling Sidepanel click-to-open behavior:', error));
  }
});
chrome.runtime.onMessage.addListener((request: ScannerMessage, sender, sendResponse) => {
  if (request.action === 'RELAY_HIGHLIGHT' || request.action === 'RELAY_CLEAR' || request.action === 'CLEAR_HIGHLIGHT') {
    // Escaping sidepanel bounds dynamically tracking the active DOM viewport independently 
    chrome.tabs.query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          const contentAction = request.action === 'RELAY_HIGHLIGHT' ? 'HIGHLIGHT_ELEMENT' : 'CLEAR_HIGHLIGHT';
          
          chrome.tabs.sendMessage(tabs[0].id, {
            action: contentAction,
            payload: request.action === 'RELAY_HIGHLIGHT' ? request.payload : undefined
          }).catch((err) => console.warn('Background relay failure:', err));
        }
      })
      .catch((err) => console.error('Background tabs query failed:', err));

    sendResponse({ status: 'relayed' });
    return true; // Keep service worker alive for async
  }
});
