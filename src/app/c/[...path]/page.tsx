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
  
  // Build the semantic URL for meta tags
  const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
  const fullSemanticUrl = `${baseUrl}${semanticPath}`;
  
  // Generate OG image URL pointing to our API with semantic context
  const ogImageUrl = `${baseUrl}/api/og-image?${new URLSearchParams({
    title: semanticUrl.postTitle.substring(0, 100),
    author: 'Community Member', // Don't expose user data in public URLs
    board: semanticUrl.boardName,
    id: semanticUrl.postId.toString(),
    semantic: 'true' // Flag to indicate this is from a semantic URL
  }).toString()}`;
  
  const description = `Discussion in ${semanticUrl.boardName} • Join the conversation on Common Ground`;
  
  // Generate rich metadata for social sharing with semantic URL as canonical
  return {
    title: `${semanticUrl.postTitle} - ${semanticUrl.boardName}`,
    description,
    
    // Open Graph tags with semantic URL as canonical
    openGraph: {
      title: semanticUrl.postTitle,
      description,
      url: fullSemanticUrl, // 🔑 KEY FIX: Use semantic URL, not internal URL
      type: 'article',
      siteName: 'Common Ground Community',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${semanticUrl.postTitle} - ${semanticUrl.boardName}`,
        }
      ],
    },
    
    // Twitter Card tags
    twitter: {
      card: 'summary_large_image',
      title: semanticUrl.postTitle,
      description,
      images: [ogImageUrl],
    },
    
    // Canonical URL pointing to semantic URL (not internal URL)
    alternates: {
      canonical: fullSemanticUrl, // 🔑 KEY FIX: Semantic URL as canonical
    },
    
    // Robots configuration
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
} 