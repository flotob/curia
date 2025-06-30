'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { CommentItem } from './CommentItem';
import { authFetchJson } from '@/utils/authFetch'; // Using authFetchJson for consistency, though endpoint is public
import { Loader2, MessageCircleWarning, MessagesSquare, ChevronDown, ArrowUpDown, Clock, TrendingUp } from 'lucide-react';
import { buildCommentTree, CommentTree } from '@/utils/commentTree';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CommentListProps {
  postId: number;
  highlightCommentId?: number | null; // New prop to highlight a specific comment
  onCommentHighlighted?: () => void; // Callback when highlight animation completes
  onReply?: (commentId: number) => void; // Callback when user clicks reply
}

type SortOption = 'newest' | 'oldest' | 'most_reactions';

const sortComments = (comments: ApiComment[], sortBy: SortOption): ApiComment[] => {
  return [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'most_reactions':
        // For now, we'll use created_at as a fallback. We could add reaction counts to the comment data later
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });
};

const fetchComments = async (postId: number): Promise<ApiComment[]> => {
  return authFetchJson<ApiComment[]>(`/api/posts/${postId}/comments`);
};

export const CommentList: React.FC<CommentListProps> = ({ 
  postId, 
  highlightCommentId,
  onCommentHighlighted,
  onReply 
}) => {
  const [sortBy, setSortBy] = React.useState<SortOption>('newest');
  const { 
    data: comments, 
    isLoading, 
    error, 
    isFetching 
} = useQuery<ApiComment[], Error>({
    queryKey: ['comments', postId], // Query key specific to this post's comments
    queryFn: () => fetchComments(postId),
    staleTime: 1 * 60 * 1000, // comments are stale after 1 minute
    refetchInterval: 45 * 1000, // refetch every 45 seconds
  });

  // Build comment tree from flat comments array
  const commentTree = React.useMemo(() => {
    if (!comments || comments.length === 0) {
      return [];
    }
    const sortedComments = sortComments(comments, sortBy);
    return buildCommentTree(sortedComments, { maxDepth: 5 });
  }, [comments, sortBy]);

  // Note: totalCommentCount available via getCommentTreeCount(commentTree) if needed

  // Scroll to highlighted comment when it becomes available
  React.useEffect(() => {
    if (highlightCommentId && comments && comments.length > 0) {
      const timer = setTimeout(() => {
        const commentElement = document.getElementById(`comment-${highlightCommentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          console.log(`[CommentList] Scrolled to comment ${highlightCommentId}`);
        }
      }, 100); // Small delay to ensure DOM is updated

      return () => clearTimeout(timer);
    }
  }, [highlightCommentId, comments]);

  // Recursive rendering function for comment trees
  const renderCommentTree = React.useCallback((trees: CommentTree[]): React.ReactNode => {
    return trees.map((tree, index) => (
      <div key={tree.comment.id} className="comment-thread">
        <div className="relative">
          <CommentItem 
            comment={tree.comment}
            depth={tree.depth}
            onReply={onReply}
            isHighlighted={highlightCommentId === tree.comment.id}
            onHighlightComplete={onCommentHighlighted}
          />
          {/* Enhanced thread line for mobile */}
          {tree.depth > 0 && (
            <div 
              className="absolute left-0 top-0 bottom-0 w-px bg-border/40 hidden sm:block"
              style={{
                left: `${(tree.depth - 1) * 0.75 + 0.5}rem`,
                height: index === trees.length - 1 ? '50%' : '100%'
              }}
            />
          )}
        </div>
        {tree.children.length > 0 && (
          <div className={`comment-children ml-2 sm:ml-4 ${tree.depth < 4 ? 'with-thread-line' : ''}`}>
            {renderCommentTree(tree.children)}
          </div>
        )}
      </div>
    ));
  }, [highlightCommentId, onCommentHighlighted, onReply]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading comments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-red-600">
        <MessageCircleWarning className="h-8 w-8 mb-2" />
        <p className="font-semibold">Error loading comments</p>
        <p className="text-xs">{error.message}</p>
      </div>
    );
  }

  if (!comments || comments.length === 0 || commentTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
        <MessagesSquare className="h-8 w-8 mb-2" />
        <p>No comments yet.</p>
        <p className="text-xs">Be the first to share your thoughts!</p>
      </div>
    );
  }



  return (
    <div className="comment-list space-y-3">
      {/* Comment header with sort options */}
      <div className="flex items-center justify-between py-2 border-b border-border/30">
        <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
          <MessagesSquare className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>{comments?.length || 0} comment{(comments?.length || 0) !== 1 ? 's' : ''}</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs h-6 sm:h-7 px-1 sm:px-2">
              <ArrowUpDown className="h-3 w-3 mr-0 sm:mr-1" />
              <span className="hidden sm:inline">Sort</span>
              <ChevronDown className="h-3 w-3 ml-0 sm:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={() => setSortBy('newest')}
              className={sortBy === 'newest' ? 'bg-accent' : ''}
            >
              <Clock className="h-3 w-3 mr-2" />
              Newest first
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setSortBy('oldest')}
              className={sortBy === 'oldest' ? 'bg-accent' : ''}
            >
              <Clock className="h-3 w-3 mr-2" />
              Oldest first
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setSortBy('most_reactions')}
              className={sortBy === 'most_reactions' ? 'bg-accent' : ''}
            >
              <TrendingUp className="h-3 w-3 mr-2" />
              Most reactions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Loading indicator */}
      {isFetching && (
         <div className="absolute top-0 right-0 p-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin inline-block" /> Syncing...
        </div>
      )}
      
      {/* Comments */}
      <div className="space-y-2">
        {renderCommentTree(commentTree)}
      </div>
    </div>
  );
}; 