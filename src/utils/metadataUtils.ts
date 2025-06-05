import type { Metadata } from 'next';
import { PostMetadata } from '@/app/api/posts/[postId]/metadata/route';

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
 * Generates a dynamic OG image URL for a post
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
 * Generates complete metadata for a forum post
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