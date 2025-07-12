
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
  

    // Get iframe permissions for forum functionality
    function getIframePermissions() {
      return [
        'clipboard-write *',
        'clipboard-read *', 
        'fullscreen *',
        'web-share *',
        'autoplay *',
        'picture-in-picture *',
        'payment *',
        'encrypted-media *',
        'storage-access *',
        'camera *',
        'microphone *',
        'geolocation *'
      ].join('; ');
    }

    // Internal Plugin Host - Self-contained plugin hosting
    class InternalPluginHost {
      constructor(container, config, hostServiceUrl, forumUrl) {
        this.container = container;
        this.config = config;
        this.authContext = null;
        this.currentIframe = null;
        this.currentIframeUid = null;
        this.hostServiceUrl = hostServiceUrl;
        this.forumUrl = forumUrl;
        
        this.setupMessageListener();
        this.initializeAuthPhase();
      }

      initializeAuthPhase() {
        console.log('[InternalPluginHost] Initializing auth phase');
        
        const iframe = document.createElement('iframe');
        iframe.src = this.hostServiceUrl + '/embed';
        iframe.style.width = '100%';
        iframe.style.height = this.config.height || '700px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
        iframe.setAttribute('allow', getIframePermissions());
        
        this.container.appendChild(iframe);
        this.currentIframe = iframe;
        
        console.log('[InternalPluginHost] Auth iframe loaded');
      }

      setupMessageListener() {
        window.addEventListener('message', (event) => {
          this.handleMessage(event);
        });
      }

      async handleMessage(event) {
        if (!event.data || typeof event.data !== 'object') {
          return;
        }

        // Handle auth completion from embed iframe
        if (event.data.type === 'curia-auth-complete') {
          await this.handleAuthCompletion(event.data);
          return;
        }

        // Handle API requests from forum
        const message = event.data;
        if (message.type === 'api_request') {
          await this.handleApiRequest(message, event.source);
          return;
        }

        // Handle forum init
        if (message.type === 'init') {
          console.log('[InternalPluginHost] Forum initialized');
          return;
        }
      }

      async handleAuthCompletion(authData) {
        console.log('[InternalPluginHost] Auth completion received:', authData);
        
        this.authContext = {
          userId: authData.userId,
          communityId: authData.communityId,
          sessionToken: authData.sessionToken
        };
        
        console.log('[InternalPluginHost] Auth context set:', this.authContext);
        
        await this.switchToForum();
      }

      async switchToForum() {
        console.log('[InternalPluginHost] Switching to forum phase');
        
        if (!this.authContext) {
          console.error('[InternalPluginHost] Cannot switch to forum - no auth context');
          return;
        }

        this.currentIframeUid = this.generateIframeUid();
        
        const forumUrl = new URL(this.forumUrl);
        forumUrl.searchParams.set('mod', 'standalone');
        forumUrl.searchParams.set('cg_theme', this.config.theme || 'light');
        forumUrl.searchParams.set('iframeUid', this.currentIframeUid);
        
        console.log('[InternalPluginHost] Forum URL:', forumUrl.toString());
        
        if (this.currentIframe && this.currentIframe.parentElement) {
          this.currentIframe.parentElement.removeChild(this.currentIframe);
        }
        
        const iframe = document.createElement('iframe');
        iframe.src = forumUrl.toString();
        iframe.style.width = '100%';
        iframe.style.height = this.config.height || '700px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
        iframe.setAttribute('allow', getIframePermissions());
        
        this.container.appendChild(iframe);
        this.currentIframe = iframe;
        
        console.log('[InternalPluginHost] Forum iframe loaded');
      }

      async handleApiRequest(message, source) {
        try {
          console.log('[InternalPluginHost] API request:', message.method, message.params);
          
          if (!this.authContext) {
            throw new Error('No authentication context available');
          }

          if (!this.currentIframeUid || message.iframeUid !== this.currentIframeUid) {
            throw new Error('Invalid iframe UID');
          }

          let apiEndpoint;
          switch (message.method) {
            case 'getUserInfo':
            case 'getUserFriends':
            case 'getContextData':
              apiEndpoint = this.hostServiceUrl + '/api/user';
              break;
              
            case 'getCommunityInfo':
            case 'giveRole':
              apiEndpoint = this.hostServiceUrl + '/api/community';
              break;
              
            default:
              throw new Error('Unknown API method: ' + message.method);
          }

          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              method: message.method,
              params: message.params,
              communityId: this.authContext.communityId,
              userId: this.authContext.userId
            })
          });

          const result = await response.json();
          
          if (result.success) {
            this.sendResponse(source, message, result.data);
          } else {
            throw new Error(result.error || 'API request failed');
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[InternalPluginHost] API error:', errorMessage);
          this.sendError(source, message, errorMessage);
        }
      }

      sendResponse(source, originalMessage, data) {
        const response = {
          type: 'api_response',
          iframeUid: originalMessage.iframeUid,
          requestId: originalMessage.requestId,
          data: data
        };
        
        source.postMessage(response, '*');
      }

      sendError(source, originalMessage, error) {
        const response = {
          type: 'api_response',
          iframeUid: originalMessage.iframeUid,
          requestId: originalMessage.requestId,
          error: error
        };
        
        source.postMessage(response, '*');
      }

      generateIframeUid() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return (timestamp + random).substring(0, 10);
      }

      destroy() {
        if (this.currentIframe && this.currentIframe.parentElement) {
          this.currentIframe.parentElement.removeChild(this.currentIframe);
        }
        
        this.currentIframe = null;
        this.currentIframeUid = null;
        this.authContext = null;
        
        console.log('[InternalPluginHost] Destroyed');
      }
    }
  

    // Initialize the embed - config and container are already created above
    try {
      console.log('[CuriaEmbed] Initializing embed');
      console.log('[CuriaEmbed] Config:', config);
      console.log('[CuriaEmbed] Container:', container);
      
      // Initialize InternalPluginHost (self-contained)
      const pluginHost = new InternalPluginHost(
        container, 
        config, 
        'http://localhost:3001', 
        'http://localhost:3000'
      );
      console.log('[CuriaEmbed] InternalPluginHost initialized');
      
      // Store global reference
      window.curiaEmbed = {
        container,
        pluginHost,
        config,
        destroy: () => {
          if (pluginHost) {
            pluginHost.destroy();
          }
          if (container && container.parentElement) {
            container.parentElement.removeChild(container);
          }
          delete window.curiaEmbed;
        }
      };
      
      console.log('[CuriaEmbed] Embed initialized successfully');
      
    } catch (error) {
      console.error('[CuriaEmbed] Initialization failed:', error);
      
      // Show error in container
      if (container) {
        container.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #ef4444; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px;">Failed to Load Forum</h3>
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">Please check your configuration and try again.</p>
          </div>
        `;
      }
    }
  

})();
