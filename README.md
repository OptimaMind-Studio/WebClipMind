# Web Clip Mind

A Chrome extension for quickly saving and organizing text clips from web pages with AI-powered summarization.

## Features

- **Quick Capture**: Select text and save with keyboard shortcut (`Command+Shift+Z` on Mac, `Ctrl+Shift+Z` on Windows/Linux) or right-click menu
- **Smart Storage**: Automatically records timestamp, URL, scroll position, and domain
- **Multiple Sort Modes**: By timestamp, URL group, or domain group
- **Export to Clipboard**: Export selected clips in Markdown format
- **AI Summary**: Generate AI-powered summaries using Gemini API with customizable prompts

## Usage

1. Select text on any webpage
2. Press `Command+Shift+Z` (Mac) or `Ctrl+Shift+Z` (Windows/Linux), or right-click and choose "Add to Clip Mind"
3. Click the extension icon to view and manage clips
4. Choose export mode and click "Export to Clipboard" or "Export AI Summary"
5. Configure API key and prompt settings in Settings page

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
4. Select the WebClipMind folder

## Release Notes

### 2025-12-08 v2.1.0
- **Prompt Enhancement**: Reference link list output, citation numbering in summaries

### 2025-12-08 v2.0.0
- **AI Summary**: Gemini API integration, custom prompt support
- **Settings Page**: API key configuration, Role/Field/Language fields, custom prompt editor
- **Field Replacement**: {{Role}}, {{Field}}, {{Language}}, {{Browsing Records}} template variables

### 2025-12-03 v1.0.0
- **Quick Capture**: Keyboard shortcut, right-click menu
- **Smart Storage**: Timestamp, URL, scroll position, domain tracking
- **Sort Modes**: Timestamp, URL group, domain group
- **Export**: Markdown format export to clipboard

