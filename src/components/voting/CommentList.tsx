'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { CommentItem } from './CommentItem';
import { authFetchJson } from '@/utils/authFetch'; // Using authFetchJson for consistency, though endpoint is public
import { Loader2, MessageCircleWarning, MessagesSquare } from 'lucide-react';
import { buildCommentTree, CommentTree } from '@/utils/commentTree';
import { 
  spacingClasses, 
  typography, 
  semanticColors, 
  ComponentVariant 
} from '@/lib/design-system/tokens';

interface CommentListProps {
  postId: number;
  variant?: ComponentVariant; // Design system variant
  highlightCommentId?: number | null; // New prop to highlight a specific comment
  onCommentHighlighted?: () => void; // Callback when highlight animation completes
  onReply?: (commentId: number) => void; // Callback when user clicks reply
}

const fetchComments = async (postId: number): Promise<ApiComment[]> => {
  return authFetchJson<ApiComment[]>(`/api/posts/${postId}/comments`);
};

export const CommentList: React.FC<CommentListProps> = ({ 
  postId, 
  variant = 'comfortable',
  highlightCommentId,
  onCommentHighlighted,
  onReply 
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
    return trees.map(tree => (
      <div key={tree.comment.id} className="comment-thread">
        <CommentItem 
          comment={tree.comment}
          depth={tree.depth}
          variant={variant}
          onReply={onReply}
          isHighlighted={highlightCommentId === tree.comment.id}
          onHighlightComplete={onCommentHighlighted}
        />
        {tree.children.length > 0 && (
          <div className={`comment-children ${tree.depth < 4 ? 'with-thread-line' : ''}`}>
            {renderCommentTree(tree.children)}
          </div>
        )}
      </div>
    ));
  }, [highlightCommentId, onCommentHighlighted, onReply, variant]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${spacingClasses.md.replace('space-y-4', 'py-4')} ${semanticColors.content.secondary}`}>
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className={typography.body.base.classes}>Loading comments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center ${spacingClasses.md.replace('space-y-4', 'py-4')} ${semanticColors.feedback.error.content}`}>
        <MessageCircleWarning className="h-8 w-8 mb-2" />
        <p className={typography.meta.label.classes}>Error loading comments</p>
        <p className={typography.body.tiny.classes}>{error.message}</p>
      </div>
    );
  }

  if (!comments || comments.length === 0 || commentTree.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center ${spacingClasses.md.replace('space-y-4', 'py-4')} ${semanticColors.content.secondary}`}>
        <MessagesSquare className="h-8 w-8 mb-2" />
        <p className={typography.body.base.classes}>No comments yet.</p>
        <p className={typography.body.tiny.classes}>Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className={`comment-list ${spacingClasses.sm}`}>
      {isFetching && (
         <div className={`absolute top-0 right-0 p-1 ${typography.body.tiny.classes} ${semanticColors.content.secondary}`}>
            <Loader2 className="h-3 w-3 animate-spin inline-block" /> Syncing...
        </div>
      )}
      {renderCommentTree(commentTree)}
    </div>
  );
}; 