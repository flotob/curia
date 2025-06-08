'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Hash, 
  Home, 
  MessageSquare, 
  Share2,
  ExternalLink,
  Copy,
  Users2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';
import { useActiveTypingCount } from '@/hooks/useTypingContext';

// Navigation context interface
interface NavigationContext {
  type: 'home' | 'board' | 'post';
  boardId?: string | null;
  postId?: string | null;
  isPostDetail: boolean;
}

// Enhanced context data interface
interface ContextualNavigationData {
  navigationContext: NavigationContext;
  currentBoard?: ApiBoard;
  currentPost?: ApiPost;
  commentCount?: number;
}

interface ContextualNavigationCardProps {
  data: ContextualNavigationData;
  className?: string;
}

export const ContextualNavigationCard: React.FC<ContextualNavigationCardProps> = ({
  data,
  className
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigationContext, currentBoard, currentPost, commentCount = 0 } = data;
  
  // Get real-time typing count based on current context
  const activeTypers = useActiveTypingCount(
    navigationContext.boardId ? parseInt(navigationContext.boardId) : undefined,
    navigationContext.postId ? parseInt(navigationContext.postId) : undefined
  );

  // Helper function to build URLs while preserving current parameters
  const buildInternalUrl = React.useCallback((path: string, additionalParams: Record<string, string> = {}) => {
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

  // Navigation handlers
  const handleHomeClick = () => {
    const url = buildInternalUrl('/');
    router.push(url);
  };

  const handleBoardClick = () => {
    if (currentBoard) {
      const url = buildInternalUrl('/', { boardId: currentBoard.id.toString() });
      router.push(url);
    }
  };

  const handlePostClick = () => {
    if (currentPost && currentBoard) {
      const url = buildInternalUrl(`/board/${currentBoard.id}/post/${currentPost.id}`);
      router.push(url);
    }
  };

  // Copy post link to clipboard
  const handleCopyPostLink = async () => {
    if (currentPost && currentBoard) {
      const url = `${window.location.origin}/board/${currentBoard.id}/post/${currentPost.id}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Post link copied to clipboard');
      } catch (err) {
        console.error('Failed to copy link:', err);
        toast.error('Failed to copy link');
      }
    }
  };

  // Share post (Web Share API if available)
  const handleSharePost = async () => {
    if (currentPost && currentBoard) {
      const url = `${window.location.origin}/board/${currentBoard.id}/post/${currentPost.id}`;
      const shareData = {
        title: currentPost.title,
        text: `Check out this discussion: ${currentPost.title}`,
        url: url,
      };

      try {
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          // Fallback to copy
          await handleCopyPostLink();
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Sharing failed:', err);
          // Fallback to copy
          await handleCopyPostLink();
        }
      }
    }
  };

  // Render based on navigation context
  switch (navigationContext.type) {
    case 'post':
      return (
        <Card className={cn("mb-4", className)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                <span>Current Post</span>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPostLink}
                  className="h-6 w-6 p-0"
                  title="Copy post link"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSharePost}
                  className="h-6 w-6 p-0"
                  title="Share post"
                >
                  <Share2 className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Post title and board breadcrumb */}
            <div>
              <button 
                onClick={handlePostClick}
                className="text-left w-full group"
              >
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {currentPost?.title || 'Loading post...'}
                </h3>
              </button>
              {currentBoard && (
                <button 
                  onClick={handleBoardClick}
                  className="text-xs text-muted-foreground mt-1 hover:text-primary transition-colors flex items-center"
                >
                  <Hash className="h-3 w-3 mr-1" />
                  {currentBoard.name}
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Activity summary */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-3">
                {commentCount > 0 && (
                  <div className="flex items-center">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    <span>{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              {activeTypers > 0 && (
                <div className="flex items-center text-amber-600 dark:text-amber-400">
                  <Users2 className="h-3 w-3 mr-1" />
                  <span>{activeTypers} typing...</span>
                </div>
              )}
            </div>

            {/* Quick navigation breadcrumb */}
            <div className="flex items-center space-x-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <button 
                onClick={handleHomeClick}
                className="hover:text-primary transition-colors flex items-center"
              >
                <Home className="h-3 w-3 mr-1" />
                Home
              </button>
              <span>›</span>
              {currentBoard && (
                <>
                  <button 
                    onClick={handleBoardClick}
                    className="hover:text-primary transition-colors truncate"
                  >
                    {currentBoard.name}
                  </button>
                  <span>›</span>
                  <span className="truncate">Post</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      );

    case 'board':
      return (
        <Card className={cn("mb-4", className)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Hash className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
              <span>Current Board</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Board info */}
            <div>
              <button 
                onClick={handleBoardClick}
                className="text-left w-full group"
              >
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                  {currentBoard?.name || 'Loading board...'}
                </h3>
                {currentBoard?.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {currentBoard.description}
                  </p>
                )}
              </button>
            </div>

            {/* Activity indicators */}
            {activeTypers > 0 && (
              <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                <Users2 className="h-3 w-3 mr-1" />
                <span>{activeTypers} user{activeTypers !== 1 ? 's' : ''} typing...</span>
              </div>
            )}

            {/* Quick navigation breadcrumb */}
            <div className="flex items-center space-x-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <button 
                onClick={handleHomeClick}
                className="hover:text-primary transition-colors flex items-center"
              >
                <Home className="h-3 w-3 mr-1" />
                Home
              </button>
              <span>›</span>
              <span className="truncate">Board</span>
            </div>
          </CardContent>
        </Card>
      );

    case 'home':
    default:
      return (
        <Card className={cn("mb-4", className)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Home className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
              <span>Home Feed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Viewing all recent discussions across boards
            </p>
            
            {/* Activity indicators */}
            {activeTypers > 0 && (
              <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                <Users2 className="h-3 w-3 mr-1" />
                <span>{activeTypers} user{activeTypers !== 1 ? 's' : ''} typing across boards...</span>
              </div>
            )}
          </CardContent>
        </Card>
      );
  }
}; 