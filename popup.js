// Popup script for Clip Mind extension

let clips = [];
let pages = [];
let promptTemplate = "";

// Load data from storage
async function loadData() {
  const data = await chrome.storage.local.get([
    "clips",
    "pages",
    "apiKey",
    "roleField",
    "fieldField",
    "languageField",
    "customPrompt"
  ]);
  clips = data.clips || [];
  pages = data.pages || [];
  
  // Load prompt template (custom or default)
  await loadPromptTemplate();
  
  renderClips();
}

// Load prompt template from storage or prompt.txt
async function loadPromptTemplate() {
  const data = await chrome.storage.local.get(["customPrompt"]);
  
  if (data.customPrompt) {
    promptTemplate = data.customPrompt;
  } else {
    // Load default prompt from prompt.txt
    try {
      const response = await fetch(chrome.runtime.getURL("prompt.txt"));
      promptTemplate = await response.text();
    } catch (err) {
      console.error("Failed to load prompt template:", err);
      promptTemplate = "{{Browsing Records}}";
    }
  }
}

// Get sorted clips based on current export mode
function getSortedClipsForDisplay() {
  const mode = document.getElementById("exportMode")?.value || "timestamp";
  
  switch (mode) {
    case "timestamp":
      // Sort by timestamp (oldest first for display, matching export order)
      return [...clips].sort((a, b) => a.timestamp - b.timestamp);
    
    case "url":
      // Group by URL, sort URLs by first visit, clips within URL by timestamp
      const urlGroups = {};
      clips.forEach(clip => {
        if (!urlGroups[clip.url]) {
          urlGroups[clip.url] = [];
        }
        urlGroups[clip.url].push(clip);
      });
      
      const sortedUrls = Object.keys(urlGroups).sort((a, b) => {
        const pageA = pages.find(p => p.url === a);
        const pageB = pages.find(p => p.url === b);
        const timeA = pageA ? pageA.timestamp : 0;
        const timeB = pageB ? pageB.timestamp : 0;
        return timeA - timeB;
      });
      
      const allClips = [];
      sortedUrls.forEach(url => {
        const sortedClips = urlGroups[url].sort((a, b) => a.timestamp - b.timestamp);
        allClips.push(...sortedClips);
      });
      return allClips;
    
    case "domain":
      // Group by domain, sort domains by first visit, clips within domain by timestamp
      const domainGroups = {};
      clips.forEach(clip => {
        const domain = clip.domain || new URL(clip.url).hostname;
        if (!domainGroups[domain]) {
          domainGroups[domain] = [];
        }
        domainGroups[domain].push(clip);
      });
      
      const sortedDomains = Object.keys(domainGroups).sort((a, b) => {
        const pagesA = pages.filter(p => p.domain === a);
        const pagesB = pages.filter(p => p.domain === b);
        const timeA = pagesA.length > 0 ? Math.min(...pagesA.map(p => p.timestamp)) : 0;
        const timeB = pagesB.length > 0 ? Math.min(...pagesB.map(p => p.timestamp)) : 0;
        return timeA - timeB;
      });
      
      const allClipsDomain = [];
      sortedDomains.forEach(domain => {
        const sortedClips = domainGroups[domain].sort((a, b) => a.timestamp - b.timestamp);
        allClipsDomain.push(...sortedClips);
      });
      return allClipsDomain;
    
    default:
      return [...clips].sort((a, b) => a.timestamp - b.timestamp);
  }
}

// Render clips list
function renderClips() {
  const clipsList = document.getElementById("clipsList");
  
  if (clips.length === 0) {
    clipsList.innerHTML = '<div class="empty-state">No clips yet. Select text and right-click to add clips.</div>';
    return;
  }

  // Get sorted clips based on current export mode
  const sortedClips = getSortedClipsForDisplay();

  clipsList.innerHTML = sortedClips.map((clip, index) => {
    const date = new Date(clip.timestamp);
    const dateStr = date.toLocaleString();
    const domain = clip.domain || new URL(clip.url).hostname;
    
    return `
      <div class="clip-item" data-index="${index}">
        <div class="clip-header">
          <input type="checkbox" class="clip-checkbox" data-id="${clip.timestamp}" checked>
          <span class="clip-domain">${escapeHtml(domain)}</span>
          <span class="clip-time">${dateStr}</span>
        </div>
        <div class="clip-text">${escapeHtml(clip.text)}</div>
        <div class="clip-url">${escapeHtml(clip.url)}</div>
        <button class="btn-delete" data-id="${clip.timestamp}">Delete</button>
      </div>
    `;
  }).join("");

  // Attach delete button handlers
  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = parseInt(e.target.dataset.id);
      clips = clips.filter(c => c.timestamp !== id);
      await chrome.storage.local.set({ clips });
      loadData();
    });
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Format timestamp to readable string
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Format a single clip to markdown format
function formatClip(clip) {
  const timestamp = formatTimestamp(clip.timestamp);
  const domain = clip.domain || new URL(clip.url).hostname;
  // Format: 【timestamp】: [link](domain)
  // link is the URL, domain is shown as link text, URL is the actual link
  return `【${timestamp}】: [${domain}](${clip.url})\n${clip.text}`;
}

// Export functions
function exportByTimestamp() {
  const checkedClips = getCheckedClips();
  const sorted = checkedClips.sort((a, b) => a.timestamp - b.timestamp);
  return sorted.map(clip => formatClip(clip)).join("\n\n");
}

function exportByURL() {
  const checkedClips = getCheckedClips();
  const urlGroups = {};
  
  checkedClips.forEach(clip => {
    if (!urlGroups[clip.url]) {
      urlGroups[clip.url] = [];
    }
    urlGroups[clip.url].push(clip);
  });

  // Sort URLs by first visit timestamp
  const sortedUrls = Object.keys(urlGroups).sort((a, b) => {
    const pageA = pages.find(p => p.url === a);
    const pageB = pages.find(p => p.url === b);
    const timeA = pageA ? pageA.timestamp : 0;
    const timeB = pageB ? pageB.timestamp : 0;
    return timeA - timeB;
  });

  const allClips = [];
  sortedUrls.forEach(url => {
    // Sort clips within URL group by timestamp
    const sortedClips = urlGroups[url].sort((a, b) => a.timestamp - b.timestamp);
    allClips.push(...sortedClips);
  });

  return allClips.map(clip => formatClip(clip)).join("\n\n");
}

function exportByDomain() {
  const checkedClips = getCheckedClips();
  const domainGroups = {};
  
  checkedClips.forEach(clip => {
    const domain = clip.domain || new URL(clip.url).hostname;
    if (!domainGroups[domain]) {
      domainGroups[domain] = [];
    }
    domainGroups[domain].push(clip);
  });

  // Sort domains by first visit timestamp
  const sortedDomains = Object.keys(domainGroups).sort((a, b) => {
    const pagesA = pages.filter(p => p.domain === a);
    const pagesB = pages.filter(p => p.domain === b);
    const timeA = pagesA.length > 0 ? Math.min(...pagesA.map(p => p.timestamp)) : 0;
    const timeB = pagesB.length > 0 ? Math.min(...pagesB.map(p => p.timestamp)) : 0;
    return timeA - timeB;
  });

  const allClips = [];
  sortedDomains.forEach(domain => {
    // Sort clips within domain group by timestamp
    const sortedClips = domainGroups[domain].sort((a, b) => a.timestamp - b.timestamp);
    allClips.push(...sortedClips);
  });

  return allClips.map(clip => formatClip(clip)).join("\n\n");
}

function getCheckedClips() {
  const checkboxes = document.querySelectorAll(".clip-checkbox:checked");
  const checkedIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
  return clips.filter(c => checkedIds.includes(c.timestamp));
}

// Reliable clipboard copy function that works even when document loses focus
async function copyToClipboard(text) {
  // Try modern clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.log("Clipboard API failed, trying background method:", err);
  }
  
  // Fallback: use background script to copy via content script
  try {
    const response = await chrome.runtime.sendMessage({
      action: "copyToClipboard",
      text: text
    });
    
    if (response && response.success) {
      return true;
    } else {
      throw new Error(response?.error || "Background copy failed");
    }
  } catch (err) {
    console.error("Background copy method also failed:", err);
    // Final fallback: use textarea method in popup
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      textarea.style.top = "-999999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      
      if (successful) {
        return true;
      } else {
        throw new Error("execCommand('copy') failed");
      }
    } catch (fallbackErr) {
      throw new Error("All copy methods failed: " + fallbackErr.message);
    }
  }
}

async function exportToClipboard() {
  const mode = document.getElementById("exportMode").value;
  let text = "";

  switch (mode) {
    case "timestamp":
      text = exportByTimestamp();
      break;
    case "url":
      text = exportByURL();
      break;
    case "domain":
      text = exportByDomain();
      break;
  }

  if (text.trim() === "") {
    return;
  }

  try {
    await copyToClipboard(text);
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    alert("Failed to copy to clipboard. Please try again.");
  }
}

async function clearAll() {
  await chrome.storage.local.set({ clips: [], pages: [] });
  clips = [];
  pages = [];
  renderClips();
}

// Settings are managed in settings.html, no need to save here

// Get formatted clips text (same format as Export to Clipboard)
function getFormattedClipsText() {
  const mode = document.getElementById("exportMode").value;
  let text = "";

  switch (mode) {
    case "timestamp":
      text = exportByTimestamp();
      break;
    case "url":
      text = exportByURL();
      break;
    case "domain":
      text = exportByDomain();
      break;
  }

  return text;
}

// Call Gemini API to generate AI summary
async function callGeminiAPI(apiKey, prompt) {
  // Use v1 API directly (faster, more stable)
  const model = "gemini-2.5-pro";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!result) {
      throw new Error("Empty response from API");
    }
    
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error("API request timeout (exceeded 2 minutes)");
    }
    throw err;
  }
}

// Export AI Summary
async function exportAISummary() {
  // Get settings from storage
  const data = await chrome.storage.local.get([
    "apiKey",
    "roleField",
    "fieldField",
    "languageField",
    "customPrompt"
  ]);

  const apiKey = data.apiKey || "";
  
  if (!apiKey) {
    alert("Please enter your Gemini API key in Settings first.");
    return;
  }

  // Reload prompt template in case it was updated
  await loadPromptTemplate();

  // Get formatted clips text
  const clipsText = getFormattedClipsText();
  
  if (clipsText.trim() === "") {
    alert("No clips selected. Please select at least one clip.");
    return;
  }

  // Get role, field, and language fields from storage
  const roleField = data.roleField || "Beginner";
  const fieldField = data.fieldField || "AI";
  const languageField = data.languageField || "English";

  // First, copy the formatted clips text (same as Export to Clipboard)
  await copyToClipboard(clipsText);

  // Replace all placeholders in prompt template
  let finalPrompt = promptTemplate;
  finalPrompt = finalPrompt.replace(/\{\{Browsing Records\}\}/g, clipsText);
  finalPrompt = finalPrompt.replace(/\{\{Role\}\}/g, roleField);
  finalPrompt = finalPrompt.replace(/\{\{Field\}\}/g, fieldField);
  finalPrompt = finalPrompt.replace(/\{\{Language\}\}/g, languageField);

  // Show final prompt in dialog
  alert("Final Prompt:\n\n" + finalPrompt);

  // Show loading state
  const exportAIBtn = document.getElementById("exportAIBtn");
  const originalText = exportAIBtn.textContent;
  exportAIBtn.disabled = true;
  exportAIBtn.textContent = "Generating...";

  try {
    // Call Gemini API
    const aiResponse = await callGeminiAPI(apiKey, finalPrompt);
    
    if (!aiResponse) {
      throw new Error("Empty response from API");
    }

    // Show AI response in dialog
    alert("AI Summary:\n\n" + aiResponse);

    // Copy to clipboard in background
    await copyToClipboard(aiResponse);
    
    // Show success message
    exportAIBtn.textContent = "Copied!";
    setTimeout(() => {
      exportAIBtn.textContent = originalText;
      exportAIBtn.disabled = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to generate AI summary:", err);
    alert(`Failed to generate AI summary: ${err.message}`);
    exportAIBtn.textContent = originalText;
    exportAIBtn.disabled = false;
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  
  document.getElementById("exportBtn").addEventListener("click", exportToClipboard);
  document.getElementById("exportAIBtn").addEventListener("click", exportAISummary);
  document.getElementById("clearAll").addEventListener("click", clearAll);
  document.getElementById("settingsBtn").addEventListener("click", () => {
    window.location.href = "settings.html";
  });
  
  // Refresh display when export mode changes
  document.getElementById("exportMode").addEventListener("change", () => {
    renderClips();
  });
  
  // Listen for storage changes to update UI
  chrome.storage.onChanged.addListener(() => {
    loadData();
  });
});
