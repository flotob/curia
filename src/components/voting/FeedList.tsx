'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PostCard } from './PostCard';
import { ApiPost } from '@/app/api/posts/route'; // Assuming ApiPost is exported
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FetchPostsResponse {
  posts: ApiPost[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    limit: number;
  };
}

interface FeedListProps {
  boardId?: string | null; // New prop for board filtering
}

export const FeedList: React.FC<FeedListProps> = ({ boardId }) => {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth(); // Get isAuthenticated and isLoading
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10; // Or make this configurable

  const fetchPosts = async (page: number) => {
    // Token will only be non-null if isAuthenticated is true, but double check for safety
    if (!token) throw new Error('Attempted to fetch posts without a token.'); 
    
    // Build query string with optional boardId
    const params = new URLSearchParams({
      page: page.toString(),
      limit: postsPerPage.toString(),
    });
    
    if (boardId) {
      params.append('boardId', boardId);
    }
    
    const response = await authFetchJson<FetchPostsResponse>(
      `/api/posts?${params.toString()}`,
      { token }
    );
    return response;
  };

  const { data, isLoading, error, isFetching, isPlaceholderData } = useQuery<FetchPostsResponse, Error>({ 
    queryKey: ['posts', currentPage, boardId], // Include boardId in query key
    queryFn: () => fetchPosts(currentPage),
    enabled: isAuthenticated, // Only fetch if authenticated
    placeholderData: (previousData) => previousData, 
  });

  // Handle case where auth is still loading initially
  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-8 sm:py-10">
        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
        <p className="ml-3 text-base sm:text-lg">Authenticating...</p>
      </div>
    );
  }
  
  // Handle case where user is not authenticated after auth loading is complete
  if (!isAuthenticated && !isAuthLoading) {
    return (
        <div className="text-center py-8 sm:py-10 text-muted-foreground px-4">
            <p className="text-sm sm:text-base">Please log in to view posts.</p>
            {/* Optionally, a more prominent login prompt could be here */}
        </div>
    );
  }

  if (isLoading && !data) { // Initial load for posts query, after authentication
    return (
      <div className="flex justify-center items-center py-8 sm:py-10">
        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
        <p className="ml-3 text-base sm:text-lg">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8 sm:py-10 px-4 text-sm sm:text-base">Error loading posts: {error.message}</div>;
  }

  if (!data || data.posts.length === 0) {
    return <div className="text-center py-8 sm:py-10 text-muted-foreground px-4 text-sm sm:text-base">No posts yet. Be the first to submit one!</div>;
  }

  const { posts, pagination } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      {isFetching && (
        <div className="fixed top-4 right-4 z-50 bg-background p-2 rounded-md shadow-lg">
          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
        </div>
      )}
      <div className="space-y-3 sm:space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} showBoardContext={!boardId} />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-6 sm:mt-8 px-4">
          <Button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
            disabled={currentPage === 1 || isFetching}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            Previous
          </Button>
          <span className="text-xs sm:text-sm text-muted-foreground px-2">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button 
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))} 
            disabled={currentPage === pagination.totalPages || isFetching || isPlaceholderData}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}; 