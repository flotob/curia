/**
 * Embed Script Builder - Main Entry Point
 * 
 * This module builds the complete embed.js script by combining all
 * TypeScript modules into a single self-contained JavaScript file.
 */

export interface BuildOptions {
  environment: 'development' | 'production';
  minify: boolean;
  sourceMap?: boolean;
}

/**
 * Build the complete embed script from TypeScript modules
 */
export async function buildEmbedScript(options: BuildOptions): Promise<string> {
  // Import all the modular components
  const { generateConfigCode } = await import('./core/EmbedConfig');
  const { generateContainerCode } = await import('./ui/ContainerManager');
  const { generateInternalPluginHostCode } = await import('./plugin-host/InternalPluginHost');
  const { generateInitializationCode, generateEmbedWrapper } = await import('./core/EmbedLifecycle');

  // Get environment URLs (injected at build time)
  const hostUrl = process.env.NEXT_PUBLIC_HOST_SERVICE_URL || 'http://localhost:3001';
  const forumUrl = process.env.NEXT_PUBLIC_CURIA_FORUM_URL || 'http://localhost:3000';
  
  const urls = { hostUrl, forumUrl };

  // Combine all modules into the final script
  const innerCode = [
    generateConfigCode({} as any), // Config will be parsed at runtime
    generateContainerCode(),
    generateInternalPluginHostCode(urls), // Self-contained plugin host
    generateInitializationCode(urls), // Updated to use InternalPluginHost
  ].join('\n');

  // Wrap in IIFE
  const embedScript = generateEmbedWrapper(innerCode);

  // Apply minification if requested
  if (options.minify) {
    // Simple minification - remove comments and extra whitespace
    const minified = embedScript
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/\/\/.*$/gm, '') // Remove // comments
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
    
    return minified;
  }

  return embedScript;
} 