import type { Metadata } from 'next';
import { PostMetadata, EnhancedPostMetadata } from '@/app/api/posts/[postId]/metadata/route';

// Interface for TipTap JSON structure
interface TipTapNode {
  type?: string;
  text?: string;
  content?: TipTapNode[];
}

/**
 * Extracts a clean text description from post content (JSON or plain text)
 * @param content - Post content (could be JSON from TipTap or plain text)
 * @param maxLength - Maximum length for the description
 * @returns Clean text description suitable for meta tags
 */
export function extractDescription(content: string, maxLength: number = 160): string {
  try {
    // Try to parse as TipTap JSON content
    const parsed = JSON.parse(content);
    
    if (parsed.type === 'doc' && parsed.content) {
      let text = '';
      
      // Recursively extract text from TipTap nodes
      const extractText = (node: TipTapNode): void => {
        if (node.type === 'text' && node.text) {
          text += node.text;
        } else if (node.content && Array.isArray(node.content)) {
          node.content.forEach((child) => extractText(child));
        }
        
        // Add spacing after paragraphs
        if (node.type === 'paragraph' && text && !text.endsWith(' ')) {
          text += ' ';
        }
      };
      
      if (Array.isArray(parsed.content)) {
        parsed.content.forEach((node: unknown) => extractText(node as TipTapNode));
      }
      
      // Clean up the extracted text
      text = text.trim().replace(/\s+/g, ' ');
      
      if (text.length > maxLength) {
        return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
      }
      
      return text || 'A forum discussion post.';
    }
  } catch {
    // If not JSON, treat as plain text
  }
  
  // Handle as plain text
  const plainText = content.trim().replace(/\s+/g, ' ');
  
  if (plainText.length > maxLength) {
    return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }
  
  return plainText || 'A forum discussion post.';
}

/**
 * Generates gating description for meta tags
 * @param gatingContext - The gating context from enhanced metadata
 * @returns Human-readable gating requirements string
 */
export function generateGatingDescription(gatingContext: EnhancedPostMetadata['gatingContext']): string {
  const requirements: string[] = [];
  
  if (gatingContext.communityGated) {
    requirements.push('Community access required');
  }
  
  if (gatingContext.boardGated) {
    requirements.push('Board access required');
  }
  
  if (gatingContext.postGated && gatingContext.postRequirements) {
    const { postRequirements } = gatingContext;
    const postReqs: string[] = [];
    
    if (postRequirements.lyxRequired) {
      postReqs.push(`${postRequirements.lyxRequired} required`);
    }
    
    if (postRequirements.tokensRequired?.length) {
      const tokenCount = postRequirements.tokensRequired.length;
      postReqs.push(`${tokenCount} token type${tokenCount !== 1 ? 's' : ''} required`);
    }
    
    if (postRequirements.followersRequired?.length) {
      postReqs.push('follower requirements');
    }
    
    if (postReqs.length > 0) {
      requirements.push(`UP verification: ${postReqs.join(', ')}`);
    }
  }
  
  return requirements.length > 0 ? requirements.join(' • ') : '';
}

/**
 * Generates privacy-aware description that respects gating conditions
 * @param postData - Enhanced post metadata with gating context
 * @param maxLength - Maximum length for the description
 * @returns Privacy-aware description suitable for social media previews
 */
export function generatePrivacyAwareDescription(
  postData: EnhancedPostMetadata, 
  maxLength: number = 160
): string {
  const { gatingContext } = postData;
  
  // Base description from content (if allowed)
  let description = '';
  if (!gatingContext.communityGated && !gatingContext.boardGated) {
    // Content is visible - extract description normally but shorter to make room for gating info
    description = extractDescription(postData.content, gatingContext.postGated ? 60 : 80);
  } else {
    // Content is private - use generic description
    description = "This discussion is part of a private community.";
  }
  
  // Add author and board context
  const context = `Posted by ${postData.author_name} in ${postData.board_name}`;
  
  // Add engagement context if not gated
  const engagement = !gatingContext.communityGated && !gatingContext.boardGated
    ? `${postData.upvote_count} upvotes • ${postData.comment_count} comments`
    : undefined;
  
  // Add gating information
  const gatingInfo = generateGatingDescription(gatingContext);
  
  // Combine and limit length
  const parts = [description, context, engagement, gatingInfo].filter(Boolean);
  const fullDescription = parts.join(' • ');
    
  return fullDescription.length > maxLength 
    ? fullDescription.substring(0, maxLength - 3) + '...'
    : fullDescription;
}

/**
 * Generates enhanced OG image URL with gating parameters
 * @param postData - Enhanced post metadata with gating context
 * @returns URL to dynamically generated OG image with gating indicators
 */
export function generateEnhancedOGImageUrl(postData: EnhancedPostMetadata): string {
  const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || 'https://localhost:3000';
  
  // Base parameters
  const params = new URLSearchParams({
    title: postData.title.substring(0, 100), // Limit title length for URL
    author: postData.author_name,
    board: postData.board_name,
    id: postData.id.toString(),
  });
  
  // Add gating parameters
  if (postData.gatingContext.communityGated) {
    params.set('communityGated', 'true');
  }
  
  if (postData.gatingContext.boardGated) {
    params.set('boardGated', 'true');
  }
  
  if (postData.gatingContext.postGated) {
    params.set('postGated', 'true');
    
    // Add specific requirements for display
    const { postRequirements } = postData.gatingContext;
    if (postRequirements?.lyxRequired) {
      params.set('lyxRequired', postRequirements.lyxRequired);
    }
    
    if (postRequirements?.tokensRequired?.length) {
      params.set('tokenCount', postRequirements.tokensRequired.length.toString());
    }
    
    if (postRequirements?.followersRequired?.length) {
      params.set('followerCount', postRequirements.followersRequired.length.toString());
    }
  }
  
  // Add primary role for display if available
  if (postData.gatingContext.communityRoles?.length) {
    params.set('roleRequired', postData.gatingContext.communityRoles[0]);
  } else if (postData.gatingContext.boardRoles?.length) {
    params.set('roleRequired', postData.gatingContext.boardRoles[0]);
  }
  
  return `${baseUrl}/api/og-image?${params.toString()}`;
}

/**
 * Generates a dynamic OG image URL for a post (legacy function - maintained for backward compatibility)
 * @param postId - Post ID
 * @param title - Post title
 * @param author - Author name
 * @param boardName - Board name
 * @returns URL to dynamically generated OG image
 */
export function generateOGImageUrl(postId: number, title: string, author: string, boardName: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || 'https://localhost:3000';
  
  // Encode parameters for URL
  const params = new URLSearchParams({
    title: title.substring(0, 100), // Limit title length for URL
    author,
    board: boardName,
    id: postId.toString()
  });
  
  return `${baseUrl}/api/og-image?${params.toString()}`;
}

/**
 * Determines appropriate robots directive based on gating context
 * @param gatingContext - The gating context from enhanced metadata
 * @returns Robots configuration
 */
export function getPrivacyAwareRobotsConfig(gatingContext: EnhancedPostMetadata['gatingContext']) {
  // If community or board is gated, be more restrictive with indexing
  if (gatingContext.communityGated || gatingContext.boardGated) {
    return {
      index: false, // Don't index private content
      follow: true, // But still follow links
      googleBot: {
        index: false,
        follow: true,
        'max-video-preview': 0,
        'max-image-preview': "none" as const,
        'max-snippet': 0,
      },
    };
  }
  
  // For public or only post-gated content, allow normal indexing
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': "large" as const,
      'max-snippet': -1,
    },
  };
}

/**
 * Formats relative time for meta descriptions
 * @param dateString - ISO date string
 * @returns Human readable relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    return 'just now';
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Generates complete metadata for a forum post (legacy function - maintained for backward compatibility)
 * @param postData - Post metadata from API
 * @param baseUrl - Base URL for canonical links
 * @param boardId - Board ID for URL construction
 * @returns Next.js Metadata object with OG and Twitter tags
 */
export function generatePostMetadata(postData: PostMetadata, baseUrl: string, boardId?: string): Metadata {
  const description = extractDescription(postData.content);
  const ogImageUrl = generateOGImageUrl(postData.id, postData.title, postData.author_name, postData.board_name);
  // We need the boardId to construct the proper URL - will be passed from layout
  const canonicalUrl = boardId 
    ? `${baseUrl}/board/${boardId}/post/${postData.id}`
    : `${baseUrl}/post/${postData.id}`; // fallback
  
  // Create enhanced description with community context
  const enhancedDescription = `${description} | Posted by ${postData.author_name} in ${postData.board_name} • ${postData.upvote_count} upvotes • ${postData.comment_count} comments`;
  
  const metadata: Metadata = {
    title: postData.title,
    description: enhancedDescription,
    
    // Open Graph tags
    openGraph: {
      title: postData.title,
      description: enhancedDescription,
      url: canonicalUrl,
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${postData.title} - ${postData.board_name}`,
        }
      ],
      siteName: 'Curia',
      
      // Article-specific OG tags
      publishedTime: postData.created_at,
      authors: [postData.author_name],
      section: postData.board_name,
      tags: postData.tags,
    },
    
    // Twitter Card tags
    twitter: {
      card: 'summary_large_image',
      title: postData.title,
      description: enhancedDescription,
      images: [ogImageUrl],
      site: '@CuriaForum', // Replace with your actual Twitter handle
      creator: `@${postData.author_name}`, // If users have Twitter handles
    },
    
    // Additional SEO metadata
    keywords: postData.tags.join(', '),
    authors: [{ name: postData.author_name }],
    category: postData.board_name,
    
    // Canonical URL
    alternates: {
      canonical: canonicalUrl,
    },
    
    // Robots directive
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
  
  return metadata;
}

/**
 * Generates privacy-aware metadata for enhanced forum posts
 * @param postData - Enhanced post metadata with gating context
 * @param baseUrl - Base URL for canonical links
 * @param boardId - Board ID for URL construction
 * @returns Next.js Metadata object with privacy-aware OG and Twitter tags
 */
export function generatePrivacyAwarePostMetadata(postData: EnhancedPostMetadata, baseUrl: string, boardId?: string): Metadata {
  const description = generatePrivacyAwareDescription(postData);
  const ogImageUrl = generateEnhancedOGImageUrl(postData);
  const canonicalUrl = boardId 
    ? `${baseUrl}/board/${boardId}/post/${postData.id}`
    : `${baseUrl}/post/${postData.id}`;
  
  // Privacy-aware robots configuration
  const robotsConfig = getPrivacyAwareRobotsConfig(postData.gatingContext);
  
  // Determine if content should be marked as restricted
  const isRestricted = postData.gatingContext.communityGated || postData.gatingContext.boardGated;
  const restrictedPrefix = isRestricted ? '🔒 ' : '';
  
  const metadata: Metadata = {
    title: `${restrictedPrefix}${postData.title}`,
    description,
    
    // Open Graph tags
    openGraph: {
      title: `${restrictedPrefix}${postData.title}`,
      description,
      url: canonicalUrl,
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${postData.title} - ${postData.board_name}`,
        }
      ],
      siteName: 'Curia',
      
      // Article-specific OG tags
      publishedTime: postData.created_at,
      authors: [postData.author_name],
      section: postData.board_name,
      tags: isRestricted ? [] : postData.tags, // Hide tags for restricted content
    },
    
    // Twitter Card tags
    twitter: {
      card: 'summary_large_image',
      title: `${restrictedPrefix}${postData.title}`,
      description,
      images: [ogImageUrl],
      site: '@CuriaForum',
      creator: `@${postData.author_name}`,
    },
    
    // Additional SEO metadata
    keywords: isRestricted ? [] : postData.tags, // Hide keywords for restricted content
    authors: [{ name: postData.author_name }],
    category: postData.board_name,
    
    // Canonical URL
    alternates: {
      canonical: canonicalUrl,
    },
    
    // Privacy-aware robots directive
    robots: robotsConfig,
  };
  
  return metadata;
} 