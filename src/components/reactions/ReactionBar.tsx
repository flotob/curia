'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
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

interface ReactionBarProps {
  postId?: number;
  commentId?: number;
  lockId?: number;
  className?: string;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  postId,
  commentId,
  lockId,
  className
}) => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Determine the API endpoint based on content type
  const getApiEndpoint = () => {
    if (postId) return `/api/posts/${postId}/reactions`;
    if (commentId) return `/api/comments/${commentId}/reactions`;
    if (lockId) return `/api/locks/${lockId}/reactions`;
    return null;
  };

  // Generate React Query key
  const getQueryKey = () => {
    if (postId) return ['reactions', 'post', postId];
    if (commentId) return ['reactions', 'comment', commentId];
    if (lockId) return ['reactions', 'lock', lockId];
    return ['reactions'];
  };

  // Fetch reactions using React Query
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
    enabled: !!(token && (postId || commentId || lockId)),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false,
  });

  // Toggle reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async (emoji: string): Promise<ReactionsResponse & { action: string }> => {
      const endpoint = getApiEndpoint();
      if (!endpoint || !token) {
        throw new Error('No endpoint or token available');
      }

      const response = await authFetchJson<ReactionsResponse & { action: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });

      return response;
    },
    onSuccess: (data, emoji) => {
      // Update the cache immediately with the new data
      queryClient.setQueryData(getQueryKey(), {
        reactions: data.reactions || [],
        userReactions: data.userReactions || [],
      });
      
      console.log(`Reaction ${data.action}: ${emoji}`);
    },
    onError: (error: Error, emoji) => {
      console.error('Failed to toggle reaction:', error);
      
      // Handle different error scenarios with user-friendly notifications
      if (error?.message?.includes('This board requires verification') || error?.message?.includes('requiresVerification')) {
        toast.error(`Can't add ${emoji} reaction`, {
          description: "This board requires verification before you can react",
        });
      } else if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
        toast.error(`Can't add ${emoji} reaction`, {
          description: "You don't have permission to react here",
          action: {
            label: 'Check Access',
            onClick: () => {
              console.log('Navigate to verification');
            },
          },
        });
      } else if (error?.message?.includes('400')) {
        toast.error(`Invalid emoji reaction`, {
          description: "This emoji format isn't supported",
        });
      } else if (error?.message?.includes('429')) {
        toast.error(`Slow down there! 🐌`, {
          description: "You're reacting too quickly. Try again in a moment.",
        });
      } else if (error?.message?.includes('Network')) {
        toast.error(`Connection failed`, {
          description: "Check your internet connection and try again",
          action: {
            label: 'Retry',
            onClick: () => reactionMutation.mutate(emoji),
          },
        });
      } else {
        toast.error(`Failed to add ${emoji} reaction`, {
          description: "Something went wrong. Please try again.",
          action: {
            label: 'Retry',
            onClick: () => reactionMutation.mutate(emoji),
          },
        });
      }
    },
  });

  const handleEmojiSelect = (emoji: { native: string; [key: string]: unknown }) => {
    console.log('Emoji selected:', emoji);
    reactionMutation.mutate(emoji.native);
    setIsPickerOpen(false);
  };

  // Early return if no valid content ID
  if (!postId && !commentId && !lockId) {
    return null;
  }

  // Extract data with fallbacks
  const reactions = reactionsData?.reactions || [];
  const userReactions = reactionsData?.userReactions || [];

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 py-2", className)}>
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading reactions...</div>
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

  // Create tooltip text for reaction
  const getTooltipText = (reaction: ReactionSummary): string => {
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
  };

  return (
    <div className={cn("flex items-center gap-2 py-2", className)}>
      {/* Existing reaction pills */}
      {reactions.map((reaction) => {
        const userHasReacted = userReactions.includes(reaction.emoji);
        
        return (
          <Button
            key={reaction.emoji}
            variant="ghost"
            size="sm"
            onClick={() => reactionMutation.mutate(reaction.emoji)}
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
      })}

      {/* Add reaction button */}
      {token && (
        <DropdownMenu open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
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
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme={theme === 'dark' ? 'dark' : 'light'}
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={2}
              perLine={8}
              set="native"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ReactionBar; 