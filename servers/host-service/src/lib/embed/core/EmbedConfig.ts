/**
 * Embed Configuration Module
 * 
 * Handles parsing configuration from script data attributes
 */

import { EmbedConfig } from '../types/EmbedTypes';

/**
 * Parse configuration from script data attributes
 */
export function parseEmbedConfig(): EmbedConfig {
  // Get the script element that loaded this code
  const script = document.currentScript as HTMLScriptElement;
  if (!script) {
    throw new Error('[Curia] Could not find script element');
  }

  // Read configuration from data attributes
  const config: EmbedConfig = {
    community: script.getAttribute('data-community') || null,
    theme: (script.getAttribute('data-theme') as 'light' | 'dark') || 'light',
    container: script.getAttribute('data-container') || null,
    height: script.getAttribute('data-height') || '600px'
  };

  console.log('[Curia] Parsed embed config:', config);
  return config;
}

/**
 * Validate embed configuration
 */
export function validateEmbedConfig(config: EmbedConfig): void {
  // Validate theme
  if (config.theme !== 'light' && config.theme !== 'dark') {
    console.warn('[Curia] Invalid theme, using light:', config.theme);
    config.theme = 'light';
  }

  // Validate height format
  if (config.height && !config.height.match(/^\d+(px|%|vh|em|rem)$/)) {
    console.warn('[Curia] Invalid height format, using 600px:', config.height);
    config.height = '600px';
  }
}

/**
 * Generate embed script configuration JavaScript
 */
export function generateConfigCode(config: EmbedConfig): string {
  return `
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
  `;
} 