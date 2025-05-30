'use client';

import React from 'react';
import { PostCard } from './PostCard';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface FeedListProps {
  boardId?: string | null;
}

export const FeedList: React.FC<FeedListProps> = ({ boardId }) => {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const {
    posts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    fetchMore,
    // refresh
  } = useInfiniteScroll({
    token,
    boardId,
    enabled: isAuthenticated
  });

  // Intersection observer for auto-loading more posts
  const loadMoreTrigger = useIntersectionObserver(
    () => {
      if (!isLoadingMore && hasMore) {
        fetchMore();
      }
    },
    { enabled: !isLoading && !error }
  );

  // Auth loading state
  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-8 sm:py-10">
        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
        <p className="ml-3 text-base sm:text-lg">Authenticating...</p>
      </div>
    );
  }
  
  // Not authenticated
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="text-center py-8 sm:py-10 text-muted-foreground px-4">
        <p className="text-sm sm:text-base">Please log in to view posts.</p>
      </div>
    );
  }

  // Initial loading
  if (isLoading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center py-8 sm:py-10">
        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
        <p className="ml-3 text-base sm:text-lg">Loading posts...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-red-500 text-center py-8 sm:py-10 px-4 text-sm sm:text-base">
        Error loading posts: {error.message}
      </div>
    );
  }

  // Empty state
  if (!isLoading && posts.length === 0) {
    return (
      <div className="text-center py-8 sm:py-10 text-muted-foreground px-4 text-sm sm:text-base">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No posts yet. Be the first to start a discussion!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Posts List */}
      <div className="space-y-3 sm:space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} showBoardContext={!boardId} />
        ))}
      </div>

      {/* Load More Section */}
      {hasMore && (
        <div ref={loadMoreTrigger} className="py-6">
          {isLoadingMore ? (
            <div className="flex justify-center items-center">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading more posts...</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                onClick={() => fetchMore()}
                variant="outline"
                size="lg"
                className="min-h-[44px] px-8"
              >
                Load More Posts
              </Button>
            </div>
          )}
        </div>
      )}

      {/* End of Feed */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">You&apos;ve reached the end!</p>
        </div>
      )}
    </div>
  );
}; 