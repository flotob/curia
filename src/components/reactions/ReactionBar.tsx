'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
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
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine the API endpoint based on content type
  const getApiEndpoint = () => {
    if (postId) return `/api/posts/${postId}/reactions`;
    if (commentId) return `/api/comments/${commentId}/reactions`;
    if (lockId) return `/api/locks/${lockId}/reactions`;
    return null;
  };

  // Fetch reactions from API
  const fetchReactions = async () => {
    const endpoint = getApiEndpoint();
    if (!endpoint || !token) return;

    try {
      setError(null);
      const response = await authFetchJson<ReactionsResponse>(endpoint, {
        method: 'GET',
      });
      
      setReactions(response.reactions || []);
      setUserReactions(response.userReactions || []);
    } catch (err) {
      console.error('Failed to fetch reactions:', err);
      setError('Failed to load reactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle a reaction
  const handleReaction = async (emoji: string) => {
    const endpoint = getApiEndpoint();
    if (!endpoint || !token) return;

    try {
      setError(null);
      const response = await authFetchJson<ReactionsResponse & { action: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });

      setReactions(response.reactions || []);
      setUserReactions(response.userReactions || []);
      
      console.log(`Reaction ${response.action}: ${emoji}`);
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
      setError('Failed to update reaction');
    }
  };

  const handleEmojiSelect = (emoji: { native: string; [key: string]: unknown }) => {
    console.log('Emoji selected:', emoji);
    handleReaction(emoji.native);
    setIsPickerOpen(false);
  };

  // Load reactions on mount
  useEffect(() => {
    fetchReactions();
  }, [postId, commentId, lockId, token]);

  // Early return if no valid content ID
  if (!postId && !commentId && !lockId) {
    return null;
  }

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
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchReactions}
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
            onClick={() => handleReaction(reaction.emoji)}
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