// Content script to get page information

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageInfo") {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    sendResponse({ scrollPosition });
  } else if (request.action === "getSelectedText") {
    const selectedText = window.getSelection().toString().trim();
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    sendResponse({ 
      selectedText,
      scrollPosition 
    });
  }
  return true;
});

