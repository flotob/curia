/**
 * PluginHost - Manages plugin embedding and communication
 * 
 * This class handles:
 * 1. Loading and unloading plugins in secure iframes
 * 2. Managing postMessage communication with plugins
 * 3. Validating plugin requests and signatures
 * 4. Routing API calls to appropriate handlers
 * 5. Providing event-driven plugin lifecycle management
 */

import { MockDataProvider } from './MockDataProvider.js';

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
 * Main plugin host class that manages the entire plugin lifecycle
 */
export class PluginHost {
  private dataProvider: MockDataProvider;
  private currentPlugin: {
    iframeUid: string;
    iframe: HTMLIFrameElement;
    config: PluginConfig;
  } | null = null;
  
  /** Event listeners for plugin lifecycle events */
  private eventListeners = new Map<string, EventCallback[]>();

  constructor(dataProvider: MockDataProvider) {
    this.dataProvider = dataProvider;
    this.setupMessageListener();
  }

  /**
   * Load a plugin in an iframe
   * 
   * @param config - Plugin configuration
   * @returns Promise that resolves when plugin is loaded
   */
  public async loadPlugin(config: PluginConfig): Promise<string> {
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
      
      // Insert iframe into DOM
      this.insertIframeIntoDOM(iframe, config);
      
      // Set iframe source with UID parameter
      const pluginUrl = this.buildPluginUrl(config.url, iframeUid);
      iframe.src = pluginUrl;
      
      this.emit('plugin-loaded', { iframeUid, url: config.url });
      
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
    iframe.sandbox.add(...permissions);
    
    // Set loading and other attributes
    iframe.loading = 'lazy';
    iframe.allow = 'fullscreen';
    
    return iframe;
  }

  /**
   * Insert iframe into the DOM
   * 
   * @param iframe - Iframe element
   * @param config - Plugin configuration
   */
  private insertIframeIntoDOM(iframe: HTMLIFrameElement, _config: PluginConfig): void {
    const container = document.getElementById('plugin-iframe');
    if (!container) {
      throw new Error('Plugin iframe container not found');
    }
    
    // Replace existing iframe
    container.replaceWith(iframe);
    iframe.id = 'plugin-iframe'; // Keep the same ID for CSS styling
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
   * @returns Unique identifier string
   */
  private generateIframeUid(): string {
    return `iframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    
    // Filter out non-plugin messages (browser extensions, etc.)
    // Only process messages that look like plugin messages
    if (!message.type || !message.iframeUid || !message.requestId) {
      // Don't log warnings for obviously non-plugin messages
      const rawMessage = event.data as any;
      if (rawMessage.target || rawMessage.source || rawMessage.action || rawMessage.command) {
        return; // Likely browser extension or other system message
      }
      console.warn('[PluginHost] Invalid message structure:', message);
      return;
    }

    // Check if message is from our current plugin
    if (!this.currentPlugin || message.iframeUid !== this.currentPlugin.iframeUid) {
      console.warn('[PluginHost] Message from unknown plugin:', message.iframeUid);
      return;
    }

    // Validate origin if configured
    if (this.currentPlugin.config.allowedOrigins && 
        !this.currentPlugin.config.allowedOrigins.includes('*') &&
        !this.currentPlugin.config.allowedOrigins.includes(event.origin)) {
      console.warn('[PluginHost] Message from unauthorized origin:', event.origin);
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
        console.warn('[PluginHost] Unknown message type:', message.type);
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

      // TODO: Validate signature here in production
      // For now, we'll skip signature validation for simplicity
      
      let responseData: any;
      
      // Route to appropriate API handler
      switch (message.method) {
        case 'getUserInfo':
          responseData = await this.dataProvider.getUserInfo();
          break;
          
        case 'getCommunityInfo':
          responseData = await this.dataProvider.getCommunityInfo();
          break;
          
        case 'getUserFriends':
          const { limit, offset } = message.params || {};
          responseData = await this.dataProvider.getUserFriends(limit || 10, offset || 0);
          break;
          
        case 'giveRole':
          const { roleId, userId } = message.params || {};
          responseData = await this.dataProvider.giveRole(roleId, userId);
          break;
          
        default:
          throw new Error(`Unknown API method: ${message.method}`);
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