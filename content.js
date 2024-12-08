// Ajouter au début du fichier content.js
console.log('Content script chargé');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM chargé');
});

window.addEventListener('load', () => {
  console.log('Page entièrement chargée');
});

// Function to analyze Gutenberg content
function getGutenbergContent() {
  console.log('Démarrage de getGutenbergContent');
  
  // Vérification de l'environnement
  console.log({
    wpExists: typeof wp !== 'undefined',
    wpData: wp?.data ? 'exists' : 'missing',
    document: document.readyState,
    url: window.location.href
  });

  try {
    // Ajout de logs de débogage
    console.log('wp object:', typeof wp);
    console.log('wp.data:', typeof wp.data);
    console.log('block-editor:', wp.data?.select('core/block-editor'));
    console.log('editor:', wp.data?.select('core/editor'));

    if (typeof wp === 'undefined') {
      return { error: 'WordPress not detected' };
    }

    // Vérification explicite de wp.data
    if (!wp.data) {
      return { error: 'wp.data is not available' };
    }

    // Récupération du sélecteur approprié
    const editor = wp.data.select('core/block-editor') || wp.data.select('core/editor');
    if (!editor) {
      return { error: 'Neither block-editor nor editor is available' };
    }

    const blocks = editor.getBlocks();
    console.log('Blocks found:', blocks);

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

    return { structure };
  } catch (error) {
    console.error('Erreur dans getGutenbergContent:', error);
    return { error: error.message };
  }
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
        
        if (document.querySelector('.block-editor-block-list__layout')) {
          console.log('Éditeur Gutenberg détecté dans le DOM');
          resolve(true);
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.log('Nombre maximum de tentatives atteint');
          resolve(false);
          return;
        }
        
        attempts++;
        setTimeout(checkGutenberg, 1000);
      } catch (error) {
        console.error('Erreur dans checkGutenberg:', error);
        attempts++;
        setTimeout(checkGutenberg, 1000);
      }
    };
    
    checkGutenberg();
  });
}

// Gestionnaire de messages
function handleMessage(request) {
  console.log('Message reçu dans content script:', request);
  
  if (request.action === 'getContent') {
    return getGutenbergContent();
  } else if (request.action === 'updateContent') {
    return updateGutenbergContent(request.content);
  }
  
  return { error: 'Unknown action' };
}

// Remplacer l'ancien listener par celui-ci
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message reçu dans content script:', request);
  
  isGutenbergReady().then(isReady => {
    if (isReady) {
      const response = handleMessage(request);
      sendResponse(response);
    } else {
      sendResponse({ error: 'Gutenberg editor not ready' });
    }
  });
  
  return true; // Important pour le traitement asynchrone
});