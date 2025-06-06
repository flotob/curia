import { notFound, redirect } from 'next/navigation';
import { SemanticUrlService } from '@/lib/semantic-urls';
import { EnhancedPostMetadata } from '@/app/api/posts/[postId]/metadata/route';
import { generatePrivacyAwarePostMetadata } from '@/utils/metadataUtils';

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
 * Generate enhanced page metadata for semantic URLs
 * Uses the same rich, privacy-aware metadata system as regular post pages
 * but with semantic URL as canonical instead of internal URL
 */
export async function generateMetadata({ params }: SemanticUrlPageProps) {
  const { path } = await params;
  const semanticPath = `/c/${path.join('/')}`;
  
  let semanticUrl;
  
  try {
    // Look up the semantic URL for basic post info
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

  // Build URLs
  const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
  const fullSemanticUrl = `${baseUrl}${semanticPath}`;
  
  try {
    // Fetch enhanced post metadata with gating information (same as post layout)
    const response = await fetch(`${baseUrl}/api/posts/${semanticUrl.postId}/metadata`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch enhanced metadata for post ${semanticUrl.postId}, using semantic URL fallback`);
      // Use basic semantic URL metadata as fallback
      return {
        title: `${semanticUrl.postTitle} - ${semanticUrl.boardName}`,
        description: `Discussion in ${semanticUrl.boardName} • Join the conversation on Common Ground`,
        openGraph: {
          title: semanticUrl.postTitle,
          description: `Discussion in ${semanticUrl.boardName}`,
          url: fullSemanticUrl,
          type: 'article',
          siteName: 'Common Ground Community',
        },
        twitter: {
          card: 'summary_large_image',
          title: semanticUrl.postTitle,
          description: `Discussion in ${semanticUrl.boardName}`,
        },
        alternates: {
          canonical: fullSemanticUrl,
        },
      };
    }
    
    const postData: EnhancedPostMetadata = await response.json();
    
    // Generate rich privacy-aware metadata using existing utility
    const richMetadata = generatePrivacyAwarePostMetadata(postData, baseUrl, semanticUrl.boardId.toString());
    
    // Override the canonical URL to point to semantic URL instead of internal URL
    const semanticAwareMetadata = {
      ...richMetadata,
      openGraph: {
        ...richMetadata.openGraph,
        url: fullSemanticUrl, // 🔑 Use semantic URL as canonical
      },
      alternates: {
        canonical: fullSemanticUrl, // 🔑 Use semantic URL as canonical
      },
    };
    
    const gatingStatus = postData.gatingContext.communityGated || postData.gatingContext.boardGated || postData.gatingContext.postGated;
    console.log(`[SemanticUrlHandler] Generated rich metadata for ${semanticPath}: ${postData.title} (${gatingStatus ? 'gated' : 'public'})`);
    
    return semanticAwareMetadata;
    
  } catch (error) {
    console.error(`[SemanticUrlHandler] Error fetching enhanced metadata for post ${semanticUrl.postId}:`, error);
    
    // Fallback to basic semantic URL metadata
    return {
      title: `${semanticUrl.postTitle} - ${semanticUrl.boardName}`,
      description: `Discussion in ${semanticUrl.boardName} • Join the conversation on Common Ground`,
      openGraph: {
        title: semanticUrl.postTitle,
        description: `Discussion in ${semanticUrl.boardName}`,
        url: fullSemanticUrl,
        type: 'article',
        siteName: 'Common Ground Community',
      },
      twitter: {
        card: 'summary_large_image',
        title: semanticUrl.postTitle,
        description: `Discussion in ${semanticUrl.boardName}`,
      },
      alternates: {
        canonical: fullSemanticUrl,
      },
    };
  }
} 