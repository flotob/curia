'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Hash, 
  Home, 
  MessageSquare, 
  Share2,
  ExternalLink,
  Copy,
  Users2,
  Shield,
  Lock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';
import { useActiveTypingCount } from '@/hooks/useTypingContext';
import { SettingsUtils } from '@/types/settings';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { BoardVerificationApiResponse } from '@/types/boardVerification';

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
  const { token, user } = useAuth();
  
  // Get real-time typing count based on current context
  const activeTypers = useActiveTypingCount(
    navigationContext.boardId ? parseInt(navigationContext.boardId) : undefined,
    navigationContext.postId ? parseInt(navigationContext.postId) : undefined
  );

  // Fetch board verification status for current board
  const { data: boardVerificationStatus } = useQuery<BoardVerificationApiResponse>({
    queryKey: ['boardVerificationStatus', currentBoard?.id],
    queryFn: async () => {
      if (!currentBoard?.id || !user?.cid || !token) {
        throw new Error('Missing required data for board verification status');
      }
      return authFetchJson<BoardVerificationApiResponse>(
        `/api/communities/${user.cid}/boards/${currentBoard.id}/verification-status`,
        { token }
      );
    },
    enabled: !!(currentBoard?.id && user?.cid && token && SettingsUtils.hasBoardLockGating(currentBoard?.settings)),
    staleTime: 30000, // 30 seconds
  });

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

            {/* Board Access Status */}
            {currentBoard && (
              <div className="flex flex-wrap gap-2">
                {/* Role-based access restrictions */}
                {SettingsUtils.hasPermissionRestrictions(currentBoard.settings) && (
                  <Badge variant="secondary" className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700">
                    <Shield className="h-3 w-3 mr-1" />
                    Role Restricted
                  </Badge>
                )}
                
                {/* Lock-based write restrictions */}
                {SettingsUtils.hasBoardLockGating(currentBoard.settings) && (
                  <Badge variant="secondary" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                    <Lock className="h-3 w-3 mr-1" />
                    Lock Gated
                  </Badge>
                )}
                
                {/* Open access */}
                {!SettingsUtils.hasPermissionRestrictions(currentBoard.settings) && !SettingsUtils.hasBoardLockGating(currentBoard.settings) && (
                  <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                    <Hash className="h-3 w-3 mr-1" />
                    Open Access
                  </Badge>
                )}
              </div>
            )}

            {/* Lock Progress Indicator */}
            {currentBoard && SettingsUtils.hasBoardLockGating(currentBoard.settings) && boardVerificationStatus?.data && (
              <div className={cn(
                "rounded-lg px-3 py-2 transition-colors",
                boardVerificationStatus.data.hasWriteAccess
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      Lock Progress
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-medium",
                      boardVerificationStatus.data.hasWriteAccess
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    )}>
                      {boardVerificationStatus.data.verifiedCount}/{boardVerificationStatus.data.requiredCount}
                    </span>
                    {boardVerificationStatus.data.hasWriteAccess ? (
                      <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-2">
                  <div className={cn(
                    "w-full h-1.5 rounded-full",
                    boardVerificationStatus.data.hasWriteAccess
                      ? "bg-green-200 dark:bg-green-800"
                      : "bg-red-200 dark:bg-red-800"
                  )}>
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        boardVerificationStatus.data.hasWriteAccess
                          ? "bg-green-500 dark:bg-green-400"
                          : "bg-red-500 dark:bg-red-400"
                      )}
                      style={{
                        width: `${(boardVerificationStatus.data.verifiedCount / boardVerificationStatus.data.requiredCount) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

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