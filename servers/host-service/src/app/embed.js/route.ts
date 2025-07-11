/**
 * Curia Embed Script - Customer Integration
 * 
 * This is the JavaScript file that customers include on their sites.
 * It reads configuration from data attributes and creates the iframe.
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

  // Build iframe URL with parameters  
  const baseUrl = '${hostUrl}/embed';
  const params = new URLSearchParams();
  
  if (config.community) params.append('community', config.community);
  if (config.theme) params.append('theme', config.theme);
  
  const iframeUrl = baseUrl + (params.toString() ? '?' + params.toString() : '');

  console.log('[Curia] Generated iframe URL:', iframeUrl);
  console.log('[Curia] Base URL:', baseUrl);
  console.log('[Curia] URL params:', params.toString());

  // Create iframe element
  const iframe = document.createElement('iframe');
  console.log('[Curia] Setting iframe src to:', iframeUrl);
  iframe.style.width = '100%';
  iframe.style.height = config.height;
  iframe.style.border = 'none';
  iframe.style.borderRadius = '8px';
  iframe.style.display = 'block';
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('scrolling', 'no');
  iframe.title = 'Curia Community Forum';
  
  // Set sandbox permissions (critical for iframe content to load)
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
  
  console.log('[Curia] Created iframe element:', iframe);

  // Clear container and add loading state
  container.innerHTML = '';
  container.style.position = 'relative';
  
  const loadingDiv = document.createElement('div');
  loadingDiv.innerHTML = \`
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
        <div>Loading Curia...</div>
      </div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  \`;
  
  container.appendChild(loadingDiv);

  // Hide iframe initially (loading div shows first)
  iframe.style.display = 'none';

  // Add iframe to DOM BEFORE setting src (critical for loading)
  container.appendChild(iframe);
  console.log('[Curia] Iframe added to DOM');

  // Set iframe src AFTER iframe is in DOM
  iframe.src = iframeUrl;
  console.log('[Curia] Iframe src set to:', iframe.src);

  // Handle iframe load success
  iframe.onload = function() {
    console.log('[Curia] Iframe loaded successfully');
    
    try {
      // Hide loading div and show iframe
      if (loadingDiv && container && container.contains(loadingDiv)) {
        loadingDiv.style.display = 'none';
        console.log('[Curia] Loading div hidden');
      }
      
      // Show the iframe (it's already in the DOM)
      iframe.style.display = 'block';
      console.log('[Curia] Iframe shown');
      
      console.log('[Curia] Embed ready');
    } catch (error) {
      console.warn('[Curia] Error during iframe display:', error);
    }
  };

  // Handle iframe load error
  iframe.onerror = function() {
    console.error('[Curia] Failed to load embed iframe');
    
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
            Check if the service is running at: \${iframe.src}
          </div>
        </div>
      </div>
    \`;
    
    // Safer error state replacement
    try {
      if (container) {
        // Clear any existing content safely
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

  // Add timeout fallback with better safety checks
  const timeoutId = setTimeout(function() {
    // Only show timeout error if we're still in loading state
    if (loadingDiv && container && container.contains(loadingDiv)) {
      console.warn('[Curia] Iframe load timeout - showing error');
      iframe.onerror();
    } else {
      console.log('[Curia] Timeout reached but loading already completed');
    }
  }, 10000); // 10 second timeout

  // Clear timeout when iframe loads successfully
  const originalOnLoad = iframe.onload;
  iframe.onload = function() {
    clearTimeout(timeoutId);
    if (originalOnLoad) originalOnLoad.call(this);
  };

  // Listen for height adjustment messages from iframe
  function handleMessage(event) {
    // Verify origin for security
    const allowedOrigin = '${hostUrl}';
    if (event.origin !== allowedOrigin) {
      return;
    }

    const data = event.data;
    if (data && data.type === 'curia-resize' && data.height) {
      iframe.style.height = data.height + 'px';
      console.log('[Curia] Resized to height:', data.height);
    }
  }

  // Add message listener for iframe communication
  if (window.addEventListener) {
    window.addEventListener('message', handleMessage, false);
  } else {
    // IE8 fallback
    window.attachEvent('onmessage', handleMessage);
  }

  // Store reference for potential cleanup
  window.curiaEmbed = window.curiaEmbed || {};
  window.curiaEmbed[config.container || 'default'] = {
    iframe: iframe,
    container: container,
    config: config
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