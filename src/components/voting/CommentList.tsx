'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { CommentItem } from './CommentItem';
import { authFetchJson } from '@/utils/authFetch'; // Using authFetchJson for consistency, though endpoint is public
import { Loader2, MessageCircleWarning, MessagesSquare } from 'lucide-react';
import { buildCommentTree, CommentTree } from '@/utils/commentTree';

interface CommentListProps {
  postId: number;
  highlightCommentId?: number | null; // New prop to highlight a specific comment
  onCommentHighlighted?: () => void; // Callback when highlight animation completes
}

const fetchComments = async (postId: number): Promise<ApiComment[]> => {
  return authFetchJson<ApiComment[]>(`/api/posts/${postId}/comments`);
};

export const CommentList: React.FC<CommentListProps> = ({ 
  postId, 
  highlightCommentId,
  onCommentHighlighted
}) => {
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
    return buildCommentTree(comments, { maxDepth: 5 });
  }, [comments]);

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
    return trees.map(tree => {
      // For parent comments (depth 0), render children inside the parent's bubble
      if (tree.depth === 0) {
        const childrenElements = tree.children.length > 0 ? (
          <div className="comment-children mt-3 space-y-2">
            {renderCommentTree(tree.children)}
          </div>
        ) : null;

        return (
          <CommentItem 
            key={tree.comment.id}
            comment={tree.comment}
            depth={tree.depth}
            isHighlighted={highlightCommentId === tree.comment.id}
            onHighlightComplete={onCommentHighlighted}
            childComments={childrenElements}
          />
        );
      } else {
        // For child comments, render normally without their own children handling
        // (since they'll be handled by their parent)
        return (
          <div key={tree.comment.id}>
            <CommentItem 
              comment={tree.comment}
              depth={tree.depth}
              isHighlighted={highlightCommentId === tree.comment.id}
              onHighlightComplete={onCommentHighlighted}
            />
            {tree.children.length > 0 && (
              <div className="comment-children ml-4 mt-2 space-y-2">
                {renderCommentTree(tree.children)}
              </div>
            )}
          </div>
        );
      }
    });
  }, [highlightCommentId, onCommentHighlighted]);

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
      {isFetching && (
         <div className="absolute top-0 right-0 p-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin inline-block" /> Syncing...
        </div>
      )}
      {renderCommentTree(commentTree)}
    </div>
  );
}; 