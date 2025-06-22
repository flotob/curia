'use client';

import React, { useState } from 'react';
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

// Types for our reaction system
interface ReactionSummary {
  emoji: string;
  count: number;
  users: Array<{ userId: string; name: string; avatar?: string }>;
}

interface ReactionBarProps {
  postId?: number;
  commentId?: number;
  reactions?: ReactionSummary[];
  userReactions?: string[];
  onReact?: (emoji: string) => void;
  onUnreact?: (emoji: string) => void;
  canReact?: boolean;
  className?: string;
}

// Mock data for testing
const mockReactions: ReactionSummary[] = [
  {
    emoji: '👍',
    count: 5,
    users: [
      { userId: '1', name: 'Alice' },
      { userId: '2', name: 'Bob' },
      { userId: '3', name: 'Charlie' },
      { userId: '4', name: 'Diana' },
      { userId: '5', name: 'Eve' }
    ]
  },
  {
    emoji: '❤️',
    count: 3,
    users: [
      { userId: '1', name: 'Alice' },
      { userId: '6', name: 'Frank' },
      { userId: '7', name: 'Grace' }
    ]
  },
  {
    emoji: '😂',
    count: 1,
    users: [
      { userId: '8', name: 'You' }
    ]
  }
];

const mockUserReactions = ['😂']; // User has reacted with laugh emoji

export const ReactionBar: React.FC<ReactionBarProps> = ({
  // postId, // Commented out for now since we're using mock data
  // commentId, // Commented out for now since we're using mock data
  reactions = mockReactions,
  userReactions = mockUserReactions,
  onReact,
  onUnreact,
  canReact = true,
  className
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleEmojiSelect = (emoji: { native: string; [key: string]: unknown }) => {
    console.log('Emoji selected:', emoji);
    
    // Check if user already reacted with this emoji
    const hasReacted = userReactions.includes(emoji.native);
    
    if (hasReacted) {
      onUnreact?.(emoji.native);
    } else {
      onReact?.(emoji.native);
    }
    
    setIsPickerOpen(false);
  };

  const handleReactionClick = (emoji: string) => {
    const hasReacted = userReactions.includes(emoji);
    
    if (hasReacted) {
      onUnreact?.(emoji);
    } else {
      onReact?.(emoji);
    }
  };

  const formatTooltip = (reaction: ReactionSummary): string => {
    const { users, emoji } = reaction;
    
    if (users.length === 1) {
      return `${users[0].name} reacted with ${emoji}`;
    }
    
    if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} reacted with ${emoji}`;
    }
    
    if (users.length === 3) {
      return `${users[0].name}, ${users[1].name} and ${users[2].name} reacted with ${emoji}`;
    }
    
    const firstTwo = users.slice(0, 2).map(u => u.name).join(', ');
    const remaining = users.length - 2;
    return `${firstTwo} and ${remaining} other${remaining > 1 ? 's' : ''} reacted with ${emoji}`;
  };

  if (!canReact && reactions.length === 0) {
    return null; // Don't show anything if user can't react and no reactions exist
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1 mt-2", className)}>
      {/* Existing reaction pills */}
      {reactions.map((reaction) => {
        const hasUserReacted = userReactions.includes(reaction.emoji);
        
        return (
          <Button
            key={reaction.emoji}
            variant="ghost"
            size="sm"
            onClick={() => handleReactionClick(reaction.emoji)}
            disabled={!canReact}
            className={cn(
              "h-8 px-2 py-1 rounded-full border text-sm font-medium transition-all duration-200",
              "hover:scale-105 active:scale-95",
              hasUserReacted
                ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
            title={formatTooltip(reaction)}
          >
            <span className="mr-1">{reaction.emoji}</span>
            <span className="text-xs">{reaction.count}</span>
          </Button>
        );
      })}
      
      {/* Add reaction button */}
      {canReact && (
        <DropdownMenu open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 rounded-full border border-dashed p-0 transition-all duration-200",
                "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400",
                "hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800",
                "hover:scale-105 active:scale-95"
              )}
              title="Add reaction"
            >
              <Plus size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-auto p-0 border-0 shadow-lg" 
            align="start"
            sideOffset={8}
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="auto"
              previewPosition="none"
              skinTonePosition="none"
              searchPosition="sticky"
              maxFrequentRows={2}
              categories={['frequent', 'people', 'nature', 'foods', 'activity']}
              perLine={8}
              emojiSize={20}
              emojiButtonSize={28}
              set="native"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ReactionBar; 