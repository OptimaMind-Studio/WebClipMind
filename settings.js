// Settings page script

let defaultPrompt = "";

// Load default prompt from prompt.txt
async function loadDefaultPrompt() {
  try {
    const response = await fetch(chrome.runtime.getURL("prompt.txt"));
    defaultPrompt = await response.text();
  } catch (err) {
    console.error("Failed to load default prompt:", err);
    defaultPrompt = "";
  }
}

// Load settings from storage
async function loadSettings() {
  const data = await chrome.storage.local.get([
    "apiKey",
    "roleField",
    "fieldField",
    "languageField",
    "customPrompt"
  ]);

  if (data.apiKey) {
    document.getElementById("apiKey").value = data.apiKey;
  }

  if (data.roleField) {
    document.getElementById("roleField").value = data.roleField;
  }

  if (data.fieldField) {
    document.getElementById("fieldField").value = data.fieldField;
  }

  if (data.languageField) {
    document.getElementById("languageField").value = data.languageField;
  }

  // Load custom prompt or default prompt
  if (data.customPrompt) {
    document.getElementById("customPrompt").value = data.customPrompt;
  } else {
    // Load default prompt if no custom prompt exists
    await loadDefaultPrompt();
    if (defaultPrompt) {
      document.getElementById("customPrompt").value = defaultPrompt;
    }
  }
}

// Save settings to storage
async function saveSettings() {
  const apiKey = document.getElementById("apiKey").value.trim();
  const roleField = document.getElementById("roleField").value.trim();
  const fieldField = document.getElementById("fieldField").value.trim();
  const languageField = document.getElementById("languageField").value.trim();
  const customPrompt = document.getElementById("customPrompt").value.trim();

  await chrome.storage.local.set({
    apiKey,
    roleField,
    fieldField,
    languageField,
    customPrompt
  });

  // Show success message
  const saveBtn = document.getElementById("saveBtn");
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Saved!";
  saveBtn.disabled = true;
  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }, 2000);
}

// Reset to default prompt
async function resetToDefault() {
  if (confirm("Are you sure you want to reset the prompt to default? This will overwrite your custom prompt.")) {
    await loadDefaultPrompt();
    if (defaultPrompt) {
      document.getElementById("customPrompt").value = defaultPrompt;
    }
    await saveSettings();
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
  await loadDefaultPrompt();
  await loadSettings();

  document.getElementById("saveBtn").addEventListener("click", saveSettings);
  document.getElementById("resetBtn").addEventListener("click", resetToDefault);
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "popup.html";
  });

  // Auto-save on blur for text fields
  document.getElementById("apiKey").addEventListener("blur", saveSettings);
  document.getElementById("roleField").addEventListener("blur", saveSettings);
  document.getElementById("fieldField").addEventListener("blur", saveSettings);
  document.getElementById("languageField").addEventListener("blur", saveSettings);
});

