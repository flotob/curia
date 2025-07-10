/**
 * Main Host Application
 * 
 * This application demonstrates how to embed and communicate with Common Ground
 * plugins using our drop-in replacement system. It provides a complete working
 * example of the host-plugin communication protocol.
 * 
 * Key features:
 * 1. Load plugins in iframes with proper sandboxing
 * 2. Handle postMessage communication between host and plugin
 * 3. Provide mock data that mimics Common Ground's API responses
 * 4. Validate plugin requests using cryptographic signatures
 * 5. Demonstrate all major plugin API methods
 */

import { PluginHost } from './PluginHost.js';
import { MockDataProvider } from './MockDataProvider.js';

/**
 * Main application class that coordinates the UI and plugin management
 */
class HostApplication {
  private pluginHost: PluginHost;
  private mockDataProvider: MockDataProvider;
  private currentPluginUrl: string | null = null;
  
  constructor() {
    this.mockDataProvider = new MockDataProvider();
    this.pluginHost = new PluginHost(this.mockDataProvider);
    
    this.setupEventListeners();
    this.log('Host application initialized', 'info');
  }
  
  /**
   * Set up all DOM event listeners and handlers
   */
  private setupEventListeners(): void {
    // Plugin URL selector
    const urlSelect = document.getElementById('plugin-url') as HTMLSelectElement;
    const customUrlGroup = document.getElementById('custom-url-group') as HTMLElement;
    
    urlSelect.addEventListener('change', () => {
      if (urlSelect.value === 'custom') {
        customUrlGroup.classList.remove('hidden');
      } else {
        customUrlGroup.classList.add('hidden');
      }
    });
    
    // Load plugin button
    const loadBtn = document.getElementById('load-plugin') as HTMLButtonElement;
    loadBtn.addEventListener('click', () => {
      this.handleLoadPlugin();
    });
    
    // Unload plugin button
    const unloadBtn = document.getElementById('unload-plugin') as HTMLButtonElement;
    unloadBtn.addEventListener('click', () => {
      this.handleUnloadPlugin();
    });
    
    // Listen for plugin communication events
    this.pluginHost.on('plugin-loaded', (data) => {
      this.onPluginLoaded(data.iframeUid, data.url);
    });
    
    this.pluginHost.on('plugin-error', (data) => {
      this.onPluginError(data.error);
    });
    
    this.pluginHost.on('api-request', (data) => {
      this.onApiRequest(data.method, data.params);
    });
    
    this.pluginHost.on('plugin-communication', (data) => {
      this.log(`Plugin communication: ${data.type} - ${data.method || 'N/A'}`, 'info');
    });
  }
  
  /**
   * Handle loading a plugin
   */
  private async handleLoadPlugin(): Promise<void> {
    const urlSelect = document.getElementById('plugin-url') as HTMLSelectElement;
    const customUrlInput = document.getElementById('custom-url') as HTMLInputElement;
    const heightInput = document.getElementById('plugin-height') as HTMLInputElement;
    
    let pluginUrl: string;
    
    if (urlSelect.value === 'custom') {
      pluginUrl = customUrlInput.value.trim();
      if (!pluginUrl) {
        this.log('Please enter a custom plugin URL', 'error');
        return;
      }
    } else if (urlSelect.value) {
      pluginUrl = urlSelect.value;
    } else {
      this.log('Please select a plugin URL', 'error');
      return;
    }
    
    const height = parseInt(heightInput.value) || 600;
    
    try {
      this.updateStatus('loading', 'Loading plugin...');
      this.log(`Loading plugin from: ${pluginUrl}`, 'info');
      
      // Unload existing plugin if any
      if (this.currentPluginUrl) {
        await this.pluginHost.unloadPlugin();
      }
      
      // Load the new plugin
      await this.pluginHost.loadPlugin({
        url: pluginUrl,
        height: `${height}px`,
        allowedOrigins: ['*'], // In production, this should be more restrictive
      });
      
      this.currentPluginUrl = pluginUrl;
      
    } catch (error) {
      this.log(`Failed to load plugin: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      this.updateStatus('error', 'Failed to load');
    }
  }
  
  /**
   * Handle unloading the current plugin
   */
  private async handleUnloadPlugin(): Promise<void> {
    if (!this.currentPluginUrl) {
      return;
    }
    
    try {
      this.log('Unloading plugin...', 'info');
      await this.pluginHost.unloadPlugin();
      this.currentPluginUrl = null;
      
      // Hide plugin section
      const pluginSection = document.getElementById('plugin-section') as HTMLElement;
      pluginSection.classList.add('hidden');
      
      // Update button states
      const loadBtn = document.getElementById('load-plugin') as HTMLButtonElement;
      const unloadBtn = document.getElementById('unload-plugin') as HTMLButtonElement;
      loadBtn.disabled = false;
      unloadBtn.disabled = true;
      
      this.log('Plugin unloaded successfully', 'success');
      
    } catch (error) {
      this.log(`Failed to unload plugin: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }
  
  /**
   * Handle successful plugin loading
   */
  private onPluginLoaded(iframeUid: string, url: string): void {
    this.log(`Plugin loaded successfully with UID: ${iframeUid}`, 'success');
    this.updateStatus('connected', 'Connected');
    
    // Show plugin section
    const pluginSection = document.getElementById('plugin-section') as HTMLElement;
    pluginSection.classList.remove('hidden');
    
    // Update current plugin URL display
    const currentUrlSpan = document.getElementById('current-plugin-url') as HTMLElement;
    currentUrlSpan.textContent = url;
    
    // Update button states
    const loadBtn = document.getElementById('load-plugin') as HTMLButtonElement;
    const unloadBtn = document.getElementById('unload-plugin') as HTMLButtonElement;
    loadBtn.disabled = true;
    unloadBtn.disabled = false;
  }
  
  /**
   * Handle plugin loading errors
   */
  private onPluginError(error: string): void {
    this.log(`Plugin error: ${error}`, 'error');
    this.updateStatus('error', 'Error');
  }
  
  /**
   * Handle API requests from plugins
   */
  private onApiRequest(method: string, params: any): void {
    this.log(`API Request: ${method}${params ? ` with params: ${JSON.stringify(params)}` : ''}`, 'info');
  }
  
  /**
   * Update the plugin status display
   */
  private updateStatus(type: 'loading' | 'connected' | 'error', text: string): void {
    const statusElement = document.getElementById('plugin-status') as HTMLElement;
    statusElement.className = `status ${type}`;
    statusElement.textContent = text;
  }
  
  /**
   * Add a log entry to the communication logs
   */
  private log(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    const logContainer = document.getElementById('log-container') as HTMLElement;
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logEntry);
    
    // Auto-scroll to bottom
    const logsContainer = logContainer.parentElement as HTMLElement;
    logsContainer.scrollTop = logsContainer.scrollHeight;
    
    // Keep only last 100 log entries to prevent memory issues
    while (logContainer.children.length > 100) {
      logContainer.removeChild(logContainer.firstChild!);
    }
    
    // Also log to browser console for debugging
    console.log(`[HostApp] ${message}`);
  }
}

/**
 * Initialize the application when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  new HostApplication();
}); 