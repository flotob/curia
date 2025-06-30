'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { MemoizedCommentItem } from './MemoizedCommentItem';
import { authFetchJson } from '@/utils/authFetch';
import { Loader2, MessageCircleWarning, MessagesSquare } from 'lucide-react';
import { buildCommentTree, CommentTree } from '@/utils/commentTree';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface VirtualizedCommentListProps {
  postId: number;
  highlightCommentId?: number | null;
  onCommentHighlighted?: () => void;
  onReply?: (commentId: number) => void;
  maxInitialRender?: number; // Number of comments to render initially
  virtualizeThreshold?: number; // Threshold to enable virtualization
}

const fetchComments = async (postId: number): Promise<ApiComment[]> => {
  return authFetchJson<ApiComment[]>(`/api/posts/${postId}/comments`);
};

// Flatten comment tree for virtualization while preserving hierarchy
const flattenCommentTree = (trees: CommentTree[]): CommentTree[] => {
  const result: CommentTree[] = [];
  
  const flatten = (tree: CommentTree) => {
    result.push(tree);
    tree.children.forEach(flatten);
  };
  
  trees.forEach(flatten);
  return result;
};

export const VirtualizedCommentList: React.FC<VirtualizedCommentListProps> = ({ 
  postId, 
  highlightCommentId,
  onCommentHighlighted,
  onReply,
  maxInitialRender = 20,
  virtualizeThreshold = 50
}) => {
  const [renderCount, setRenderCount] = useState(maxInitialRender);
  const [isExpanded, setIsExpanded] = useState(false);

  const { 
    data: comments, 
    isLoading, 
    error, 
    isFetching 
  } = useQuery<ApiComment[], Error>({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 45 * 1000,
  });

  // Memoized comment tree to prevent expensive recalculations
  const commentTree = useMemo(() => {
    if (!comments || comments.length === 0) {
      return [];
    }
    return buildCommentTree(comments, { maxDepth: 5 });
  }, [comments]);

  // Flatten tree for virtualization
  const flatComments = useMemo(() => {
    return flattenCommentTree(commentTree);
  }, [commentTree]);

  const totalComments = flatComments.length;
  const shouldVirtualize = totalComments > virtualizeThreshold;

  // Load more comments when intersection observer triggers
  const loadMore = useCallback(() => {
    if (renderCount < totalComments) {
      setRenderCount(prev => Math.min(prev + 20, totalComments));
    }
  }, [renderCount, totalComments]);

  // Intersection observer for infinite scrolling
  const loadMoreTrigger = useIntersectionObserver(loadMore, {
    threshold: 0.1,
    rootMargin: '100px',
    enabled: shouldVirtualize && renderCount < totalComments && !isLoading
  });

  // Scroll to highlighted comment
  useEffect(() => {
    if (highlightCommentId && comments && comments.length > 0) {
      const timer = setTimeout(() => {
        const commentElement = document.getElementById(`comment-${highlightCommentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [highlightCommentId, comments]);

  // Expand all comments for better UX
  const handleExpandAll = useCallback(() => {
    setIsExpanded(true);
    setRenderCount(totalComments);
  }, [totalComments]);

  // Memoized render function for better performance
  const renderComments = useMemo(() => {
    const commentsToRender = shouldVirtualize && !isExpanded 
      ? flatComments.slice(0, renderCount)
      : flatComments;

    return commentsToRender.map((tree) => (
      <MemoizedCommentItem
        key={tree.comment.id}
        comment={tree.comment}
        depth={tree.depth}
        onReply={onReply}
        isHighlighted={highlightCommentId === tree.comment.id}
        onHighlightComplete={onCommentHighlighted}
      />
    ));
  }, [
    flatComments, 
    shouldVirtualize, 
    isExpanded, 
    renderCount, 
    highlightCommentId, 
    onCommentHighlighted, 
    onReply
  ]);

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

  if (!comments || comments.length === 0 || flatComments.length === 0) {
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

      {/* Performance info for large threads */}
      {shouldVirtualize && !isExpanded && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              Showing {renderCount} of {totalComments} comments
              {renderCount < totalComments && ' • Scroll down for more'}
            </span>
            <button
              onClick={handleExpandAll}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Show All
            </button>
          </div>
        </div>
      )}

      {/* Rendered comments */}
      <div className="space-y-3">
        {renderComments}
      </div>

      {/* Load more trigger for virtualization */}
      {shouldVirtualize && !isExpanded && renderCount < totalComments && (
        <div ref={loadMoreTrigger} className="flex items-center justify-center py-4">
          <div className="text-sm text-muted-foreground">
            Loading more comments...
          </div>
        </div>
      )}

      {/* Performance indicator */}
      {shouldVirtualize && (
        <div className="text-xs text-muted-foreground text-center py-2">
          {isExpanded 
            ? `All ${totalComments} comments loaded`
            : `Virtualized rendering for performance (${totalComments} total)`
          }
        </div>
      )}
    </div>
  );
};