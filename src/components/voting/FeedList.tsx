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

export const FeedList: React.FC = () => {
  const { token, isAuthenticated } = useAuth(); // Get token for authenticated requests
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10; // Or make this configurable

  const fetchPosts = async (page: number) => {
    const response = await authFetchJson<FetchPostsResponse>(
      `/api/posts?page=${page}&limit=${postsPerPage}`,
      { token: isAuthenticated ? token : null } // Send token only if authenticated
    );
    return response;
  };

  const { data, isLoading, error, isFetching, isPlaceholderData } = useQuery<FetchPostsResponse, Error>({ 
    queryKey: ['posts', currentPage, isAuthenticated], // Include currentPage and auth status in queryKey
    queryFn: () => fetchPosts(currentPage),
    placeholderData: (previousData, previousQuery) => previousData, // Keep previous data while new page loads
    // staleTime: 1000 * 60 * 1, // 1 minute, example
  });

  if (isLoading && !data) { // Initial load
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-10">Error loading posts: {error.message}</div>;
  }

  if (!data || data.posts.length === 0) {
    return <div className="text-center py-10 text-muted-foreground">No posts yet. Be the first to submit one!</div>;
  }

  const { posts, pagination } = data;

  return (
    <div className="space-y-6">
      {isFetching && (
        <div className="fixed top-4 right-4 z-50 bg-background p-2 rounded-md shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
            disabled={currentPage === 1 || isFetching}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button 
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))} 
            disabled={currentPage === pagination.totalPages || isFetching || isPlaceholderData}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}; 