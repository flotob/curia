import { useAuthenticatedQueryWithUnwrap } from './useAuthenticatedQuery';

export interface PostUsageData {
  id: number;
  title: string;
  board_id: number;
  board_name: string;
  author_name: string | null;
  created_at: string;
  upvote_count: number;
  comment_count: number;
}

export interface BoardUsageData {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface LockUsageData {
  posts: PostUsageData[];
  boards: BoardUsageData[];
  totalPostsUsingLock: number;
  totalBoardsUsingLock: number;
}

interface LockUsageResponse {
  success: boolean;
  data: LockUsageData;
  error?: string;
}

export function useLockUsage(lockId: number) {
  return useAuthenticatedQueryWithUnwrap<LockUsageData>(
    ['lockUsage', lockId],
    `/api/locks/${lockId}/usage`,
    {
      freshness: 'static', // Lock usage doesn't change frequently
      updateFrequency: 'none', // No background refetch needed
      enabled: !!lockId && lockId > 0,
      errorMessage: 'Failed to fetch lock usage',
    }
  );
} 