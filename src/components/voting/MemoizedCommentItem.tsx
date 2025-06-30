'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { Clock, Trash, MoreVertical, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { useTimeSince } from '@/utils/timeUtils';
import { LazyCommentContent } from './LazyCommentContent';
import { UserProfilePopover } from '@/components/mentions/UserProfilePopover';

interface CommentItemProps {
  comment: ApiComment;
  depth?: number;
  onReply?: (commentId: number) => void;
  isHighlighted?: boolean;
  onHighlightComplete?: () => void;
}

// Memoized internal component to prevent unnecessary re-renders
const CommentItemInternal: React.FC<CommentItemProps> = React.memo(({ 
  comment, 
  depth = 0,
  onReply,
  isHighlighted = false,
  onHighlightComplete 
}) => {
  const authorDisplayName = comment.author_name || 'Unknown User';
  const avatarFallback = React.useMemo(() => 
    authorDisplayName.substring(0, 2).toUpperCase(), 
    [authorDisplayName]
  );
  
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const timeSinceText = useTimeSince(comment.created_at);

  // Highlight animation state
  const [showHighlight, setShowHighlight] = React.useState(false);
  const [isAuthorPopoverOpen, setIsAuthorPopoverOpen] = React.useState(false);

  // Memoized indentation style
  const indentStyle = React.useMemo(() => {
    const maxDisplayDepth = 5;
    const clampedDepth = Math.min(depth, maxDisplayDepth);
    return {
      paddingLeft: `${clampedDepth * 0.5}rem`,
    };
  }, [depth]);

  // Memoized delete mutation
  const deleteMutation = useMutation({
    mutationFn: React.useCallback(async () => {
      if (!token) throw new Error('No auth token');
      await authFetchJson(`/api/posts/${comment.post_id}/comments/${comment.id}`, { 
        method: 'DELETE', 
        token 
      });
    }, [token, comment.post_id, comment.id]),
    onSuccess: React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['comments', comment.post_id] });
    }, [queryClient, comment.post_id]),
  });

  // Optimized reply handler
  const handleReply = React.useCallback(() => {
    if (onReply) {
      onReply(comment.id);
    }
  }, [onReply, comment.id]);

  // Optimized delete handler
  const handleDelete = React.useCallback(() => {
    deleteMutation.mutate();
  }, [deleteMutation]);

  // Highlight animation effect
  React.useEffect(() => {
    if (isHighlighted) {
      setShowHighlight(true);
      
      const timer = setTimeout(() => {
        setShowHighlight(false);
        if (onHighlightComplete) {
          onHighlightComplete();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isHighlighted, onHighlightComplete]);

  // Memoized action buttons to prevent re-renders
  const actionButtons = React.useMemo(() => (
    <div className="flex items-center space-x-1">
      {/* Reply Button */}
      {onReply && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReply}
          className="p-1 h-7 w-auto px-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
          title="Reply to this comment"
        >
          <Reply size={12} className="mr-1" />
          Reply
        </Button>
      )}
      
      {/* Admin Menu */}
      {user?.isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="p-1 h-7 w-7">
              <MoreVertical size={14} />
              <span className="sr-only">Comment Options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash size={12} className="mr-2" /> Delete Comment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  ), [onReply, handleReply, user?.isAdmin, handleDelete, deleteMutation.isPending]);

  return (
    <div 
      id={`comment-${comment.id}`}
      className={`flex items-start space-x-3 py-3 transition-all duration-500 ease-out rounded-lg ${
        showHighlight 
          ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 shadow-sm ring-1 ring-blue-200/50 dark:ring-blue-800/50' 
          : ''
      }`}
      style={{
        transform: showHighlight ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 0.5s ease-out',
        ...indentStyle
      }}
    >
      <UserProfilePopover
        userId={comment.author_user_id}
        username={authorDisplayName}
        open={isAuthorPopoverOpen}
        onOpenChange={setIsAuthorPopoverOpen}
      >
        <div className="flex items-center space-x-2 cursor-pointer group/author">
          <Avatar className="h-8 w-8 flex-shrink-0 group-hover/author:ring-2 group-hover/author:ring-primary group-hover/author:ring-opacity-30 transition-all">
            <AvatarImage 
              src={comment.author_profile_picture_url || undefined} 
              alt={`${authorDisplayName}'s avatar`} 
            />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-foreground group-hover/author:text-primary transition-colors text-xs">
            {authorDisplayName}
          </span>
        </div>
      </UserProfilePopover>
      
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="mx-1">•</span>
            <Clock size={12} className="mr-0.5 flex-shrink-0" />
            <span>{timeSinceText}</span>
          </div>
          {actionButtons}
        </div>
        
        {/* Lazy-loaded comment content */}
        <div className="mt-1 text-sm">
          <LazyCommentContent content={comment.content} />
        </div>
      </div>
    </div>
  );
});

CommentItemInternal.displayName = 'CommentItemInternal';

// Export memoized component with shallow comparison
export const MemoizedCommentItem = React.memo(CommentItemInternal, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.content === nextProps.comment.content &&
    prevProps.depth === nextProps.depth &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.onReply === nextProps.onReply &&
    prevProps.onHighlightComplete === nextProps.onHighlightComplete
  );
});

MemoizedCommentItem.displayName = 'MemoizedCommentItem';