import { EnhancedPostMetadata } from './directMetadataFetcher';

/**
 * OG Image Generator for Telegram Notifications
 * 
 * Uses our existing /api/og-image endpoint to generate beautiful images
 * server-to-server, then returns them as buffers for Telegram attachment.
 */

/**
 * Build OG image URL using our existing /api/og-image endpoint
 * 
 * @param metadata - Enhanced post metadata with gating context
 * @param baseUrl - Base URL of our application (from env or config)
 * @returns Complete URL to generate the OG image
 */
export function buildOgImageUrl(metadata: EnhancedPostMetadata, baseUrl: string): string {
  const params = new URLSearchParams();
  
  // Basic post information
  params.set('title', metadata.title);
  params.set('author', metadata.author_name);
  params.set('board', metadata.board_name);
  params.set('id', metadata.id.toString());
  
  // Gating context
  params.set('communityGated', metadata.gatingContext.communityGated.toString());
  params.set('boardGated', metadata.gatingContext.boardGated.toString());
  params.set('postGated', metadata.gatingContext.postGated.toString());
  
  // Requirements (if present)
  if (metadata.gatingContext.postRequirements?.lyxRequired) {
    params.set('lyxRequired', metadata.gatingContext.postRequirements.lyxRequired);
  }
  
  // Convert token array to count for OG image display
  if (metadata.gatingContext.postRequirements?.tokensRequired?.length) {
    params.set('tokenCount', metadata.gatingContext.postRequirements.tokensRequired.length.toString());
  }
  
  // Convert follower array to count for OG image display  
  if (metadata.gatingContext.postRequirements?.followersRequired?.length) {
    params.set('followerCount', metadata.gatingContext.postRequirements.followersRequired.length.toString());
  }
  
  // Role requirements (simplified - just indicate if role required)
  if (metadata.gatingContext.communityRoles?.length || metadata.gatingContext.boardRoles?.length) {
    params.set('roleRequired', 'true');
  }
  
  const ogImageUrl = `${baseUrl}/api/og-image?${params.toString()}`;
  console.log(`[OgImageGenerator] Built OG image URL: ${ogImageUrl}`);
  
  return ogImageUrl;
}

/**
 * Fetch OG image from our API and return as buffer for Telegram
 * 
 * @param ogImageUrl - Complete URL to our /api/og-image endpoint
 * @returns Image buffer ready for Telegram sendPhoto
 */
export async function fetchOgImageBuffer(ogImageUrl: string): Promise<Buffer> {
  try {
    console.log(`[OgImageGenerator] Fetching OG image from: ${ogImageUrl}`);
    
    const response = await fetch(ogImageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Curia-Telegram-Bot/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`[OgImageGenerator] Successfully fetched OG image (${buffer.length} bytes)`);
    return buffer;
    
  } catch (error) {
    console.error('[OgImageGenerator] Failed to fetch OG image:', error);
    throw new Error(`Failed to fetch OG image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate OG image buffer for Telegram notification
 * 
 * @param metadata - Enhanced post metadata with gating context
 * @param baseUrl - Base URL of our application
 * @returns Image buffer ready for Telegram sendPhoto
 */
export async function generateTelegramOgImage(
  metadata: EnhancedPostMetadata, 
  baseUrl: string
): Promise<Buffer> {
  const ogImageUrl = buildOgImageUrl(metadata, baseUrl);
  return await fetchOgImageBuffer(ogImageUrl);
} 