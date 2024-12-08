# WordPress GPT Content Generator Chrome Extension

This Chrome extension integrates with ChatGPT to analyze and generate content for WordPress Gutenberg editor.

## Features

- Analyze existing Gutenberg content structure
- Generate new content while maintaining the same structure
- Interactive chat interface with ChatGPT
- Preserve heading levels and paragraph word counts
- Secure API key storage
- Real-time content updates

## Setup

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory
3. Click the extension icon and enter your OpenAI API key
4. Navigate to your WordPress editor to start using the extension

## Usage

1. Open your WordPress Gutenberg editor
2. Click the extension icon
3. Click "Analyze Content" to scan the current page structure
4. Use the chat interface to refine your content requirements
5. Click "Generate Content" to create new content
6. Review the generated content
7. Click "Apply Changes" to update the editor

## Security Note

Your OpenAI API key is stored securely in Chrome's local storage and is only used for API calls to OpenAI's servers.