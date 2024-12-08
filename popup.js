let apiKey = '';

document.addEventListener('DOMContentLoaded', () => {
  // Load saved API key
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
      apiKey = result.openaiApiKey;
    }
  });

  // Event listeners
  document.getElementById('saveKey').addEventListener('click', saveApiKey);
  document.getElementById('sendMessage').addEventListener('click', sendMessage);
  document.getElementById('analyzeContent').addEventListener('click', analyzeContent);
  document.getElementById('generateContent').addEventListener('click', generateContent);
  document.getElementById('applyChanges').addEventListener('click', applyChanges);
});

async function saveApiKey() {
  const key = document.getElementById('apiKey').value;
  await chrome.storage.local.set({ openaiApiKey: key });
  apiKey = key;
  alert('API key saved successfully!');
}

async function sendMessage() {
  const userInput = document.getElementById('userInput');
  const message = userInput.value.trim();
  
  if (!message) return;

  appendMessage('user', message);
  
  try {
    const response = await callChatGPT(message);
    appendMessage('assistant', response);
  } catch (error) {
    appendMessage('error', 'Error: ' + error.message);
  }
  
  userInput.value = '';
}

function appendMessage(role, content) {
  const chatHistory = document.getElementById('chatHistory');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.textContent = content;
  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function analyzeContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    displayContentStructure(response.structure);
  } catch (error) {
    appendMessage('error', 'Error analyzing content: Make sure you are on a WordPress page with Gutenberg editor');
  }
}

async function generateContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get content structure from content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });
    
    if (response.error) {
      throw new Error(response.error);
    }

    const contentStructure = response.structure;
    const prompt = createPromptFromStructure(contentStructure);
    const generatedContent = await callChatGPT(prompt);
    
    // Store the generated content for later use
    await chrome.storage.local.set({ generatedContent });
    
    appendMessage('assistant', 'Content generated successfully! Review and click "Apply Changes" to update the editor.');
  } catch (error) {
    appendMessage('error', 'Error generating content: ' + error.message);
  }
}

async function applyChanges() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const { generatedContent } = await chrome.storage.local.get(['generatedContent']);
    
    // Send content to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'updateContent',
      content: generatedContent
    });
    
    if (response.error) {
      throw new Error(response.error);
    }

    appendMessage('assistant', 'Content updated successfully!');
  } catch (error) {
    appendMessage('error', 'Error applying changes: ' + error.message);
  }
}

function createPromptFromStructure(structure) {
  const prompt = `Please generate content following this exact structure:
    
Headings (${structure.headings.length}):
${structure.headings.map(h => `- Level ${h.level}: ${h.content}`).join('\n')}

Paragraphs (${structure.paragraphs.length}):
${structure.paragraphs.map(p => `- Words: ${p.wordCount}`).join('\n')}

Please maintain the same number of headings, heading levels, paragraphs, and approximate word counts per paragraph.`;

  return prompt;
}

async function callChatGPT(prompt) {
  if (!apiKey) throw new Error('Please set your OpenAI API key first');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function displayContentStructure(structure) {
  const contentStructureDiv = document.getElementById('contentStructure');
  contentStructureDiv.innerHTML = `
    <p>Headings: ${structure.headings.length}</p>
    <p>Paragraphs: ${structure.paragraphs.length}</p>
    <p>Total words: ${structure.totalWords}</p>
  `;
}