import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { useToast } from '@/hooks/use-toast';

export interface Bookmark {
  id: string;
  postId: number;
  userId: string;
  createdAt: string;
  post?: {
    id: number;
    title: string;
    boardId: number;
    boardName?: string;
  };
}

interface UseBookmarksReturn {
  isBookmarked: boolean;
  isLoading: boolean;
  bookmarkCount: number;
  toggleBookmark: () => void;
  bookmarks: Bookmark[];
  removeBookmark: (bookmarkId: string) => void;
}

interface BookmarkResponse {
  bookmarks: Bookmark[];
  total: number;
}

export const useBookmarks = (postId?: number): UseBookmarksReturn => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Fetch user's bookmarks
  const { data: bookmarkData, isLoading } = useQuery<BookmarkResponse>({
    queryKey: ['bookmarks', user?.userId],
    queryFn: async () => {
      if (!token || !user?.userId) throw new Error('No auth token or user ID');
      return authFetchJson<BookmarkResponse>(`/api/users/${user.userId}/bookmarks`, { token });
    },
    enabled: !!token && !!user?.userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if current post is bookmarked
  useEffect(() => {
    if (bookmarkData && postId) {
      const bookmark = bookmarkData.bookmarks.find(b => b.postId === postId);
      setIsBookmarked(!!bookmark);
    }
  }, [bookmarkData, postId]);

  // Toggle bookmark mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: async () => {
              if (!token || !user?.userId || !postId) {
          throw new Error('Missing required data for bookmark operation');
        }

        const currentBookmark = bookmarkData?.bookmarks.find(b => b.postId === postId);
        
        if (currentBookmark) {
          // Remove bookmark
          await authFetchJson(`/api/users/${user.userId}/bookmarks/${currentBookmark.id}`, {
            method: 'DELETE',
            token,
          });
          return { action: 'removed', bookmark: currentBookmark };
        } else {
          // Add bookmark
          const newBookmark = await authFetchJson<Bookmark>(`/api/users/${user.userId}/bookmarks`, {
            method: 'POST',
            token,
            body: JSON.stringify({ postId }),
          });
          return { action: 'added', bookmark: newBookmark };
        }
    },
    onMutate: async () => {
      // Optimistic update
      setIsBookmarked(prev => !prev);
    },
    onSuccess: (result) => {
      // Invalidate bookmarks query to refetch
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
      
      // Show success toast
      toast({
        title: result.action === 'added' ? 'Bookmarked!' : 'Bookmark Removed',
        description: result.action === 'added' 
          ? 'Post saved to your bookmarks' 
          : 'Post removed from bookmarks',
        duration: 2000,
      });
    },
    onError: (error) => {
      // Revert optimistic update
      setIsBookmarked(prev => !prev);
      
      // Show error toast
      toast({
        title: 'Bookmark Error',
        description: error instanceof Error ? error.message : 'Failed to update bookmark',
        variant: 'destructive',
      });
    },
  });

  // Remove specific bookmark
  const removeBookmarkMutation = useMutation({
    mutationFn: async (bookmarkId: string) => {
              if (!token || !user?.userId) {
          throw new Error('Missing required data for bookmark removal');
        }
        
        await authFetchJson(`/api/users/${user.userId}/bookmarks/${bookmarkId}`, {
          method: 'DELETE',
          token,
        });
      return bookmarkId;
    },
    onSuccess: (removedBookmarkId) => {
      // Invalidate bookmarks query
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
      
      // Update current post bookmark status if it was the removed bookmark
      if (postId) {
        const removedBookmark = bookmarkData?.bookmarks.find(b => b.id === removedBookmarkId);
        if (removedBookmark && removedBookmark.postId === postId) {
          setIsBookmarked(false);
        }
      }
      
      toast({
        title: 'Bookmark Removed',
        description: 'Post removed from bookmarks',
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove bookmark',
        variant: 'destructive',
      });
    },
  });

  const toggleBookmark = useCallback(() => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to bookmark posts',
        variant: 'destructive',
      });
      return;
    }
    
    if (!postId) {
      toast({
        title: 'Error',
        description: 'Unable to bookmark: post not found',
        variant: 'destructive',
      });
      return;
    }

    toggleBookmarkMutation.mutate();
  }, [user, postId, toggleBookmarkMutation, toast]);

  const removeBookmark = useCallback((bookmarkId: string) => {
    removeBookmarkMutation.mutate(bookmarkId);
  }, [removeBookmarkMutation]);

  return {
    isBookmarked,
    isLoading: isLoading || toggleBookmarkMutation.isPending,
    bookmarkCount: bookmarkData?.total || 0,
    toggleBookmark,
    bookmarks: bookmarkData?.bookmarks || [],
    removeBookmark,
  };
};