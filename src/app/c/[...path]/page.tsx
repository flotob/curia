import { notFound, redirect } from 'next/navigation';
import { SemanticUrlService } from '@/lib/semantic-urls';

interface SemanticUrlPageProps {
  params: Promise<{ path: string[] }>;
}

/**
 * Semantic URL Route Handler
 * 
 * Handles requests to semantic URLs like:
 * /c/commonground/general-discussion/introducing-new-governance-proposal
 * 
 * Process:
 * 1. Parse the semantic URL path from route parameters
 * 2. Look up the URL in the database using SemanticUrlService
 * 3. Record access for analytics tracking
 * 4. Redirect to Common Ground with full plugin context
 * 5. Set cookies for iframe share detection (compatibility with existing system)
 */
export default async function SemanticUrlHandler({ params }: SemanticUrlPageProps) {
  const { path } = await params;
  const semanticPath = `/c/${path.join('/')}`;
  
  console.log(`[SemanticUrlHandler] Processing request: ${semanticPath}`);
  
  let semanticUrl;
  
  try {
    // Database lookup for semantic URL
    semanticUrl = await SemanticUrlService.resolve(semanticPath);
  } catch (error) {
    console.error(`[SemanticUrlHandler] Database error resolving semantic URL:`, error);
    notFound();
  }
  
  if (!semanticUrl) {
    console.warn(`[SemanticUrlHandler] URL not found: ${semanticPath}`);
    notFound();
  }
  
  // Record access for analytics (fire-and-forget)
  SemanticUrlService.recordAccess(semanticUrl.id).catch(error => {
    console.warn(`[SemanticUrlHandler] Failed to record access for ${semanticUrl.id}:`, error);
  });
  
  // Prepare share context data (compatible with existing system)
  const sharedContentToken = `${semanticUrl.postId}-${semanticUrl.boardId}-${Date.now()}`;
  const postData = JSON.stringify({
    postId: semanticUrl.postId,
    boardId: semanticUrl.boardId,
    token: semanticUrl.shareToken,
    timestamp: Date.now(),
    source: 'semantic_url'
  });
  
  // Construct Common Ground URL with full plugin context
  const commonGroundBaseUrl = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
  const redirectUrl = `${commonGroundBaseUrl}/c/${semanticUrl.communityShortId}/plugin/${semanticUrl.pluginId}`;
  
  console.log(`[SemanticUrlHandler] Redirecting ${semanticPath} → ${redirectUrl}`);
  console.log(`[SemanticUrlHandler] Post context: "${semanticUrl.postTitle}" (ID: ${semanticUrl.postId})`);
  console.log(`[SemanticUrlHandler] Board context: "${semanticUrl.boardName}" (ID: ${semanticUrl.boardId})`);
  
  // Encode the redirect data for the client-side redirect page
  const encodedData = encodeURIComponent(JSON.stringify({
    redirectUrl,
    sharedContentToken,
    postData,
    semanticUrl: {
      postId: semanticUrl.postId,
      postTitle: semanticUrl.postTitle,
      boardName: semanticUrl.boardName,
      accessCount: semanticUrl.accessCount
    }
  }));
  
  // Redirect to our client-side redirect handler
  // Note: redirect() throws NEXT_REDIRECT error intentionally - don't catch it!
  redirect(`/semantic-redirect?data=${encodedData}`);
}

/**
 * Generate page metadata for semantic URLs
 * This helps with SEO and social media previews
 */
export async function generateMetadata({ params }: SemanticUrlPageProps) {
  const { path } = await params;
  const semanticPath = `/c/${path.join('/')}`;
  
  let semanticUrl;
  
  try {
    // Look up the semantic URL for metadata
    semanticUrl = await SemanticUrlService.resolve(semanticPath);
  } catch (error) {
    console.error('[SemanticUrlHandler] Error resolving URL for metadata:', error);
    return {
      title: 'Community Discussion',
      description: 'Join the conversation on Common Ground'
    };
  }
  
  if (!semanticUrl) {
    return {
      title: 'Post Not Found',
      description: 'The requested post could not be found.'
    };
  }
  
  // Generate rich metadata for social sharing
  return {
    title: `${semanticUrl.postTitle} - ${semanticUrl.boardName}`,
    description: `View this post in ${semanticUrl.boardName} on ${semanticUrl.communityShortId}`,
    openGraph: {
      title: semanticUrl.postTitle,
      description: `Discussion in ${semanticUrl.boardName}`,
      type: 'article',
      siteName: 'Common Ground Community'
    },
    twitter: {
      card: 'summary',
      title: semanticUrl.postTitle,
      description: `Discussion in ${semanticUrl.boardName}`
    }
  };
} 