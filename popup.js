// Popup script for Clip Mind extension

let clips = [];
let pages = [];

// Load data from storage
async function loadData() {
  const data = await chrome.storage.local.get(["clips", "pages"]);
  clips = data.clips || [];
  pages = data.pages || [];
  renderClips();
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
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
  }
}

async function clearAll() {
  await chrome.storage.local.set({ clips: [], pages: [] });
  clips = [];
  pages = [];
  renderClips();
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  
  document.getElementById("exportBtn").addEventListener("click", exportToClipboard);
  document.getElementById("clearAll").addEventListener("click", clearAll);
  
  // Refresh display when export mode changes
  document.getElementById("exportMode").addEventListener("change", () => {
    renderClips();
  });
  
  // Listen for storage changes to update UI
  chrome.storage.onChanged.addListener(() => {
    loadData();
  });
});
