/**
 * Curia Embed Script - Customer Integration
 * 
 * This is the JavaScript file that customers include on their sites.
 * It reads configuration from data attributes and creates the iframe.
 * 
 * ARCHITECTURE: Creates embed iframe → listens for curia-auth-complete message 
 * → switches iframe src to forum URL → handles PostMessage API communication
 * 
 * Usage:
 * <script src="https://host.curia.com/embed.js" 
 *         data-community="community-id" 
 *         data-theme="light"
 *         async></script>
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  
  // Resolve environment variables on server-side
  const hostUrl = process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3001';
  const forumUrl = process.env.NEXT_PUBLIC_CURIA_FORUM_URL || 'http://localhost:3000';
  
  // Generate the embed script
  const embedScript = `
(function() {
  'use strict';
  
  // Get the script element that loaded this code
  const script = document.currentScript;
  if (!script) {
    console.error('[Curia] Could not find script element');
    return;
  }

  // Read configuration from data attributes
  const config = {
    community: script.getAttribute('data-community') || null,
    theme: script.getAttribute('data-theme') || 'light',
    container: script.getAttribute('data-container') || null,
    height: script.getAttribute('data-height') || '600px'
  };

  console.log('[Curia] Initializing embed with config:', config);

  // Find or create container
  let container;
  if (config.container) {
    container = document.getElementById(config.container);
    if (!container) {
      console.error('[Curia] Container element not found:', config.container);
      return;
    }
  } else {
    // Create container at script location
    container = document.createElement('div');
    container.id = 'curia-embed-' + Math.random().toString(36).substr(2, 9);
    script.parentNode.insertBefore(container, script);
  }

  // Embed state tracking
  let currentPhase = 'auth'; // 'auth' or 'forum'
  let authContext = null;
  let iframe = null;
  let loadingDiv = null;

  // Build initial embed iframe URL with parameters  
  const buildEmbedUrl = () => {
    const baseUrl = '${hostUrl}/embed';
    const params = new URLSearchParams();
    
    if (config.community) params.append('community', config.community);
    if (config.theme) params.append('theme', config.theme);
    
    return baseUrl + (params.toString() ? '?' + params.toString() : '');
  };

  // Build forum URL for iframe switching
  const buildForumUrl = () => {
    const baseUrl = '${forumUrl}';
    const params = new URLSearchParams();
    
    params.append('mod', 'standalone');
    params.append('cg_theme', config.theme);
    
    if (config.theme === 'dark') {
      params.append('cg_bg_color', '%23161820');
    }
    
    return baseUrl + '?' + params.toString();
  };

  // Create iframe element
  const createIframe = (url) => {
    const newIframe = document.createElement('iframe');
    newIframe.style.width = '100%';
    newIframe.style.height = config.height;
    newIframe.style.border = 'none';
    newIframe.style.borderRadius = '8px';
    newIframe.style.display = 'block';
    newIframe.setAttribute('allowtransparency', 'true');
    newIframe.setAttribute('scrolling', 'no');
    newIframe.title = 'Curia Community Forum';
    
    // Set sandbox permissions (critical for iframe content to load)
    newIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
    
    return newIframe;
  };

  // Create loading state
  const createLoadingDiv = () => {
    const loading = document.createElement('div');
    loading.innerHTML = \`
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: \${config.height};
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        color: #6b7280;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="text-align: center;">
          <div style="
            width: 32px;
            height: 32px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            margin: 0 auto 12px;
            animation: spin 1s linear infinite;
          "></div>
          <div>\${currentPhase === 'auth' ? 'Loading Curia...' : 'Loading forum...'}</div>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    \`;
    return loading;
  };

  // Switch iframe from embed to forum
  const switchToForum = (authData) => {
    console.log('[Curia] Switching to forum phase with auth data:', authData);
    
    currentPhase = 'forum';
    authContext = authData;
    
    // Create new iframe for forum
    const forumIframe = createIframe(buildForumUrl());
    
    // Update loading message
    if (loadingDiv) {
      loadingDiv.innerHTML = loadingDiv.innerHTML.replace('Loading Curia...', 'Loading forum...');
    }
    
    // Replace current iframe with forum iframe
    if (iframe && iframe.parentNode) {
      iframe.parentNode.replaceChild(forumIframe, iframe);
    } else {
      container.appendChild(forumIframe);
    }
    
    iframe = forumIframe;
    
    // Set iframe source
    iframe.src = buildForumUrl();
    
    // Set up forum iframe handlers
    setupForumIframeHandlers(forumIframe);
    
    console.log('[Curia] Switched to forum URL:', buildForumUrl());
  };

  // Handle iframe load success
  const setupIframeHandlers = (targetIframe) => {
    targetIframe.onload = function() {
      console.log('[Curia] Iframe loaded successfully');
      
      try {
        // Hide loading div and show iframe
        if (loadingDiv && container && container.contains(loadingDiv)) {
          loadingDiv.style.display = 'none';
          console.log('[Curia] Loading div hidden');
        }
        
        // Show the iframe
        targetIframe.style.display = 'block';
        console.log('[Curia] Iframe shown');
        
        console.log('[Curia] Embed ready');
      } catch (error) {
        console.warn('[Curia] Error during iframe display:', error);
      }
    };

    // Handle iframe load error
    targetIframe.onerror = function() {
      console.error('[Curia] Failed to load iframe');
      
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = \`
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: \${config.height};
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
            <div><strong>Failed to load Curia</strong></div>
            <div style="font-size: 12px; margin-top: 4px; opacity: 0.7;">
              Check if the service is running at: \${targetIframe.src}
            </div>
          </div>
        </div>
      \`;
      
      // Replace content with error state
      try {
        if (container) {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          container.appendChild(errorDiv);
          console.log('[Curia] Error state displayed');
        }
      } catch (error) {
        console.warn('[Curia] Error showing error state:', error);
      }
    };
  };

  // Set up forum iframe handlers with PostMessage API support
  const setupForumIframeHandlers = (forumIframe) => {
    setupIframeHandlers(forumIframe);
    
    // TODO: Add PostMessage API handling for forum communication
    // This would include handling getUserInfo, getCommunityInfo, etc.
    console.log('[Curia] Forum iframe handlers set up (PostMessage API pending)');
  };

  // Initialize embed iframe
  const initializeEmbed = () => {
    // Clear container and add loading state
    container.innerHTML = '';
    container.style.position = 'relative';
    
    loadingDiv = createLoadingDiv();
    container.appendChild(loadingDiv);

    // Create initial embed iframe
    iframe = createIframe(buildEmbedUrl());
    
    // Hide iframe initially (loading div shows first)
    iframe.style.display = 'none';

    // Add iframe to DOM BEFORE setting src
    container.appendChild(iframe);
    console.log('[Curia] Embed iframe added to DOM');

    // Set up iframe handlers
    setupIframeHandlers(iframe);

    // Set iframe src AFTER iframe is in DOM
    iframe.src = buildEmbedUrl();
    console.log('[Curia] Embed iframe src set to:', iframe.src);
  };

  // Listen for messages from iframes
  function handleMessage(event) {
    // Verify origin for security
    const allowedOrigins = ['${hostUrl}', '${forumUrl}'];
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

  // Initialize the embed
  initializeEmbed();

  // Store reference for potential cleanup
  window.curiaEmbed = window.curiaEmbed || {};
  window.curiaEmbed[config.container || 'default'] = {
    iframe: iframe,
    container: container,
    config: config,
    authContext: authContext,
    phase: currentPhase
  };

})();
`;

  // Return JavaScript with proper headers
  return new NextResponse(embedScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*', // Allow from any domain
    },
  });
} 