window.addEventListener('message', function(event) {
  if (event.data.type === 'GET_WP_CONTENT') {
    try {
      const editor = wp.data.select('core/block-editor') || wp.data.select('core/editor');
      const blocks = editor.getBlocks();
      window.postMessage({
        type: 'WP_CONTENT_RESPONSE',
        data: blocks
      }, '*');
    } catch (error) {
      window.postMessage({
        type: 'WP_CONTENT_ERROR',
        error: error.message
      }, '*');
    }
  }
}); 