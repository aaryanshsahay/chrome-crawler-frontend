// Service Worker for Smart Scraper v2

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  // console.log('Smart Scraper v2 installed')
})

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id })
  }
})

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log('Message received:', request)

  if (request.type === 'GET_DATA') {
    // Handle data requests from content scripts
    sendResponse({ success: true, data: {} })
  } else if (request.type === 'ELEMENT_SELECTED') {
    // Store selected element payload
    // console.log('Element selected:', request.payload)
    chrome.storage.local.set({ selectedElement: request.payload }, () => {
      // console.log('Element payload stored in background')
      sendResponse({ success: true, message: 'Element saved' })
    })
    return true // Keep the message channel open for async response
  }
})
