'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label"; // For consistency if needed, though not strictly used here
import { Loader2 } from 'lucide-react';

interface NewCommentFormProps {
  postId: number;
  parentCommentId?: number | null;
  onCommentPosted?: (newComment: ApiComment) => void; // Optional callback
}

interface CreateCommentPayload {
  content: string;
  parent_comment_id?: number | null;
}

export const NewCommentForm: React.FC<NewCommentFormProps> = ({
  postId,
  parentCommentId = null,
  onCommentPosted,
}) => {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addCommentMutation = useMutation<ApiComment, Error, CreateCommentPayload>({
    mutationFn: async (commentData) => {
      if (!token) throw new Error('Authentication required to comment.');
      return authFetchJson<ApiComment>(`/api/posts/${postId}/comments`, {
        method: 'POST',
        token,
        body: commentData as any, // authFetchJson handles object stringification
      });
    },
    onSuccess: (newComment) => {
      setContent('');
      setError(null);
      // Invalidate the comments query for this post to refresh the list
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      // Also invalidate the main posts query if comment_count is displayed there
      queryClient.invalidateQueries({ queryKey: ['posts'] }); 
      if (onCommentPosted) {
        onCommentPosted(newComment);
      }
      // TODO: Add success toast
    },
    onError: (err) => {
      setError(err.message || 'Failed to post comment.');
      // TODO: Add error toast
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Comment cannot be empty.');
      return;
    }
    if (!isAuthenticated) {
        setError('You must be logged in to comment.');
        // TODO: Prompt login if not authenticated
        return;
    }
    setError(null);
    addCommentMutation.mutate({ content, parent_comment_id: parentCommentId });
  };

  if (!isAuthenticated) {
    return (
      <div className="mt-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-800">
        <p className="text-sm text-muted-foreground">
          Please log in to post a comment.
          {/* TODO: Implement a proper login prompt/modal flow or redirect. */}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div>
        <Label htmlFor={`comment-content-${postId}-${parentCommentId || 'new'}`} className="sr-only">Your comment</Label>
        <Textarea
          id={`comment-content-${postId}-${parentCommentId || 'new'}`}
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          disabled={addCommentMutation.isPending}
          className="w-full"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={addCommentMutation.isPending || !content.trim()}>
          {addCommentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Post Comment
        </Button>
      </div>
    </form>
  );
}; 