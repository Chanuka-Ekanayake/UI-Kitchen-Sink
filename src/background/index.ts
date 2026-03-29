chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');

  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  }

});

export { };
