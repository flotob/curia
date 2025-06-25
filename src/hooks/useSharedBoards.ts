import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { useAuth } from '@/contexts/AuthContext';
import { ImportedBoard, ImportableBoardsData, ImportBoardRequest } from '@/types/sharedBoards';
import { ImportBoardResponse } from '@/app/api/communities/[communityId]/import-board/route';

/**
 * Hook for fetching imported boards accessible to the current community
 * These are boards imported BY this community from partner communities
 * Used for displaying imported boards in the sidebar
 */
export function useImportedBoards(communityId?: string) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['imported-boards', communityId],
    queryFn: async (): Promise<ImportedBoard[]> => {
      if (!communityId) {
        throw new Error('Community ID is required to fetch imported boards');
      }
      
      console.log(`[useImportedBoards] Fetching imported boards for community ${communityId}`);
      
      const response = await authFetchJson<ImportedBoard[]>(
        `/api/communities/${communityId}/shared-boards`,
        { token }
      );
      
      console.log(`[useImportedBoards] Fetched ${response.length} imported boards`);
      return response;
    },
    enabled: !!token && !!communityId,
    staleTime: 2 * 60 * 1000, // 2 minutes - imported boards don't change frequently
    refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
    refetchIntervalInBackground: false, // Don't refresh when tab inactive
  });
}

/**
 * Hook for fetching boards available for import from partner communities
 * Shows boards that can be imported based on partnership permissions
 */
export function useImportableBoards(communityId?: string) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['importable-boards', communityId],
    queryFn: async (): Promise<ImportableBoardsData> => {
      if (!communityId) {
        throw new Error('Community ID is required to fetch importable boards');
      }
      
      console.log(`[useImportableBoards] Fetching importable boards for community ${communityId}`);
      
      const response = await authFetchJson<ImportableBoardsData>(
        `/api/communities/${communityId}/importable-boards`,
        { token }
      );
      
      console.log(`[useImportableBoards] Fetched ${response.boards.length} importable boards from ${response.partnerships.length} partnerships`);
      return response;
    },
    enabled: !!token && !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes - importable boards change less frequently
    refetchInterval: 10 * 60 * 1000, // Background refresh every 10 minutes
  });
}

/**
 * Hook for importing a board from a partner community
 */
export function useImportBoard() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, ...data }: ImportBoardRequest & { communityId: string }) => {
      console.log(`[useImportBoard] Importing board ${data.sourceBoardId} from ${data.sourceCommunityId} to ${communityId}`);
      
      const response = await authFetchJson<ImportBoardResponse>(
        `/api/communities/${communityId}/import-board`,
        {
          method: 'POST',
          body: JSON.stringify(data),
          token
        }
      );
      
      console.log(`[useImportBoard] Successfully imported board "${response.board_name}"`);
      return response;
    },
    onSuccess: (data, variables) => {
      console.log(`[useImportBoard] Invalidating queries for community ${variables.communityId}`);
      
      // Invalidate imported boards for the importing community
      queryClient.invalidateQueries({ queryKey: ['imported-boards', variables.communityId] });
      // Invalidate importable boards to update "already imported" status
      queryClient.invalidateQueries({ queryKey: ['importable-boards', variables.communityId] });
    },
  });
}

// Legacy aliases for backward compatibility
export const useSharedBoards = useImportedBoards; 