'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// Lazy import emoji picker for better performance
const EmojiPicker = React.lazy(() => import('./EmojiPickerComponent'));

// Types for our reaction system
interface ReactionSummary {
  emoji: string;
  count: number;
  users: Array<{ userId: string; name: string; avatar?: string }>;
}

interface ReactionsResponse {
  reactions: ReactionSummary[];
  userReactions: string[];
}

interface LazyReactionBarProps {
  postId?: number;
  commentId?: number;
  lockId?: number;
  className?: string;
  lazy?: boolean; // Whether to use lazy loading
  showQuickReactions?: boolean; // Show quick reaction buttons
}

// Quick reaction buttons for instant feedback
const QuickReactionButtons: React.FC<{
  onReact: (emoji: string) => void;
  userReactions: string[];
  disabled?: boolean;
}> = React.memo(({ onReact, userReactions, disabled = false }) => {
  const quickReactions = ['👍', '❤️', '😊', '👏', '🔥'];
  
  return (
    <div className="flex items-center gap-1">
      {quickReactions.map((emoji) => {
        const isActive = userReactions.includes(emoji);
        return (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            onClick={() => onReact(emoji)}
            disabled={disabled}
            className={cn(
              "h-7 w-7 p-0 rounded-full transition-all duration-200 hover:scale-110",
              isActive 
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-600" 
                : "hover:bg-muted"
            )}
            title={`React with ${emoji}`}
          >
            <span className="text-sm">{emoji}</span>
          </Button>
        );
      })}
    </div>
  );
});

QuickReactionButtons.displayName = 'QuickReactionButtons';

// Skeleton for loading state
const ReactionBarSkeleton: React.FC = () => (
  <div className="flex items-center gap-2 py-2">
    <div className="flex gap-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      ))}
    </div>
    <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
  </div>
);

export const LazyReactionBar: React.FC<LazyReactionBarProps> = ({
  postId,
  commentId,
  lockId,
  className,
  lazy = true,
  showQuickReactions = true
}) => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [shouldLoadPicker, setShouldLoadPicker] = useState(!lazy);
  const [isInView, setIsInView] = useState(false);

  // Determine the API endpoint based on content type
  const getApiEndpoint = useCallback(() => {
    if (postId) return `/api/posts/${postId}/reactions`;
    if (commentId) return `/api/comments/${commentId}/reactions`;
    if (lockId) return `/api/locks/${lockId}/reactions`;
    return null;
  }, [postId, commentId, lockId]);

  // Generate React Query key
  const getQueryKey = useCallback(() => {
    if (postId) return ['reactions', 'post', postId];
    if (commentId) return ['reactions', 'comment', commentId];
    if (lockId) return ['reactions', 'lock', lockId];
    return ['reactions'];
  }, [postId, commentId, lockId]);

  // Intersection observer for lazy loading
  const observerRef = useIntersectionObserver(
    useCallback(() => {
      setIsInView(true);
    }, []),
    {
      threshold: 0.1,
      rootMargin: '100px',
      enabled: lazy && !isInView
    }
  );

  // Fetch reactions using React Query - only when in view or not lazy
  const { data: reactionsData, isLoading, error, refetch } = useQuery({
    queryKey: getQueryKey(),
    queryFn: async (): Promise<ReactionsResponse> => {
      const endpoint = getApiEndpoint();
      if (!endpoint || !token) {
        return { reactions: [], userReactions: [] };
      }

      const response = await authFetchJson<ReactionsResponse>(endpoint, {
        method: 'GET',
      });
      
      return response;
    },
    enabled: !!(token && (postId || commentId || lockId) && (!lazy || isInView)),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Memoized reaction mutation
  const reactionMutation = useMutation({
    mutationFn: useCallback(async (emoji: string): Promise<ReactionsResponse & { action: string }> => {
      const endpoint = getApiEndpoint();
      if (!endpoint || !token) {
        throw new Error('No endpoint or token available');
      }

      const response = await authFetchJson<ReactionsResponse & { action: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });

      return response;
    }, [getApiEndpoint, token]),
    onSuccess: useCallback((data: ReactionsResponse & { action: string }) => {
      queryClient.setQueryData(getQueryKey(), {
        reactions: data.reactions || [],
        userReactions: data.userReactions || [],
      });
    }, [queryClient, getQueryKey]),
    onError: useCallback((error: Error, emoji: string) => {
      console.error('Failed to toggle reaction:', error);
      
      if (error?.message?.includes('verification')) {
        toast.error(`Can't add ${emoji} reaction`, {
          description: "This board requires verification before you can react",
        });
      } else {
        toast.error(`Failed to add ${emoji} reaction`, {
          description: "Something went wrong. Please try again.",
        });
      }
    }, []),
  });

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: { native: string } | string) => {
    const emojiString = typeof emoji === 'string' ? emoji : emoji.native;
    reactionMutation.mutate(emojiString);
    setIsPickerOpen(false);
  }, [reactionMutation]);

  // Memoized tooltip text (must be defined before early returns)
  const getTooltipText = useCallback((reaction: ReactionSummary): string => {
    if (reaction.count === 1) {
      return `${reaction.users[0]?.name || 'Someone'} reacted with ${reaction.emoji}`;
    }
    
    if (reaction.count <= 3) {
      const names = reaction.users.slice(0, reaction.count).map(u => u.name).join(', ');
      return `${names} reacted with ${reaction.emoji}`;
    }
    
    const firstTwo = reaction.users.slice(0, 2).map(u => u.name).join(', ');
    const remaining = reaction.count - 2;
    return `${firstTwo} and ${remaining} others reacted with ${reaction.emoji}`;
  }, []);

  // Extract data with fallbacks
  const reactions = useMemo(() => reactionsData?.reactions || [], [reactionsData?.reactions]);
  const userReactions = useMemo(() => reactionsData?.userReactions || [], [reactionsData?.userReactions]);

  // Load picker on demand
  const handlePickerOpen = useCallback(() => {
    if (!shouldLoadPicker) {
      setShouldLoadPicker(true);
    }
    setIsPickerOpen(true);
  }, [shouldLoadPicker]);

  // Memoized reaction pills
  const reactionPills = useMemo(() => (
    reactions.map((reaction) => {
      const userHasReacted = userReactions.includes(reaction.emoji);
      
      return (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="sm"
          onClick={() => handleEmojiSelect(reaction.emoji)}
          className={cn(
            "h-8 px-2 py-1 rounded-full border transition-all duration-200",
            userHasReacted 
              ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50" 
              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
          title={getTooltipText(reaction)}
        >
          <span className="text-sm mr-1">{reaction.emoji}</span>
          <span className="text-xs font-medium">{reaction.count}</span>
        </Button>
      );
    })
  ), [reactions, userReactions, handleEmojiSelect, getTooltipText]);

  // Early return if no valid content ID
  if (!postId && !commentId && !lockId) {
    return null;
  }

  // Show skeleton while loading or not in view (for lazy loading)
  if ((lazy && !isInView) || (isLoading && !reactionsData)) {
    return (
      <div ref={observerRef} className={cn("opacity-60", className)}>
        <ReactionBarSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex items-center gap-2 py-2", className)}>
        <div className="text-sm text-red-600 dark:text-red-400">Failed to load reactions</div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()}
          className="text-xs"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div ref={observerRef} className={cn("overflow-x-auto scrollbar-hide py-2 w-0 min-w-full", className)}>
      <div className="flex items-center gap-2 min-w-max">
        {/* Existing reaction pills */}
        {reactionPills}

        {/* Quick reactions or emoji picker */}
        {token && (
          <div className="flex items-center gap-1">
            {/* Quick reaction buttons */}
            {showQuickReactions && reactions.length === 0 && (
              <QuickReactionButtons
                onReact={handleEmojiSelect}
                userReactions={userReactions}
                disabled={reactionMutation.isPending}
              />
            )}

            {/* Full emoji picker */}
            <DropdownMenu open={isPickerOpen} onOpenChange={setIsPickerOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePickerOpen}
                  className="h-8 w-8 p-0 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Add reaction"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="p-0 border-0 shadow-lg" 
                align="start"
                side="top"
              >
                {shouldLoadPicker && (
                  <React.Suspense fallback={
                    <div className="p-4">
                      <div className="text-sm text-muted-foreground">Loading emoji picker...</div>
                    </div>
                  }>
                    <EmojiPicker
                      onEmojiSelect={handleEmojiSelect}
                      theme={theme}
                    />
                  </React.Suspense>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

export default LazyReactionBar;