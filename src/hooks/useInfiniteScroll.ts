import { useInfiniteQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';

interface UseInfiniteScrollOptions {
  token: string | null;
  boardId?: string | null;
  enabled?: boolean;
}

interface PostsResponse {
  posts: ApiPost[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

async function fetchPostsWithCursor(
  cursor: string | null, 
  boardId: string | null, 
  token: string
): Promise<PostsResponse> {
  const params = new URLSearchParams({
    limit: '20', // Larger page size for infinite scroll
  });
  
  if (cursor) params.append('cursor', cursor);
  if (boardId) params.append('boardId', boardId);
  
  return authFetchJson<PostsResponse>(`/api/posts?${params.toString()}`, { token });
}

export function useInfiniteScroll({ token, boardId, enabled = true }: UseInfiniteScrollOptions) {
  const query = useInfiniteQuery({
    queryKey: ['posts', boardId],
    queryFn: ({ pageParam }: { pageParam: string | null | undefined }) => {
      const cursor = (pageParam ?? null) as string | null;
      return fetchPostsWithCursor(cursor, boardId ?? null, token!);
    },
    getNextPageParam: (lastPage: PostsResponse) => lastPage.pagination.nextCursor,
    initialPageParam: null as string | null,
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 90 * 1000, // 90 seconds
  });

  // Flatten pages into single posts array
  const posts = query.data?.pages.flatMap((page: PostsResponse) => page.posts) ?? [];

  return {
    posts,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    error: query.error,
    hasMore: query.hasNextPage ?? false,
    fetchMore: query.fetchNextPage,
    refresh: query.refetch,
  };
} 