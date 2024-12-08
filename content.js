// Function to analyze Gutenberg content
function getGutenbergContent() {
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
    const checkGutenberg = () => {
      if (
        typeof wp !== 'undefined' &&
        wp.data &&
        (wp.data.select('core/block-editor') || wp.data.select('core/editor'))
      ) {
        resolve(true);
      } else if (document.readyState === 'complete') {
        resolve(false);
      } else {
        setTimeout(checkGutenberg, 100);
      }
    };
    checkGutenberg();
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  isGutenbergReady().then(isReady => {
    if (!isReady) {
      sendResponse({ 
        error: 'Gutenberg editor not ready. Please make sure you are on a WordPress page with Gutenberg editor and the page is fully loaded.' 
      });
      return;
    }

    if (request.action === 'getContent') {
      sendResponse(getGutenbergContent());
    } else if (request.action === 'updateContent') {
      sendResponse(updateGutenbergContent(request.content));
    }
  });
  return true; // Important pour garder la connexion ouverte pour la réponse asynchrone
});