'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { PostCard } from '@/components/voting/PostCard';
import { CommentList } from '@/components/voting/CommentList';
import { NewCommentForm } from '@/components/voting/NewCommentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, MessageSquare } from 'lucide-react';
import { UniversalProfileProvider } from '@/contexts/UniversalProfileContext';
import { 
  layout, 
  spacingClasses, 
  typography, 
  semanticColors, 
  componentVariants,
  recipes,
  ComponentVariant 
} from '@/lib/design-system/tokens';
// URL builder utilities are now handled internally with buildInternalUrl

interface PostDetailPageProps {
  params: Promise<{
    boardId: string;
    postId: string;
  }>;
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const [boardId, setBoardId] = useState<string>('');
  const [postId, setPostId] = useState<string>('');
  const [isSharedLinkRedirecting, setIsSharedLinkRedirecting] = useState(false);
  
  // Design system state
  const [componentVariant, setComponentVariant] = useState<ComponentVariant>('comfortable');
  
  // All hooks must be called at the top level
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { joinBoard, leaveBoard, isConnected } = useSocket();
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  
  useEffect(() => {
    params.then(({ boardId, postId }) => {
      setBoardId(boardId);
      setPostId(postId);
    });
  }, [params]);

  // 🔗 SHARED LINK DETECTION: Handle external share links
  useEffect(() => {
    if (!searchParams || !boardId || !postId) return;

    const shareToken = searchParams.get('token');
    const communityShortId = searchParams.get('communityShortId');
    const pluginId = searchParams.get('pluginId');

    // Check if this is a shared link access (has share context params)
    const isSharedLink = shareToken && communityShortId && pluginId;

    if (isSharedLink) {
      console.log(`[PostDetailPage] 🔗 Shared link detected, redirecting to Common Ground...`);
      console.log(`[PostDetailPage] Share context:`, { shareToken, communityShortId, pluginId, postId, boardId });
      
      setIsSharedLinkRedirecting(true);
      
      // Set the same cookies as the original share-redirect endpoint
      const sharedContentToken = `${postId}-${boardId}-${Date.now()}`;
      const postData = JSON.stringify({ 
        postId, 
        boardId, 
        token: shareToken, 
        timestamp: Date.now() 
      });

      // Set cookies using document.cookie (client-side)
      document.cookie = `shared_content_token=${sharedContentToken}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `shared_post_data=${encodeURIComponent(postData)}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;

      // Construct Common Ground URL
      const commonGroundBaseUrl = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
      const redirectUrl = `${commonGroundBaseUrl}/c/${communityShortId}/plugin/${pluginId}`;
      
      console.log(`[PostDetailPage] 🚀 Redirecting to: ${redirectUrl}`);
      console.log(`[PostDetailPage] 🍪 Cookies set for post detection in iframe`);
      
      // Redirect to Common Ground (will load plugin in iframe)
      window.location.href = redirectUrl;
      return;
    }

    console.log(`[PostDetailPage] 📄 Normal post page access (not shared link)`);
  }, [searchParams, boardId, postId]);

  const boardIdNum = parseInt(boardId, 10);
  const postIdNum = parseInt(postId, 10);

  // 🚀 REAL-TIME: Auto-join board room for this post
  useEffect(() => {
    if (!isConnected || isNaN(boardIdNum) || !boardId) return;

    console.log(`[PostDetailPage] Auto-joining board room: ${boardIdNum}`);
    joinBoard(boardIdNum);

    return () => {
      console.log(`[PostDetailPage] Auto-leaving board room: ${boardIdNum}`);
      leaveBoard(boardIdNum);
    };
  }, [isConnected, boardIdNum, joinBoard, leaveBoard, boardId]);

  // Fetch board info for shared board context (skip if redirecting shared link)
  const { data: boardInfo } = useQuery<ApiBoard | null>({
    queryKey: ['board', boardIdNum],
    queryFn: async () => {
      if (!user?.cid || !token) return null;
      
      // Use direct board resolution approach that handles shared boards
      try {
        const response = await authFetchJson<{ board: ApiBoard | null }>(
          `/api/communities/${user.cid}/boards/${boardIdNum}`, 
          { token }
        );
        return response.board;
      } catch (error) {
        console.error('[PostDetailPage] Failed to resolve board info:', error);
        return null;
      }
    },
    enabled: !!token && !!user?.cid && !isNaN(boardIdNum) && !!boardId && !isSharedLinkRedirecting,
  });

  // Fetch the specific post (skip if redirecting shared link)
  const { data: post, isLoading: isLoadingPost, error: postError } = useQuery<ApiPost>({
    queryKey: ['post', postIdNum],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      return authFetchJson<ApiPost>(`/api/posts/${postIdNum}`, { token });
    },
    enabled: !!token && !isNaN(postIdNum) && !!postId && !isSharedLinkRedirecting,
  });

  // Fetch comments for the post (skip if redirecting shared link)
  const { data: comments, isLoading: isLoadingComments } = useQuery<ApiComment[]>({
    queryKey: ['comments', postIdNum],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      return authFetchJson<ApiComment[]>(`/api/posts/${postIdNum}/comments`, { token });
    },
    enabled: !!token && !isNaN(postIdNum) && !!postId && !isSharedLinkRedirecting,
  });
  
  // Helper function to build URLs while preserving current parameters
  const buildInternalUrl = (path: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Add/override with new params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    return `${path}?${params.toString()}`;
  };

  // Handle navigation with internal router
  const handleNavigation = (url: string) => {
    console.log(`[PostDetailPage] Internal navigation to: ${url}`);
    router.push(url);
  };

  // Handle when a new comment is posted in detail view
  const handleCommentPosted = (newComment: ApiComment) => {
    console.log(`[PostDetailPage] New comment posted: ${newComment.id}`);
    setHighlightedCommentId(newComment.id);
    setReplyingToCommentId(null); // Clear reply state
    
    // Clear highlight after animation
    setTimeout(() => {
      setHighlightedCommentId(null);
    }, 4000);
  };

  // Handle when user clicks reply on a comment
  const handleReplyToComment = (commentId: number) => {
    console.log(`[PostDetailPage] Replying to comment: ${commentId}`);
    setReplyingToCommentId(commentId);
    // Scroll to comment form
    setTimeout(() => {
      const formElement = document.querySelector('.new-comment-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Early return for loading params state
  if (!boardId || !postId) {
    return <div>Loading...</div>;
  }

  // Early return for shared link redirect state
  if (isSharedLinkRedirecting) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Card>
            <CardContent className="py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h1 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Opening in Common Ground...
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Redirecting to the full forum experience...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingPost) {
    return (
      <div className={`${layout.container.lg} ${spacingClasses.xl}`}>
        <div className={spacingClasses.lg}>
          {/* Breadcrumb Skeleton */}
          <div className={`h-6 ${semanticColors.surface.secondary} rounded animate-pulse w-64`} />
          
          {/* Post Skeleton */}
          <Card className={recipes.postCard[componentVariant]}>
            <CardHeader>
              <div className={componentVariants.card[componentVariant].spacing}>
                <div className={`h-4 ${semanticColors.surface.secondary} rounded animate-pulse w-32`} />
                <div className={`h-8 ${semanticColors.surface.secondary} rounded animate-pulse`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={componentVariants.card[componentVariant].spacing}>
                <div className={`h-4 ${semanticColors.surface.secondary} rounded animate-pulse`} />
                <div className={`h-4 ${semanticColors.surface.secondary} rounded animate-pulse w-3/4`} />
                <div className={`h-4 ${semanticColors.surface.secondary} rounded animate-pulse w-1/2`} />
              </div>
            </CardContent>
          </Card>

          {/* Comments Skeleton */}
          <Card className={recipes.postCard[componentVariant]}>
            <CardHeader>
              <div className={`h-6 ${semanticColors.surface.secondary} rounded animate-pulse w-24`} />
            </CardHeader>
            <CardContent>
              <div className={spacingClasses.md}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={spacingClasses.sm}>
                    <div className={`h-4 ${semanticColors.surface.secondary} rounded animate-pulse w-48`} />
                    <div className={`h-3 ${semanticColors.surface.secondary} rounded animate-pulse`} />
                    <div className={`h-3 ${semanticColors.surface.secondary} rounded animate-pulse w-2/3`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (postError || !post) {
    return (
      <div className={`${layout.container.lg} ${spacingClasses.xl}`}>
        <div className={`text-center ${spacingClasses.md}`}>
          <Card className={recipes.postCard[componentVariant]}>
            <CardContent className={`${componentVariants.density[componentVariant].padding} text-center`}>
              <h1 className={`${typography.heading.h2.classes} ${semanticColors.content.primary} mb-4`}>
                Post Not Found
              </h1>
              <p className={`${typography.body.base.classes} ${semanticColors.content.secondary} mb-6`}>
                {postError instanceof Error ? postError.message : 'The post you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
              </p>
              <div className={`flex gap-4 justify-center`}>
                <Button 
                  onClick={() => handleNavigation(buildInternalUrl('/', { boardId: boardId }))}
                  variant="outline"
                  className={componentVariants.button[componentVariant].size}
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Board
                </Button>
                <Button 
                  onClick={() => handleNavigation(buildInternalUrl('/'))}
                  className={componentVariants.button[componentVariant].size}
                >
                  <Home size={16} className="mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`${layout.container.lg} ${spacingClasses.xl} overflow-x-hidden`}>
      <div className={`${spacingClasses.lg} w-full max-w-full`}>
        {/* Design System Variant Selector - Development only */}
        {process.env.NODE_ENV === 'development' && (
          <div className={`mb-4 p-4 ${semanticColors.surface.tertiary} rounded-lg`}>
            <label className={`${typography.meta.label.classes} block mb-2`}>
              Design Variant:
            </label>
            <select 
              value={componentVariant} 
              onChange={(e) => setComponentVariant(e.target.value as ComponentVariant)}
              className={`${typography.body.small.classes} p-2 border rounded`}
            >
              <option value="dense">Dense</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        )}

        {/* Post Detail Card - Full Content */}
        <PostCard 
          post={post} 
          showBoardContext={false}
          showFullContent={true}
          variant={componentVariant}
          boardInfo={boardInfo}
        />

        {/* Comments Section */}
        <Card className={recipes.postCard[componentVariant]}>
          <CardHeader>
            <CardTitle className={`${layout.flex.start} ${typography.heading.h4.classes}`}>
              <MessageSquare size={componentVariant === 'dense' ? 16 : componentVariant === 'spacious' ? 24 : 20} className="mr-2" />
              Comments {comments && `(${comments.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className={componentVariants.card[componentVariant].spacing}>
            {/* New Comment Form */}
            <div className="new-comment-form">
              <UniversalProfileProvider>
                <NewCommentForm 
                  postId={postIdNum} 
                  post={post} 
                  parentCommentId={replyingToCommentId}
                  onCommentPosted={handleCommentPosted} 
                />
              </UniversalProfileProvider>
              {replyingToCommentId && (
                <div className={`mt-2 ${typography.body.small.classes} ${semanticColors.content.secondary} ${layout.flex.between}`}>
                  <span>Replying to comment #{replyingToCommentId}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setReplyingToCommentId(null)}
                    className={`${componentVariants.button[componentVariant].size} ${typography.body.tiny.classes}`}
                  >
                    Cancel Reply
                  </Button>
                </div>
              )}
            </div>
            
            {/* Comments List */}
            {isLoadingComments ? (
              <div className={spacingClasses.md}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={spacingClasses.sm}>
                    <div className={`h-4 ${semanticColors.surface.secondary} rounded animate-pulse w-48`} />
                    <div className={`h-3 ${semanticColors.surface.secondary} rounded animate-pulse`} />
                    <div className={`h-3 ${semanticColors.surface.secondary} rounded animate-pulse w-2/3`} />
                  </div>
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              <CommentList 
                postId={postIdNum} 
                variant={componentVariant}
                highlightCommentId={highlightedCommentId}
                onCommentHighlighted={() => setHighlightedCommentId(null)}
                onReply={handleReplyToComment}
              />
            ) : (
              <div className={`text-center ${spacingClasses.xl.replace('space-y-8', 'py-8')}`}>
                <MessageSquare size={48} className={`mx-auto ${semanticColors.content.tertiary} mb-4`} />
                <p className={`${typography.body.base.classes} ${semanticColors.content.secondary}`}>
                  No comments yet. Be the first to start the discussion!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 