'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowBigUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui button
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { cn } from '@/lib/utils'; // Assuming shadcn/ui utility for classnames
import { ApiPost } from '@/app/api/posts/route'; // Import the ApiPost interface

interface VoteButtonProps {
  postId: number;
  initialUpvoteCount: number;
  initialUserHasUpvoted: boolean;
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean; // External disable prop
}

interface VoteResponse {
    post: ApiPost; // Expect the updated post object back
    message: string;
}

export const VoteButton: React.FC<VoteButtonProps> = ({
  postId,
  initialUpvoteCount,
  initialUserHasUpvoted,
  size = 'default',
  disabled: externalDisabled = false,
}) => {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Local optimistic state
  // We initialize with props but manage updates locally until mutation confirms/reverts
  const [currentUserHasUpvoted, setCurrentUserHasUpvoted] = useState(initialUserHasUpvoted);
  const [currentUpvoteCount, setCurrentUpvoteCount] = useState(initialUpvoteCount);

  // Update local state if initial props change (e.g., due to parent re-fetch)
  React.useEffect(() => {
    setCurrentUserHasUpvoted(initialUserHasUpvoted);
  }, [initialUserHasUpvoted]);

  React.useEffect(() => {
    setCurrentUpvoteCount(initialUpvoteCount);
  }, [initialUpvoteCount]);

  const voteMutation = useMutation<VoteResponse, Error, { isUpvoting: boolean }>({
    mutationFn: async ({ isUpvoting }) => {
      const method = isUpvoting ? 'POST' : 'DELETE';
      return authFetchJson<VoteResponse>(`/api/posts/${postId}/votes`, {
        method,
        token,
      });
    },
    onMutate: async ({ isUpvoting }) => {
      // Optimistic update
      setCurrentUserHasUpvoted(isUpvoting);
      setCurrentUpvoteCount((prevCount) => isUpvoting ? prevCount + 1 : Math.max(0, prevCount - 1));
      
      // Optionally, can update the query cache optimistically too
      // await queryClient.cancelQueries({ queryKey: ['posts'] });
      // const previousPosts = queryClient.getQueryData(['posts']);
      // queryClient.setQueryData(['posts'], oldData => ... update specific post ...);
      // return { previousPosts };
    },
    onSuccess: (data) => {
      // On success, the server returns the updated post. Update our local state from it.
      setCurrentUpvoteCount(data.post.upvote_count);
      setCurrentUserHasUpvoted(data.post.user_has_upvoted);
      
      // Invalidate infinite scroll queries - this will refetch and update the feed
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      // Also do optimistic update for infinite queries to make it feel instant
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: { pages?: { posts: { id: number; upvote_count: number; user_has_upvoted: boolean }[] }[] } | undefined) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: { posts: { id: number; upvote_count: number; user_has_upvoted: boolean }[] }) => ({
            ...page,
            posts: page.posts.map((post: { id: number; upvote_count: number; user_has_upvoted: boolean }) => 
              post.id === postId 
                ? { ...post, upvote_count: data.post.upvote_count, user_has_upvoted: data.post.user_has_upvoted }
                : post
            )
          }))
        };
      });
    },
    onError: (error, variables, /* context */) => {
      console.error('Vote mutation failed:', error);
      // Revert optimistic update
      setCurrentUserHasUpvoted(!variables.isUpvoting); // Revert to previous state
      setCurrentUpvoteCount((prevCount) => variables.isUpvoting ? prevCount -1 : prevCount + 1);
      // if (context?.previousPosts) {
      //   queryClient.setQueryData(['posts'], context.previousPosts);
      // }
      // TODO: Show error toast to user
    },
  });

  const handleVote = () => {
    if (!isAuthenticated || voteMutation.isPending || externalDisabled) {
      // TODO: Prompt login or show message if not authenticated
      return;
    }
    voteMutation.mutate({ isUpvoting: !currentUserHasUpvoted });
  };

  const isDisabled = !isAuthenticated || voteMutation.isPending || externalDisabled;

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleVote}
      disabled={isDisabled}
      className={cn(
        'flex flex-col items-center justify-center h-auto rounded-md',
        size === 'sm' ? 'p-1' : size === 'lg' ? 'p-2.5' : 'p-2',
        currentUserHasUpvoted ? 'text-orange-500 hover:text-orange-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
      aria-pressed={currentUserHasUpvoted}
      aria-label={currentUserHasUpvoted ? "Remove upvote" : "Upvote post"}
    >
      {voteMutation.isPending ? (
        <Loader2 className={cn(
            'animate-spin',
            size === 'sm' && 'h-4 w-4',
            size === 'default' && 'h-5 w-5',
            size === 'lg' && 'h-6 w-6'
        )} />
      ) : (
        <ArrowBigUp 
            className={cn(
                size === 'sm' && 'h-4 w-4',
                size === 'default' && 'h-5 w-5',
                size === 'lg' && 'h-6 w-6'
            )}
            fill={currentUserHasUpvoted ? 'currentColor' : 'none'} 
        />
      )}
      <span 
        className={cn(
            'font-semibold tabular-nums leading-none',
            size === 'sm' && 'text-xs',
            size === 'default' && 'text-sm',
            size === 'lg' && 'text-base'
        )}
      >
        {currentUpvoteCount}
      </span>
    </Button>
  );
}; 