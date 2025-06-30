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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, MessageSquare, Share2, Keyboard } from 'lucide-react';
import { UniversalProfileProvider } from '@/contexts/UniversalProfileContext';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useBookmarks } from '@/hooks/useBookmarks';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { EnhancedShareModal } from '@/components/ui/EnhancedShareModal';
import { GatingProgressIndicator } from '@/components/ui/GatingProgressIndicator';
import { FadeIn, StaggerChildren, GlowEffect } from '@/components/ui/animations';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

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
  const [showEnhancedShare, setShowEnhancedShare] = useState(false);
  const [, setShowKeyboardHelp] = useState(false);
  
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
  const postRef = useRef<HTMLDivElement>(null);

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

  // Bookmark functionality
  const { isBookmarked, toggleBookmark } = useBookmarks(postIdNum);

  // Enhanced sharing functionality  
  const handleEnhancedShare = useCallback(() => {
    setShowEnhancedShare(true);
  }, []);

  const getShareData = useCallback(() => {
    if (!post) return null;
    
    const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || window.location.origin;
    const shareUrl = `${baseUrl}/board/${boardId}/post/${postId}${window.location.search}`;
    
    return {
      url: shareUrl,
      title: post.title,
      description: post.content ? post.content.slice(0, 300) + (post.content.length > 300 ? '...' : '') : '',
      author: post.author_name || undefined,
      authorAvatar: post.author_profile_picture_url || undefined,
      boardName: post.board_name,
      commentCount: post.comment_count,
      createdAt: post.created_at,
      tags: post.tags || undefined,
      isGated: !!(post.lock_id || post.settings),
    };
  }, [post, boardId, postId]);

  // Navigation helpers
  const handleNavigateBack = useCallback(() => {
    const backUrl = searchParams?.get('boardId') 
      ? `/?boardId=${searchParams.get('boardId')}${searchParams?.get('cg_theme') ? '&cg_theme=' + searchParams.get('cg_theme') : ''}`
      : '/';
    router.push(backUrl);
  }, [router, searchParams]);

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
    onShare: handleEnhancedShare,
    onBookmark: toggleBookmark,
    onComment: handleFocusComment,
    onVote: handleVoteAction,
    onNavigateBack: handleNavigateBack,
    onFocusComment: handleFocusComment,
    enableGlobalShortcuts: !showEnhancedShare, // Disable when modal is open
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

  // Handle comment replies
  const handleReplyToComment = useCallback((commentId: number) => {
    setReplyingToCommentId(commentId);
    setTimeout(() => {
      commentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  // Show keyboard shortcuts
  const handleShowKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp(true);
    toast({
      title: 'Keyboard Shortcuts',
      description: (
        <div className="space-y-1 text-sm">
          <div><kbd className="px-1.5 py-0.5 bg-muted rounded">Cmd+S</kbd> Share post</div>
          <div><kbd className="px-1.5 py-0.5 bg-muted rounded">Cmd+B</kbd> Bookmark</div>
          <div><kbd className="px-1.5 py-0.5 bg-muted rounded">C</kbd> Focus comment</div>
          <div><kbd className="px-1.5 py-0.5 bg-muted rounded">U</kbd> Vote action</div>
          <div><kbd className="px-1.5 py-0.5 bg-muted rounded">H</kbd> Go back</div>
        </div>
      ),
      duration: 8000,
    });
  }, [toast]);

  // Early returns for loading states
  if (!boardId || !postId) {
    return <div>Loading...</div>;
  }

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

  if (isLoadingPost) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <FadeIn>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-64" />
          </FadeIn>
          <FadeIn delay={100}>
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    );
  }

  if (postError || !post) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <FadeIn>
            <Card>
              <CardContent className="py-12">
                <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
                  Post Not Found
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {postError instanceof Error ? postError.message : 'The post you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
                </p>
                <div className="space-x-4">
                  <Button onClick={handleNavigateBack} variant="outline">
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Board
                  </Button>
                  <Button onClick={() => router.push('/')}>
                    <Home size={16} className="mr-2" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    );
  }

  const shareData = getShareData();
  const hasGating = !!(post.lock_id || post.settings);

  return (
    <div 
      className="container mx-auto py-8 px-4 overflow-x-hidden"
      role="main"
      aria-label="Post details page"
    >
      <div className="max-w-4xl mx-auto space-y-6 w-full max-w-full">
        {/* Enhanced Header with Actions */}
        <FadeIn>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
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
              
              {boardInfo && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">in</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <span className="font-medium">{boardInfo.name}</span>
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleShowKeyboardHelp}
                variant="ghost"
                size="sm"
                aria-label="Show keyboard shortcuts"
                title="Show keyboard shortcuts"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              
              <BookmarkButton
                postId={postIdNum}
                variant="ghost"
                size="sm"
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this post'}
              />
              
              <Button
                onClick={handleEnhancedShare}
                variant="ghost"
                size="sm"
                aria-label="Share this post"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Share</span>
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Gating Progress Indicator */}
        {hasGating && (
          <FadeIn delay={100}>
            <GlowEffect isActive={hasGating} color="blue">
              <GatingProgressIndicator
                requirements={[
                  // Mock requirements - in real app this would come from the gating system
                  {
                    id: '1',
                    name: 'Token Ownership',
                    type: 'token',
                    status: 'completed',
                    progress: 100,
                    description: 'Own required tokens to access',
                    metadata: { current: '50', required: '10', unit: 'tokens' }
                  },
                  {
                    id: '2',
                    name: 'Social Verification',
                    type: 'social',
                    status: 'in_progress',
                    progress: 75,
                    description: 'Verify your social connections'
                  }
                ]}
                overallProgress={87}
                fulfillmentMode="any"
                isVerified={true}
                isLoading={false}
                onStartVerification={() => console.log('Start verification')}
                onRetry={(id) => console.log('Retry requirement:', id)}
              />
            </GlowEffect>
          </FadeIn>
        )}

        {/* Post Detail Card - Enhanced with animations */}
        <FadeIn delay={200}>
          <GlowEffect isActive={false}>
            <div ref={postRef}>
              <PostCard 
                post={post} 
                showBoardContext={false}
                showFullContent={true}
                boardInfo={boardInfo}
              />
            </div>
          </GlowEffect>
        </FadeIn>

        {/* Comments Section - Enhanced */}
        <FadeIn delay={300}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare size={20} className="mr-2" />
                  Comments
                  {comments && (
                    <Badge variant="secondary" className="ml-2">
                      {comments.length}
                    </Badge>
                  )}
                </div>
                
                {comments && comments.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {comments.length === 1 ? '1 reply' : `${comments.length} replies`}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Enhanced Comment Form */}
              <div ref={commentFormRef} className="new-comment-form">
                <UniversalProfileProvider>
                  <NewCommentForm 
                    postId={postIdNum} 
                    post={post} 
                    parentCommentId={replyingToCommentId}
                    onCommentPosted={handleCommentPosted} 
                  />
                </UniversalProfileProvider>
                {replyingToCommentId && (
                  <div className="mt-2 text-sm text-muted-foreground flex items-center justify-between">
                    <span>Replying to comment #{replyingToCommentId}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setReplyingToCommentId(null)}
                      className="text-xs"
                    >
                      Cancel Reply
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Enhanced Comments List */}
              {isLoadingComments ? (
                <StaggerChildren staggerDelay={100}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-48" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
                    </div>
                  ))}
                </StaggerChildren>
              ) : comments && comments.length > 0 ? (
                <CommentList 
                  postId={postIdNum} 
                  highlightCommentId={highlightedCommentId}
                  onCommentHighlighted={() => setHighlightedCommentId(null)}
                  onReply={handleReplyToComment}
                />
              ) : (
                <FadeIn>
                  <div className="text-center py-8">
                    <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">
                      No comments yet. Be the first to start the discussion!
                    </p>
                  </div>
                </FadeIn>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Enhanced Share Modal */}
        {shareData && (
          <EnhancedShareModal
            isOpen={showEnhancedShare}
            onClose={() => setShowEnhancedShare(false)}
            shareData={shareData}
            isGenerating={false}
          />
        )}
      </div>
    </div>
  );
} 