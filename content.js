// Ajoutez ce code au début du fichier content.js
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = function() {
    script.remove();
  };
}
// Ajouter au début du fichier content.js
console.log('Content script chargé');

// Injecter le script dès que possible
injectScript();

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM chargé');
  // Réinjecter le script au cas où
  injectScript();
});

window.addEventListener('load', () => {
  console.log('Page entièrement chargée');
  // Une dernière tentative d'injection
  injectScript();
});

// Function to analyze Gutenberg content
function getGutenbergContent() {
  return new Promise((resolve) => {
    const handleMessage = (event) => {
      if (event.data.type === 'WP_CONTENT_RESPONSE') {
        window.removeEventListener('message', handleMessage);
        const blocks = event.data.data;
        // Traitement des blocks comme avant
        const structure = {
          headings: [],
          paragraphs: [],
          totalWords: 0
        };
        
        blocks.forEach(block => {
          if (block.name === 'core/heading') {
            structure.headings.push({
              content: block.attributes.content,
              level: block.attributes.level
            });
          } else if (block.name === 'core/paragraph') {
            const words = block.attributes.content.trim().split(/\s+/).length;
            structure.paragraphs.push({
              content: block.attributes.content,
              wordCount: words
            });
            structure.totalWords += words;
          }
        });
        
        resolve({ structure });
      } else if (event.data.type === 'WP_CONTENT_ERROR') {
        resolve({ error: event.data.error });
      }
    };
    
    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'GET_WP_CONTENT' }, '*');
  });
}

// Function to update Gutenberg content
function updateGutenbergContent(newContent) {
  try {
    // Check if we're in Gutenberg editor
    if (typeof wp === 'undefined' || !wp.data || !wp.data.select('core/block-editor')) {
      return { error: 'WordPress Gutenberg editor not found' };
    }

    const blocks = wp.data.select('core/block-editor').getBlocks();
    const { dispatch } = wp.data;
    const blockEditor = dispatch('core/block-editor');

    // Parse the new content and map it to existing blocks
    const contentLines = newContent.split('\n\n');
    let contentIndex = 0;

    blocks.forEach(block => {
      if (['core/heading', 'core/paragraph'].includes(block.name) && contentIndex < contentLines.length) {
        blockEditor.updateBlock(block.clientId, {
          ...block,
          attributes: {
            ...block.attributes,
            content: contentLines[contentIndex].trim()
          }
        });
        contentIndex++;
      }
    });

    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

// Function to check if Gutenberg is ready
function isGutenbergReady() {
  return new Promise((resolve) => {
    const maxAttempts = 10;
    let attempts = 0;
    
    const checkGutenberg = () => {
      try {
        console.log('Tentative', attempts + 1, 'de', maxAttempts);
        
        // Vérifie plusieurs sélecteurs possibles pour l'éditeur Gutenberg
        const gutenbergSelectors = [
          '.block-editor-block-list__layout',
          '.editor-styles-wrapper',
          '.wp-block-post-content',
          '#editor'
        ];
        
        const editorExists = gutenbergSelectors.some(selector => 
          document.querySelector(selector) !== null
        );
        
        if (editorExists) {
          console.log('Éditeur Gutenberg détecté');
          resolve(true);
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.log('Nombre maximum de tentatives atteint');
          resolve(false);
          return;
        }
        
        attempts++;
        setTimeout(checkGutenberg, 2000); // Augmenté à 2 secondes
      } catch (error) {
        console.error('Erreur dans checkGutenberg:', error);
        attempts++;
        setTimeout(checkGutenberg, 2000);
      }
    };
    
    if (document.readyState === 'complete') {
      checkGutenberg();
    } else {
      window.addEventListener('load', checkGutenberg);
    }
  });
}

// Fonction handleMessage asynchrone
async function handleMessage(request) {
  console.log('Message reçu dans content script:', request);
  
  if (request.action === 'getContent') {
    return await getGutenbergContent();
  } else if (request.action === 'updateContent') {
    return updateGutenbergContent(request.content);
  }
  
  return { error: 'Unknown action' };
}

// Modifier le listener pour gérer correctement les promesses
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message reçu dans content script:', request);
  
  isGutenbergReady().then(async isReady => {
    if (isReady) {
      const response = await handleMessage(request);
      sendResponse(response);
    } else {
      sendResponse({ error: 'Gutenberg editor not ready' });
    }
  });
  
  return true;
});

