/**
 * Iframe Management Module
 * 
 * Handles iframe creation, loading states, phase switching, and error handling
 */

import { EmbedConfig, EmbedUrls } from '../types/EmbedTypes';

/**
 * Generate iframe management JavaScript code
 */
export function generateIframeCode(urls: EmbedUrls): string {
  return `
  // Embed state tracking
  let currentPhase = 'auth'; // 'auth' or 'forum'
  let authContext = null;
  let iframe = null;
  let loadingDiv = null;

  // Build initial embed iframe URL with parameters  
  const buildEmbedUrl = () => {
    const baseUrl = '${urls.hostUrl}/embed';
    const params = new URLSearchParams();
    
    if (config.community) params.append('community', config.community);
    if (config.theme) params.append('theme', config.theme);
    
    return baseUrl + (params.toString() ? '?' + params.toString() : '');
  };

  // Build forum URL for iframe switching
  const buildForumUrl = () => {
    const baseUrl = '${urls.forumUrl}';
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
  `;
} 