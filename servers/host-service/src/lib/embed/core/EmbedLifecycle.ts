/**
 * Embed Lifecycle Module
 * 
 * Coordinates the initialization and main execution flow of the embed
 */

/**
 * Generate the main initialization code
 */
export function generateInitializationCode(): string {
  return `
  // Initialize the embed
  initializeEmbed();
  `;
}

/**
 * Generate the complete embed wrapper function
 */
export function generateEmbedWrapper(innerCode: string): string {
  return `
(function() {
  'use strict';
  
${innerCode}

})();
`;
} 