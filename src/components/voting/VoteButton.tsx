'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowBigUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui button
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { cn } from '@/lib/utils'; // Assuming shadcn/ui utility for classnames
import { ApiPost } from '@/app/api/posts/route'; // Import the ApiPost interface
import { toast } from 'sonner'; // Add Sonner toast import

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

// Enhanced error interface to handle API error responses (for future use)
// interface VoteError {
//   error: string;
//   requiresVerification?: boolean;
//   verificationDetails?: {
//     lockIds: number[];
//     fulfillmentMode: 'any' | 'all';
//     verifiedCount: number;
//     requiredCount: number;
//   };
// }

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
      // Optimistic update - only update local component state to avoid cache contamination
      setCurrentUserHasUpvoted(isUpvoting);
      setCurrentUpvoteCount((prevCount) => isUpvoting ? prevCount + 1 : Math.max(0, prevCount - 1));
    },
    onSuccess: (data, variables) => {
      // On success, the server returns the updated post. Update our local state from it.
      setCurrentUpvoteCount(data.post.upvote_count);
      setCurrentUserHasUpvoted(data.post.user_has_upvoted);
      
      // Show success toast with action-specific message
      const action = variables.isUpvoting ? 'upvoted' : 'removed vote from';
      const emoji = variables.isUpvoting ? '👍' : '↩️';
      
      toast.success(`${emoji} Successfully ${action} post`, {
        description: `Post now has ${data.post.upvote_count} vote${data.post.upvote_count !== 1 ? 's' : ''}`,
        duration: 3000,
      });
      
      // Invalidate infinite scroll queries - this will refetch and update the feed
      // We removed setQueriesData to avoid cache contamination with user-specific vote states
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error, variables) => {
      console.error('Vote mutation failed:', error);
      
      // Revert optimistic update to local component state
      setCurrentUserHasUpvoted(!variables.isUpvoting); // Revert to previous state
      setCurrentUpvoteCount((prevCount) => variables.isUpvoting ? prevCount - 1 : prevCount + 1);
      
      // Parse error response for specific error handling
      let errorMessage = 'Failed to update vote';
      let errorDescription = 'Please try again';
      
      try {
        // Try to parse structured error response
        const errorText = error.message;
        
        if (errorText.includes('requires verification')) {
          errorMessage = '🔒 Verification Required';
          errorDescription = 'Complete board verification requirements to vote on this post';
        } else if (errorText.includes('Authentication required') || errorText.includes('Token')) {
          errorMessage = '🔑 Authentication Required';
          errorDescription = 'Please sign in to vote on posts';
        } else if (errorText.includes('permission')) {
          errorMessage = '⛔ Access Denied';
          errorDescription = 'You don\'t have permission to vote on this board';
        } else if (errorText.includes('Post not found')) {
          errorMessage = '❓ Post Not Found';
          errorDescription = 'This post may have been deleted or moved';
        } else if (errorText.includes('Network') || errorText.includes('fetch')) {
          errorMessage = '🌐 Connection Error';
          errorDescription = 'Check your internet connection and try again';
        } else {
          // Generic server error
          errorMessage = '⚠️ Server Error';
          errorDescription = 'Something went wrong. Please try again later';
        }
      } catch (parseError) {
        console.warn('Could not parse vote error response:', parseError);
        // Use generic error message
      }
      
      // Show error toast with specific messaging
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000, // Longer duration for errors so users can read them
      });
    },
  });

  const handleVote = () => {
    if (!isAuthenticated) {
      // Show authentication prompt
      toast.error('🔑 Sign In Required', {
        description: 'You need to be signed in to vote on posts',
        duration: 4000,
      });
      return;
    }
    
    if (voteMutation.isPending || externalDisabled) {
      return;
    }
    
    voteMutation.mutate({ isUpvoting: !currentUserHasUpvoted });
  };

  const isDisabled = voteMutation.isPending || externalDisabled;

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