import { Metadata } from 'next';
import { EnhancedPostMetadata } from '@/app/api/posts/[postId]/metadata/route';
import { generatePrivacyAwarePostMetadata } from '@/utils/metadataUtils';

interface PostLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    boardId: string;
    postId: string;
  }>;
}

// Generate metadata for social sharing
export async function generateMetadata({ params }: { params: Promise<{ boardId: string; postId: string }> }): Promise<Metadata> {
  const { postId, boardId } = await params;
  
  try {
    // Fetch enhanced post metadata from our public API
    const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/posts/${postId}/metadata`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch metadata for post ${postId}, using fallback`);
      return {
        title: 'Forum Post - Curia',
        description: 'Join the discussion on Curia, a community forum for meaningful conversations.',
        openGraph: {
          title: 'Forum Post - Curia',
          description: 'Join the discussion on Curia, a community forum for meaningful conversations.',
          type: 'website',
          siteName: 'Curia',
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Forum Post - Curia',
          description: 'Join the discussion on Curia, a community forum for meaningful conversations.',
        },
      };
    }
    
    const postData: EnhancedPostMetadata = await response.json();
    
    // Generate privacy-aware metadata using our enhanced utility
    const metadata = generatePrivacyAwarePostMetadata(postData, baseUrl, boardId);
    
    const gatingStatus = postData.gatingContext.communityGated || postData.gatingContext.boardGated || postData.gatingContext.postGated;
    console.log(`Generated privacy-aware metadata for post ${postId}: ${postData.title} (${gatingStatus ? 'gated' : 'public'})`);
    
    return metadata;
    
  } catch (error) {
    console.error(`Error generating metadata for post ${postId}:`, error);
    
    // Fallback metadata
    return {
      title: 'Forum Post - Curia',
      description: 'Join the discussion on Curia, a community forum for meaningful conversations.',
      openGraph: {
        title: 'Forum Post - Curia',
        description: 'Join the discussion on Curia, a community forum for meaningful conversations.',
        type: 'website',
        siteName: 'Curia',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Forum Post - Curia',
        description: 'Join the discussion on Curia, a community forum for meaningful conversations.',
      },
    };
  }
}

// Server component layout that handles metadata
export default function PostLayout({ children }: PostLayoutProps) {
  return <>{children}</>;
} 