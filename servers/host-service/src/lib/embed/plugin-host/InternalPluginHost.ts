/**
 * Internal Plugin Host - Self-contained plugin hosting within embed script
 * 
 * This class embeds all ClientPluginHost functionality directly into the embed script,
 * making it completely self-contained so customers don't need to implement any logic.
 * 
 * Responsibilities:
 * 1. Handle auth completion from embed iframe
 * 2. Manage iframe switching (auth → forum)
 * 3. Route API requests from forum to host service
 * 4. Maintain auth context throughout session
 */

import { EmbedConfig } from '../types/EmbedTypes';

/**
 * Authentication context for API requests
 */
export interface InternalAuthContext {
  userId: string;
  communityId: string;
  sessionToken?: string;
}

/**
 * Message types for internal communication
 */
enum InternalMessageType {
  API_REQUEST = 'api_request',
  API_RESPONSE = 'api_response',
  INIT = 'init',
  ERROR = 'error'
}

/**
 * Internal plugin message interface
 */
interface InternalPluginMessage {
  type: InternalMessageType;
  iframeUid: string;
  requestId: string;
  method?: string;
  params?: any;
  data?: any;
  error?: string;
}

/**
 * Internal Plugin Host - completely self-contained within embed script
 */
export class InternalPluginHost {
  private container: HTMLElement;
  private config: EmbedConfig;
  private authContext: InternalAuthContext | null = null;
  private currentIframe: HTMLIFrameElement | null = null;
  private currentIframeUid: string | null = null;
  private hostServiceUrl: string;
  private forumUrl: string;

  constructor(container: HTMLElement, config: EmbedConfig, hostServiceUrl: string, forumUrl: string) {
    this.container = container;
    this.config = config;
    this.hostServiceUrl = hostServiceUrl;
    this.forumUrl = forumUrl;
    
    this.setupMessageListener();
    this.initializeAuthPhase();
  }

  /**
   * Initialize auth phase - load embed iframe for authentication
   */
  private initializeAuthPhase(): void {
    console.log('[InternalPluginHost] Initializing auth phase');
    
    // Create auth iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${this.hostServiceUrl}/embed`;
    iframe.style.width = '100%';
    iframe.style.height = this.config.height || '700px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
    
    // Add iframe to container
    this.container.appendChild(iframe);
    this.currentIframe = iframe;
    
    console.log('[InternalPluginHost] Auth iframe loaded');
  }

  /**
   * Set up message listener for all plugin communication
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      this.handleMessage(event);
    });
  }

  /**
   * Handle all incoming messages
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    // Handle auth completion from embed iframe
    if (event.data.type === 'curia-auth-complete') {
      await this.handleAuthCompletion(event.data);
      return;
    }

    // Handle API requests from forum
    const message = event.data as InternalPluginMessage;
    if (message.type === InternalMessageType.API_REQUEST) {
      await this.handleApiRequest(message, event.source as Window);
      return;
    }

    // Handle other message types
    if (message.type === InternalMessageType.INIT) {
      console.log('[InternalPluginHost] Forum initialized');
      return;
    }
  }

  /**
   * Handle auth completion and switch to forum
   */
  private async handleAuthCompletion(authData: any): Promise<void> {
    console.log('[InternalPluginHost] Auth completion received:', authData);
    
    // Store auth context
    this.authContext = {
      userId: authData.userId,
      communityId: authData.communityId,
      sessionToken: authData.sessionToken
    };
    
    console.log('[InternalPluginHost] Auth context set:', this.authContext);
    
    // Switch to forum phase
    await this.switchToForum();
  }

  /**
   * Switch iframe from auth to forum
   */
  private async switchToForum(): Promise<void> {
    console.log('[InternalPluginHost] Switching to forum phase');
    
    if (!this.authContext) {
      console.error('[InternalPluginHost] Cannot switch to forum - no auth context');
      return;
    }

    // Generate unique iframe UID for forum
    this.currentIframeUid = this.generateIframeUid();
    
    // Build forum URL with parameters
    const forumUrl = new URL(this.forumUrl);
    forumUrl.searchParams.set('mod', 'standalone');
    forumUrl.searchParams.set('cg_theme', this.config.theme || 'light');
    forumUrl.searchParams.set('iframeUid', this.currentIframeUid);
    
    console.log('[InternalPluginHost] Forum URL:', forumUrl.toString());
    
    // Remove existing iframe
    if (this.currentIframe && this.currentIframe.parentElement) {
      this.currentIframe.parentElement.removeChild(this.currentIframe);
    }
    
    // Create forum iframe
    const iframe = document.createElement('iframe');
    iframe.src = forumUrl.toString();
    iframe.style.width = '100%';
    iframe.style.height = this.config.height || '700px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
    
    // Add forum iframe to container
    this.container.appendChild(iframe);
    this.currentIframe = iframe;
    
    console.log('[InternalPluginHost] Forum iframe loaded');
  }

  /**
   * Handle API requests from forum
   */
  private async handleApiRequest(message: InternalPluginMessage, source: Window): Promise<void> {
    try {
      console.log('[InternalPluginHost] API request:', message.method, message.params);
      
      // Validate auth context
      if (!this.authContext) {
        throw new Error('No authentication context available');
      }

      // Validate iframe UID
      if (!this.currentIframeUid || message.iframeUid !== this.currentIframeUid) {
        throw new Error('Invalid iframe UID');
      }

      // Determine API endpoint
      let apiEndpoint: string;
      switch (message.method) {
        case 'getUserInfo':
        case 'getUserFriends':
        case 'getContextData':
          apiEndpoint = `${this.hostServiceUrl}/api/user`;
          break;
          
        case 'getCommunityInfo':
        case 'giveRole':
          apiEndpoint = `${this.hostServiceUrl}/api/community`;
          break;
          
        default:
          throw new Error(`Unknown API method: ${message.method}`);
      }

      // Make request to host service
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
        // Send successful response
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

  /**
   * Send successful response to forum
   */
  private sendResponse(source: Window, originalMessage: InternalPluginMessage, data: any): void {
    const response: InternalPluginMessage = {
      type: InternalMessageType.API_RESPONSE,
      iframeUid: originalMessage.iframeUid,
      requestId: originalMessage.requestId,
      data: data
    };
    
    source.postMessage(response, '*');
  }

  /**
   * Send error response to forum
   */
  private sendError(source: Window, originalMessage: InternalPluginMessage, error: string): void {
    const response: InternalPluginMessage = {
      type: InternalMessageType.API_RESPONSE,
      iframeUid: originalMessage.iframeUid,
      requestId: originalMessage.requestId,
      error: error
    };
    
    source.postMessage(response, '*');
  }

  /**
   * Generate unique iframe UID
   */
  private generateIframeUid(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${timestamp}${random}`.substring(0, 10);
  }

  /**
   * Cleanup when embed is destroyed
   */
  public destroy(): void {
    if (this.currentIframe && this.currentIframe.parentElement) {
      this.currentIframe.parentElement.removeChild(this.currentIframe);
    }
    
    this.currentIframe = null;
    this.currentIframeUid = null;
    this.authContext = null;
    
    console.log('[InternalPluginHost] Destroyed');
  }
}

/**
 * Generate the InternalPluginHost code for embed script
 */
export function generateInternalPluginHostCode(urls: { hostUrl: string; forumUrl: string }): string {
  return `
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
  `;
} 