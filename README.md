# Clip Mind

A Chrome extension for quickly saving and organizing text clips from web pages.

## Features

- **Quick Capture**: Select text and save it with a keyboard shortcut (`Command+Shift+K` on Mac, `Ctrl+Shift+K` on Windows/Linux) or right-click menu
- **Smart Storage**: Automatically records timestamp, URL, scroll position, and domain for each clip
- **Multiple Sort Modes**:
  - By timestamp (chronological order)
  - By URL group (grouped by URL, sorted by first visit time)
  - By domain group (grouped by domain, sorted by first visit time)
- **Export to Clipboard**: Export selected clips in Markdown format

## Usage

1. Select text on any webpage
2. Press `Command+Shift+K` (Mac) or `Ctrl+Shift+K` (Windows/Linux), or right-click and choose "Add to Clip Mind"
3. Click the extension icon to view and manage your clips
4. Choose an export mode and click "Export to Clipboard"

## Export Format

Each clip is exported in the following format:

```
【YYYY-MM-DD HH:MM:SS】: [domain](url)
text content
```

Clips are separated by blank lines.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the ClipMind folder

