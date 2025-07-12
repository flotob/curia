/**
 * PostMessage Handler Module
 * 
 * Manages communication between the forum iframe and the host page
 */

import { EmbedUrls } from '../types/EmbedTypes';

/**
 * Generate PostMessage handling JavaScript code
 */
export function generatePostMessageCode(urls: EmbedUrls): string {
  return `
  // Listen for messages from iframes
  function handleMessage(event) {
    // Verify origin for security
    const allowedOrigins = ['${urls.hostUrl}', '${urls.forumUrl}'];
    if (!allowedOrigins.includes(event.origin)) {
      return;
    }

    const data = event.data;
    
    // Handle auth completion from embed iframe
    if (data && data.type === 'curia-auth-complete') {
      console.log('[Curia] Auth completion received:', data);
      switchToForum(data);
      return;
    }

    // Handle iframe resize requests
    if (data && data.type === 'curia-resize' && data.height) {
      if (iframe) {
        iframe.style.height = data.height + 'px';
        console.log('[Curia] Resized to height:', data.height);
      }
      return;
    }

    // Handle PostMessage API requests from forum (future implementation)
    if (data && data.type === 'api_request' && currentPhase === 'forum') {
      console.log('[Curia] API request from forum:', data.method);
      // TODO: Route to actual API endpoints with auth context
      return;
    }
  }

  // Add message listener for iframe communication
  if (window.addEventListener) {
    window.addEventListener('message', handleMessage, false);
  } else {
    // IE8 fallback
    window.attachEvent('onmessage', handleMessage);
  }
  `;
}

/**
 * Generate global embed reference storage code
 */
export function generateEmbedReferenceCode(): string {
  return `
  // Store reference for potential cleanup
  window.curiaEmbed = window.curiaEmbed || {};
  window.curiaEmbed[config.container || 'default'] = {
    iframe: iframe,
    container: container,
    config: config,
    authContext: authContext,
    phase: currentPhase
  };
  `;
} 