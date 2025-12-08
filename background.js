// Background service worker for Clip Mind extension

// Helper function to save clip
async function saveClip(text, tab) {
  if (!text || text.trim() === "") {
    return false;
  }

  // Get page information from content script
  const results = await chrome.tabs.sendMessage(tab.id, {
    action: "getPageInfo"
  });

  if (results) {
    const clip = {
      timestamp: Date.now(),
      text: text.trim(),
      url: tab.url,
      position: results.scrollPosition || 0,
      domain: new URL(tab.url).hostname
    };

    // Save clip to storage
    const data = await chrome.storage.local.get(["clips", "pages"]);
    const clips = data.clips || [];
    const pages = data.pages || [];

    clips.push(clip);

    // Update or add page info
    const pageIndex = pages.findIndex(p => p.url === tab.url);
    const pageInfo = {
      timestamp: Date.now(),
      url: tab.url,
      domain: new URL(tab.url).hostname
    };

    if (pageIndex >= 0) {
      // Update existing page (keep original timestamp)
      pageInfo.timestamp = pages[pageIndex].timestamp;
      pages[pageIndex] = pageInfo;
    } else {
      // Add new page
      pages.push(pageInfo);
    }

    await chrome.storage.local.set({ clips, pages });

    return true;
  }
  return false;
}

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addClip",
    title: "Add to Clip Mind",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "addClip" && info.selectionText) {
    await saveClip(info.selectionText, tab);
  }
});

// Handle keyboard shortcut (Alt+M)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "add-clip") {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      try {
        // Get selected text from content script
        const results = await chrome.tabs.sendMessage(tab.id, {
          action: "getSelectedText"
        });

        if (results && results.selectedText) {
          await saveClip(results.selectedText, tab);
        }
      } catch (error) {
        // Error accessing page (e.g., chrome:// pages)
        console.error("Error getting selected text:", error);
      }
    }
  }
});

// Handle copy to clipboard requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "copyToClipboard") {
    // Forward to active tab's content script to copy
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "copyText",
          text: request.text
        }, (response) => {
          sendResponse(response || { success: false });
        });
      } else {
        sendResponse({ success: false, error: "No active tab" });
      }
    });
    return true; // Indicates we will send a response asynchronously
  }
});

