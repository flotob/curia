import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';

export interface MentionUser {
  id: string;
  name: string;
  profile_picture_url: string | null;
  source: 'friend' | 'user';
  friendship_status?: string;
}

interface UseMentionSearchReturn {
  users: MentionUser[];
  isLoading: boolean;
  error: string | null;
  searchUsers: (query: string) => Promise<void>;
  clearResults: () => void;
}

export const useMentionSearch = (): UseMentionSearchReturn => {
  const { token } = useAuth();
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async (query: string) => {
    if (!token) {
      setError('Authentication required');
      return;
    }

    if (!query.trim() || query.trim().length < 2) {
      setUsers([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetchJson<{ users: MentionUser[]; total: number }>(
        `/api/users/search?q=${encodeURIComponent(query.trim())}&limit=10`,
        { token }
      );
      
      setUsers(response.users || []);
      console.log(`[useMentionSearch] Found ${response.users?.length || 0} users for query: "${query}"`);
    } catch (err) {
      console.error('[useMentionSearch] Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const clearResults = useCallback(() => {
    setUsers([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    users,
    isLoading,
    error,
    searchUsers,
    clearResults,
  };
}; 