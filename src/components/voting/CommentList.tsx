'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { CommentItem } from './CommentItem';
import { authFetchJson } from '@/utils/authFetch'; // Using authFetchJson for consistency, though endpoint is public
import { Loader2, MessageCircleWarning, MessagesSquare } from 'lucide-react';

interface CommentListProps {
  postId: number;
}

const fetchComments = async (postId: number): Promise<ApiComment[]> => {
  return authFetchJson<ApiComment[]>(`/api/posts/${postId}/comments`);
};

export const CommentList: React.FC<CommentListProps> = ({ postId }) => {
  const { 
    data: comments, 
    isLoading, 
    error, 
    isFetching 
} = useQuery<ApiComment[], Error>({
    queryKey: ['comments', postId], // Query key specific to this post's comments
    queryFn: () => fetchComments(postId),
    // staleTime: 1000 * 60 * 2, // e.g., comments are stale after 2 minutes
  });

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

  if (!comments || comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
        <MessagesSquare className="h-8 w-8 mb-2" />
        <p>No comments yet.</p>
        <p className="text-xs">Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 divide-y divide-border">
      {isFetching && (
         <div className="absolute top-0 right-0 p-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin inline-block" /> Syncing...
        </div>
      )}
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}; 