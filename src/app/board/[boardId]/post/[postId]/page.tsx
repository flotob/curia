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
      <div className="mobile-container">
        <div className="content-wrapper">
          <Card>
            <CardContent className="content-center">
              <div className="loading-spinner"></div>
              <h1 className="loading-title">
                Opening in Common Ground...
              </h1>
              <p className="loading-text">
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
      <div className="mobile-container">
        <div className="content-wrapper">
          {/* Breadcrumb Skeleton */}
          <div className="skeleton-line w-64" />
          
          {/* Post Skeleton */}
          <Card>
            <CardHeader>
              <div className="skeleton-content">
                <div className="skeleton-line w-32" />
                <div className="skeleton-line" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="skeleton-content">
                <div className="skeleton-line" />
                <div className="skeleton-line w-3/4" />
                <div className="skeleton-line w-1/2" />
              </div>
            </CardContent>
          </Card>

          {/* Comments Skeleton */}
          <Card>
            <CardHeader>
              <div className="skeleton-line w-24" />
            </CardHeader>
            <CardContent>
              <div className="skeleton-content">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-comment">
                    <div className="skeleton-line w-48" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line w-2/3" />
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
      <div className="mobile-container">
        <div className="content-wrapper error-state">
          <Card>
            <CardContent className="content-center">
              <h1 className="error-title">
                Post Not Found
              </h1>
              <p className="error-text">
                {postError instanceof Error ? postError.message : 'The post you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
              </p>
              <div className="error-actions">
                <Button 
                  onClick={() => handleNavigation(buildInternalUrl('/', { boardId: boardId }))}
                  variant="outline"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Board
                </Button>
                <Button 
                  onClick={() => handleNavigation(buildInternalUrl('/'))}
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
    <div className="mobile-container">
      <div className="content-wrapper">
        {/* Post Detail Card - Full Content */}
        <PostCard 
          post={post} 
          showBoardContext={false}
          showFullContent={true}
          boardInfo={boardInfo}
        />

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="comments-header">
              <MessageSquare size={20} className="mr-2" />
              Comments {comments && `(${comments.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="comments-content">
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
                <div className="reply-indicator">
                  <span>Replying to comment #{replyingToCommentId}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setReplyingToCommentId(null)}
                    className="cancel-reply"
                  >
                    Cancel Reply
                  </Button>
                </div>
              )}
            </div>
            
            {/* Comments List */}
            {isLoadingComments ? (
              <div className="comments-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-comment">
                    <div className="skeleton-line w-48" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line w-2/3" />
                  </div>
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              <CommentList 
                postId={postIdNum} 
                highlightCommentId={highlightedCommentId}
                onCommentHighlighted={() => setHighlightedCommentId(null)}
                onReply={handleReplyToComment}
              />
            ) : (
              <div className="empty-comments">
                <MessageSquare size={48} className="empty-icon" />
                <p className="empty-text">
                  No comments yet. Be the first to start the discussion!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <style jsx>{`
        /* Mobile-First Container System */
        .mobile-container {
          container-type: inline-size;
          width: 100%;
          min-height: 100vh;
          padding: 0.75rem;
          background: hsl(var(--background));
        }
        
        .content-wrapper {
          width: 100%;
          max-width: min(100%, 4xl);
          margin: 0 auto;
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        
        /* Container Queries for Progressive Enhancement */
        @container (min-width: 768px) {
          .mobile-container {
            padding: 1.5rem;
          }
          
          .content-wrapper {
            gap: 1.5rem;
          }
        }
        
        @container (min-width: 1024px) {
          .mobile-container {
            padding: 2rem;
          }
          
          .content-wrapper {
            gap: 2rem;
          }
        }
        
        /* Loading States */
        .content-center {
          padding: 3rem 1rem;
          text-align: center;
        }
        
        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 2px solid hsl(var(--primary));
          border-top: 2px solid transparent;
          border-radius: 50%;
          margin: 0 auto 1rem;
          animation: spin 1s linear infinite;
        }
        
        .loading-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: hsl(var(--foreground) / 0.8);
          margin-bottom: 0.5rem;
        }
        
        .loading-text {
          color: hsl(var(--muted-foreground));
        }
        
        /* Error States */
        .error-state .content-center {
          padding: 3rem 1rem;
        }
        
        .error-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: hsl(var(--foreground) / 0.8);
          margin-bottom: 1rem;
        }
        
        .error-text {
          color: hsl(var(--muted-foreground));
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        
        .error-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }
        
        @container (min-width: 640px) {
          .error-actions {
            flex-direction: row;
            justify-content: center;
          }
        }
        
        /* Comments Section */
        .comments-header {
          display: flex;
          align-items: center;
          font-size: 1rem;
          font-weight: 600;
        }
        
        @container (min-width: 768px) {
          .comments-header {
            font-size: 1.125rem;
          }
        }
        
        .comments-content {
          display: grid;
          gap: 1.5rem;
          padding: 1rem;
        }
        
        @container (min-width: 768px) {
          .comments-content {
            padding: 1.5rem;
          }
        }
        
        .reply-indicator {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .cancel-reply {
          font-size: 0.75rem;
        }
        
        /* Empty State */
        .empty-comments {
          text-align: center;
          padding: 2rem 1rem;
        }
        
        .empty-icon {
          margin: 0 auto 1rem;
          color: hsl(var(--muted-foreground) / 0.5);
        }
        
        .empty-text {
          color: hsl(var(--muted-foreground));
          line-height: 1.6;
        }
        
        /* Skeleton Loading */
        .skeleton-line {
          height: 1rem;
          background: hsl(var(--muted) / 0.3);
          border-radius: 0.25rem;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .skeleton-content {
          display: grid;
          gap: 0.75rem;
        }
        
        .skeleton-comment {
          display: grid;
          gap: 0.5rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid hsl(var(--border) / 0.3);
        }
        
        .comments-loading {
          display: grid;
          gap: 1rem;
        }
        
        /* Animation Keyframes */
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        /* Responsive Typography Scale */
        .content-wrapper {
          font-size: 0.875rem;
          line-height: 1.5;
        }
        
        @container (min-width: 640px) {
          .content-wrapper {
            font-size: 0.9375rem;
            line-height: 1.6;
          }
        }
        
        @container (min-width: 768px) {
          .content-wrapper {
            font-size: 1rem;
            line-height: 1.6;
          }
        }
        
        /* Prevent Horizontal Scroll */
        .mobile-container,
        .content-wrapper,
        .mobile-container * {
          box-sizing: border-box;
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }
        
        .content-wrapper {
          overflow-x: hidden;
          width: 100%;
          min-width: 0;
        }
      `}</style>
    </div>
  );
} 