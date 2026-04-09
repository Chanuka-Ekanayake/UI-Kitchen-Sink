export async function sendTabMessage<T = any>(action: string, payload?: Record<string, any>): Promise<T> {
  // 1. Availability check preventing immediate engine crash
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    throw new Error("Chrome Tabs API unavailable. Missing 'tabs' permission in manifest.");
  }

  // 2. Active Context lookup
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab || !activeTab.id) {
    throw new Error("Could not find a valid active browser tab.");
  }

  // 3. Robust Asynchronous Messaging
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(activeTab.id as number, { action, ...payload }, (response) => {
      // 4. Edge-case disconnection capture masking internal runtime.lastError crash
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "Unknown messaging fault";
        if (
          errorMsg.includes('Receiving end does not exist') ||
          errorMsg.includes('establish connection')
        ) {
          reject(new Error("Connection disconnected: Content Script not fully loaded or webpage is unresponsive. Try refreshing the target lab."));
        } else {
          reject(new Error(`Validation Engine Fault: ${errorMsg}`));
        }
        return;
      }
      resolve(response as T);
    });
  });
}
