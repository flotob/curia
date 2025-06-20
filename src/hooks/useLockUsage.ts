import { useQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';

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
  return useQuery({
    queryKey: ['lockUsage', lockId],
    queryFn: async (): Promise<LockUsageData> => {
      console.log(`[useLockUsage] Fetching usage data for lock ${lockId}`);
      
      const response = await authFetchJson<LockUsageResponse>(`/api/locks/${lockId}/usage`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch lock usage');
      }
      
      console.log(`[useLockUsage] Fetched ${response.data.posts.length} posts (of ${response.data.totalPostsUsingLock}) and ${response.data.boards.length} boards`);
      
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds - usage data doesn't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    enabled: !!lockId && lockId > 0,
  });
} 