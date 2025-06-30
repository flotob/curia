'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, MessageSquare } from 'lucide-react';
import { UniversalProfileProvider } from '@/contexts/UniversalProfileContext';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
// import { useBookmarks } from '@/hooks/useBookmarks';


// import { GatingProgressIndicator } from '@/components/ui/GatingProgressIndicator';
import { FadeIn, StaggerChildren } from '@/components/ui/animations';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  
  // Refs for focus management
  const commentFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then(({ boardId, postId }) => {
      setBoardId(boardId);
      setPostId(postId);
    });
  }, [params]);

  const boardIdNum = parseInt(boardId, 10);
  const postIdNum = parseInt(postId, 10);

  // Fetch the specific post
  const { data: post, isLoading: isLoadingPost, error: postError } = useQuery<ApiPost>({
    queryKey: ['post', postIdNum],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      return authFetchJson<ApiPost>(`/api/posts/${postIdNum}`, { token });
    },
    enabled: !!token && !isNaN(postIdNum) && !!postId && !isSharedLinkRedirecting,
  });

  // Bookmark functionality (handled internally by BookmarkButton)
  // const { isBookmarked, toggleBookmark } = useBookmarks(postIdNum);





  // Navigation helpers
  const buildUrl = useCallback((path: string, additionalParams: Record<string, string> = {}) => {
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
  }, [searchParams]);

  const handleNavigateBack = useCallback(() => {
    const backUrl = searchParams?.get('boardId') 
      ? buildUrl('/', { boardId: searchParams.get('boardId')! })
      : buildUrl('/');
    router.push(backUrl);
  }, [router, searchParams, buildUrl]);

  const handleFocusComment = useCallback(() => {
    commentFormRef.current?.focus();
    commentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleVoteAction = useCallback(() => {
    // The vote button will handle this, just provide focus feedback
    toast({
      title: 'Vote Action',
      description: 'Use the vote button to upvote this post',
      duration: 2000,
    });
  }, [toast]);

  // Keyboard navigation setup
  useKeyboardNavigation({
    onShare: () => {}, // No enhanced share modal
    onBookmark: () => {}, // BookmarkButton handles its own state
    onComment: handleFocusComment,
    onVote: handleVoteAction,
    onNavigateBack: handleNavigateBack,
    onFocusComment: handleFocusComment,
    enableGlobalShortcuts: true,
  });

  // Fetch comments for the post
  const { data: comments, isLoading: isLoadingComments } = useQuery<ApiComment[]>({
    queryKey: ['comments', postIdNum],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      return authFetchJson<ApiComment[]>(`/api/posts/${postIdNum}/comments`, { token });
    },
    enabled: !!token && !isNaN(postIdNum) && !!postId && !isSharedLinkRedirecting,
  });

  // Fetch board info
  const { data: boardInfo } = useQuery<ApiBoard | null>({
    queryKey: ['board', boardIdNum],
    queryFn: async () => {
      if (!user?.cid || !token) return null;
      
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

  // 🔗 SHARED LINK DETECTION: Handle external share links
  useEffect(() => {
    if (!searchParams || !boardId || !postId) return;

    const shareToken = searchParams.get('token');
    const communityShortId = searchParams.get('communityShortId');
    const pluginId = searchParams.get('pluginId');

    const isSharedLink = shareToken && communityShortId && pluginId;

    if (isSharedLink) {
      console.log(`[PostDetailPage] 🔗 Shared link detected, redirecting to Common Ground...`);
      setIsSharedLinkRedirecting(true);
      
      const sharedContentToken = `${postId}-${boardId}-${Date.now()}`;
      const postData = JSON.stringify({ 
        postId, 
        boardId, 
        token: shareToken, 
        timestamp: Date.now() 
      });

      document.cookie = `shared_content_token=${sharedContentToken}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `shared_post_data=${encodeURIComponent(postData)}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;

      const commonGroundBaseUrl = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
      const redirectUrl = `${commonGroundBaseUrl}/c/${communityShortId}/plugin/${pluginId}`;
      
      window.location.href = redirectUrl;
      return;
    }
  }, [searchParams, boardId, postId]);

  // 🚀 REAL-TIME: Auto-join board room
  useEffect(() => {
    if (!isConnected || isNaN(boardIdNum) || !boardId) return;

    joinBoard(boardIdNum);
    return () => leaveBoard(boardIdNum);
  }, [isConnected, boardIdNum, joinBoard, leaveBoard, boardId]);

  // Handle comment posting
  const handleCommentPosted = useCallback((newComment: ApiComment) => {
    setHighlightedCommentId(newComment.id);
    setReplyingToCommentId(null);
    
    toast({
      title: 'Comment Posted!',
      description: 'Your comment has been added to the discussion',
      duration: 3000,
    });
    
    setTimeout(() => setHighlightedCommentId(null), 4000);
  }, [toast]);

  // Early returns for loading states
  if (!boardId || !postId) {
    return <div>Loading...</div>;
  }

  if (isSharedLinkRedirecting) {
    return (
      <div className="text-center content-gap-1">
        <div className="skeleton-container">
          <div className="skeleton-content text-center">
            <div className="loading-spinner"></div>
            <h1 className="loading-title">
              Opening in Common Ground...
            </h1>
            <p className="loading-text">
              Redirecting to the full forum experience...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingPost) {
    return (
      <FadeIn>
        {/* Breadcrumb Skeleton */}
        <div className="skeleton-line w-64" />
        
        {/* Post Skeleton */}
        <div className="skeleton-container">
          <header className="skeleton-header">
            <div className="content-gap-compact">
              <div className="skeleton-line w-32" />
              <div className="skeleton-line" />
            </div>
          </header>
          <div className="skeleton-content">
            <div className="content-gap-compact">
              <div className="skeleton-line" />
              <div className="skeleton-line w-3/4" />
              <div className="skeleton-line w-1/2" />
            </div>
          </div>
        </div>

        {/* Comments Skeleton */}
        <div className="skeleton-container">
          <header className="skeleton-header">
            <div className="skeleton-line w-24" />
          </header>
          <div className="skeleton-content">
            <div className="content-gap-1">
              {[1, 2, 3].map((i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="skeleton-comment">
                    <div className="skeleton-line w-48" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line w-2/3" />
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>
    );
  }

  // Error state
  if (postError || !post) {
    return (
      <FadeIn>
        <div className="skeleton-container">
          <div className="skeleton-content text-center">
            <h1 className="error-title">
              Post Not Found
            </h1>
            <p className="error-text">
              {postError instanceof Error ? postError.message : 'The post you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
            </p>
            <div className="error-actions">
              <Button 
                onClick={handleNavigateBack}
                variant="outline"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Board
              </Button>
              <Button 
                onClick={() => router.push(buildUrl('/'))}
              >
                <Home size={16} className="mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>
    );
  }



  return (
    <div className="max-w-2xl mx-auto">
      {/* Simple Back Button */}
      <FadeIn>
        <div className="mb-4">
          <Button
            onClick={handleNavigateBack}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            aria-label="Go back to board"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      </FadeIn>

      {/* Post Detail Card - Full Content */}
      <FadeIn delay={100}>
        <PostCard 
          post={post} 
          showBoardContext={false}
          showFullContent={true}
          boardInfo={boardInfo}
        />
      </FadeIn>

      {/* New Comment Form - Free Floating */}
      <FadeIn delay={200}>
        <div className="new-comment-form mt-8" ref={commentFormRef}>
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
      </FadeIn>
      
      {/* Comments List - Free Floating */}
      <FadeIn delay={300}>
        <div className="mt-6">
          {isLoadingComments ? (
            <StaggerChildren staggerDelay={100}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-comment">
                  <div className="skeleton-line w-48" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line w-2/3" />
                </div>
              ))}
            </StaggerChildren>
          ) : comments && comments.length > 0 ? (
            <CommentList 
              postId={postIdNum} 
              highlightCommentId={highlightedCommentId}
              onCommentHighlighted={() => setHighlightedCommentId(null)}
            />
          ) : (
            <div className="empty-comments">
              <MessageSquare size={48} className="empty-icon" />
              <p className="empty-text">
                No comments yet. Be the first to start the discussion!
              </p>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
} 