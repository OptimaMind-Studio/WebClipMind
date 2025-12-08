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
  } else if (request.action === "copyText") {
    // Copy text to clipboard in page context
    const textarea = document.createElement("textarea");
    textarea.value = request.text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      sendResponse({ success: successful });
    } catch (err) {
      document.body.removeChild(textarea);
      sendResponse({ success: false, error: err.message });
    }
  }
  return true;
});

