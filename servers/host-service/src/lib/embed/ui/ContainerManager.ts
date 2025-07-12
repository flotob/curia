/**
 * Container Management Module
 * 
 * Handles DOM container creation and management for the embed
 */

import { EmbedConfig } from '../types/EmbedTypes';

/**
 * Find or create the embed container
 */
export function createEmbedContainer(config: EmbedConfig): HTMLElement {
  let container: HTMLElement;
  
  if (config.container) {
    // Use customer-specified container
    container = document.getElementById(config.container) as HTMLElement;
    if (!container) {
      throw new Error(`[Curia] Container element not found: ${config.container}`);
    }
  } else {
    // Create container at script location
    container = document.createElement('div');
    container.id = 'curia-embed-' + generateUniqueId();
    
    // Insert after the script tag
    const script = document.currentScript as HTMLScriptElement;
    if (script && script.parentNode) {
      script.parentNode.insertBefore(container, script);
    } else {
      throw new Error('[Curia] Could not find script element for container placement');
    }
  }
  
  // Apply container styling
  applyContainerStyles(container);
  return container;
}

/**
 * Generate a unique ID for containers
 */
function generateUniqueId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Apply necessary styling to the container
 */
function applyContainerStyles(container: HTMLElement): void {
  container.style.position = 'relative';
}

/**
 * Clear container contents
 */
export function clearContainer(container: HTMLElement): void {
  container.innerHTML = '';
}

/**
 * Generate container management JavaScript code
 */
export function generateContainerCode(): string {
  return `
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
  `;
} 