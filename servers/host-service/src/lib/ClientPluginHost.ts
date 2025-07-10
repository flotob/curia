/**
 * Client-Side PluginHost - Manages frontend plugin embedding and communication
 * 
 * This class handles:
 * 1. Loading and unloading plugins in secure iframes
 * 2. Managing postMessage communication with plugins
 * 3. Routing API calls to the host service backend
 * 4. Providing event-driven plugin lifecycle management
 * 
 * This is the frontend version that runs in the browser, complementing
 * the server-side PluginHost for complete plugin hosting functionality.
 */

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /** Plugin URL to load */
  url: string;
  /** Iframe width (optional, defaults to "100%") */
  width?: string;
  /** Iframe height (optional, defaults to "600px") */
  height?: string;
  /** Allowed origins for communication (for security) */
  allowedOrigins?: string[];
  /** Additional iframe sandbox permissions */
  permissions?: string[];
}

/**
 * Message types for host-plugin communication
 */
enum MessageType {
  API_REQUEST = 'api_request',
  API_RESPONSE = 'api_response',
  INIT = 'init',
  ERROR = 'error'
}

/**
 * Standard message interface for plugin communication
 */
interface PluginMessage {
  type: MessageType;
  iframeUid: string;
  requestId: string;
  method?: string;
  params?: any;
  data?: any;
  error?: string;
  signature?: string;
}

/**
 * Event callback type for plugin host events
 */
type EventCallback = (data: any) => void;

/**
 * Client-side plugin host class that manages plugin embedding and communication
 */
export class ClientPluginHost {
  private currentPlugin: {
    iframeUid: string;
    iframe: HTMLIFrameElement;
    config: PluginConfig;
  } | null = null;
  
  /** Event listeners for plugin lifecycle events */
  private eventListeners = new Map<string, EventCallback[]>();

  /** Host service URL for API requests */
  private hostServiceUrl: string;

  constructor(hostServiceUrl: string = 'http://localhost:3001') {
    this.hostServiceUrl = hostServiceUrl;
    this.setupMessageListener();
  }

  /**
   * Load a plugin in an iframe
   * 
   * @param config - Plugin configuration
   * @param container - DOM element to contain the iframe
   * @returns Promise that resolves when plugin is loaded
   */
  public async loadPlugin(config: PluginConfig, container: HTMLElement): Promise<string> {
    // Unload existing plugin if any
    if (this.currentPlugin) {
      await this.unloadPlugin();
    }

    // Generate unique iframe UID
    const iframeUid = this.generateIframeUid();
    
    try {
      // Create and configure iframe
      const iframe = this.createIframe(config, iframeUid);
      
      // Store plugin info
      this.currentPlugin = {
        iframeUid,
        iframe,
        config,
      };
      
      // Insert iframe into container
      container.appendChild(iframe);
      
      // Set iframe source with UID parameter
      const pluginUrl = this.buildPluginUrl(config.url, iframeUid);
      console.log(`[ClientPluginHost] Generated iframeUid: ${iframeUid}`);
      console.log(`[ClientPluginHost] Loading plugin URL: ${pluginUrl}`);
      iframe.src = pluginUrl;
      
      this.emit('plugin-loaded', { iframeUid, url: pluginUrl });
      
      return iframeUid;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('plugin-error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Unload the current plugin
   */
  public async unloadPlugin(): Promise<void> {
    if (!this.currentPlugin) {
      return;
    }

    // Remove iframe from DOM
    if (this.currentPlugin.iframe.parentNode) {
      this.currentPlugin.iframe.parentNode.removeChild(this.currentPlugin.iframe);
    }

    // Clear plugin reference
    const iframeUid = this.currentPlugin.iframeUid;
    this.currentPlugin = null;

    this.emit('plugin-unloaded', { iframeUid });
  }

  /**
   * Add event listener for plugin events
   * 
   * @param event - Event name
   * @param callback - Callback function
   */
  public on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   * 
   * @param event - Event name
   * @param callback - Callback function to remove
   */
  public off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all listeners
   * 
   * @param event - Event name
   * @param data - Event data
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Create and configure iframe element
   * 
   * @param config - Plugin configuration
   * @param iframeUid - Unique iframe identifier
   * @returns Configured iframe element
   */
  private createIframe(config: PluginConfig, iframeUid: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    
    // Set basic attributes
    iframe.id = `plugin-iframe-${iframeUid}`;
    iframe.style.width = config.width || '100%';
    iframe.style.height = config.height || '600px';
    iframe.style.border = 'none';
    
    // Set security attributes
    const defaultPermissions = [
      'allow-scripts',
      'allow-same-origin',
      'allow-forms',
      'allow-popups',
      'allow-popups-to-escape-sandbox'
    ];
    
    const permissions = config.permissions || defaultPermissions;
    iframe.setAttribute('sandbox', permissions.join(' '));
    
    // Set loading and other attributes
    iframe.loading = 'lazy';
    iframe.allow = 'fullscreen';
    
    return iframe;
  }

  /**
   * Build plugin URL with iframe UID parameter
   * 
   * @param baseUrl - Base plugin URL
   * @param iframeUid - Unique iframe identifier
   * @returns Complete plugin URL with parameters
   */
  private buildPluginUrl(baseUrl: string, iframeUid: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('iframeUid', iframeUid);
    return url.toString();
  }

  /**
   * Generate unique iframe UID
   * 
   * @returns Unique identifier string (similar to Common Ground format)
   */
  private generateIframeUid(): string {
    // Generate a unique UID similar to Common Ground's format (e.g., "6QXDPWY34J")
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${timestamp}${random}`.substring(0, 10);
  }

  /**
   * Set up message listener for plugin communication
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      this.handlePluginMessage(event);
    });
  }

  /**
   * Handle incoming messages from plugins
   * 
   * @param event - Message event from plugin
   */
  private async handlePluginMessage(event: MessageEvent): Promise<void> {
    // Basic message validation
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    const message = event.data as PluginMessage;
    
    // Filter out non-plugin messages
    if (!message.type || !message.iframeUid || !message.requestId) {
      return;
    }

    // Check if message is from our current plugin
    if (!this.currentPlugin || message.iframeUid !== this.currentPlugin.iframeUid) {
      console.warn('[ClientPluginHost] Message from unknown plugin:', message.iframeUid);
      return;
    }

    // Validate origin if configured
    if (this.currentPlugin.config.allowedOrigins && 
        !this.currentPlugin.config.allowedOrigins.includes('*') &&
        !this.currentPlugin.config.allowedOrigins.includes(event.origin)) {
      console.warn('[ClientPluginHost] Message from unauthorized origin:', event.origin);
      return;
    }

    this.emit('plugin-communication', {
      type: message.type,
      method: message.method,
      origin: event.origin
    });

    // Handle different message types
    switch (message.type) {
      case MessageType.API_REQUEST:
        await this.handleApiRequest(message, event.source as Window);
        break;
        
      case MessageType.INIT:
        await this.handlePluginInit(message, event.source as Window);
        break;
        
      default:
        console.warn('[ClientPluginHost] Unknown message type:', message.type);
    }
  }

  /**
   * Handle API requests from plugins
   * 
   * @param message - API request message
   * @param source - Source window (plugin iframe)
   */
  private async handleApiRequest(message: PluginMessage, source: Window): Promise<void> {
    try {
      // Emit event for logging/monitoring
      this.emit('api-request', {
        method: message.method,
        params: message.params,
        iframeUid: message.iframeUid
      });

      // Route API request to appropriate backend endpoint
      let responseData: any;
      let apiEndpoint: string;

      // Determine which backend endpoint to use
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

      // Make request to host service backend
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: message.method,
          params: message.params,
          communityId: 'default_community', // TODO: Get from plugin context
          userId: 'default_user' // TODO: Get from authenticated user
        })
      });

      const result = await response.json();
      
      if (result.success) {
        responseData = result.data;
      } else {
        throw new Error(result.error || 'API request failed');
      }

      // Send successful response
      this.sendResponse(source, message, responseData);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.sendError(source, message, errorMessage);
    }
  }

  /**
   * Handle plugin initialization
   * 
   * @param message - Init message
   * @param source - Source window (plugin iframe)
   */
  private async handlePluginInit(message: PluginMessage, _source: Window): Promise<void> {
    // Plugin has initialized successfully
    this.emit('plugin-initialized', {
      iframeUid: message.iframeUid
    });
  }

  /**
   * Send successful response to plugin
   * 
   * @param source - Target window (plugin iframe)
   * @param originalMessage - Original request message
   * @param data - Response data
   */
  private sendResponse(source: Window, originalMessage: PluginMessage, data: any): void {
    const response: PluginMessage = {
      type: MessageType.API_RESPONSE,
      iframeUid: originalMessage.iframeUid,
      requestId: originalMessage.requestId,
      data: data
    };
    
    source.postMessage(response, '*');
  }

  /**
   * Send error response to plugin
   * 
   * @param source - Target window (plugin iframe)
   * @param originalMessage - Original request message
   * @param error - Error message
   */
  private sendError(source: Window, originalMessage: PluginMessage, error: string): void {
    const response: PluginMessage = {
      type: MessageType.API_RESPONSE,
      iframeUid: originalMessage.iframeUid,
      requestId: originalMessage.requestId,
      error: error
    };
    
    source.postMessage(response, '*');
  }
} 