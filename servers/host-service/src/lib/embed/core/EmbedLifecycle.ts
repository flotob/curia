/**
 * Embed Lifecycle Module
 * 
 * Coordinates the initialization and main execution flow of the embed
 */

/**
 * Generate the main initialization code
 */
export function generateInitializationCode(urls: { hostUrl: string; forumUrl: string }): string {
  return `
    // Initialize the embed - config and container are already created above
    try {
      console.log('[CuriaEmbed] Initializing embed');
      console.log('[CuriaEmbed] Config:', config);
      console.log('[CuriaEmbed] Container:', container);
      
      // Initialize InternalPluginHost (self-contained)
      const pluginHost = new InternalPluginHost(
        container, 
        config, 
        '${urls.hostUrl}', 
        '${urls.forumUrl}'
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
        container.innerHTML = \`
          <div style="padding: 20px; text-align: center; color: #ef4444; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px;">Failed to Load Forum</h3>
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">Please check your configuration and try again.</p>
          </div>
        \`;
      }
    }
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