import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedQuery, useAuthenticatedMutation } from './useAuthenticatedQuery';
import { authFetchJson } from '@/utils/authFetch';
import { ImportedBoard, ImportableBoardsData, ImportBoardRequest } from '@/types/sharedBoards';
import { ImportBoardResponse } from '@/app/api/communities/[communityId]/import-board/route';

/**
 * Hook for fetching imported boards accessible to the current community
 * These are boards imported BY this community from partner communities
 * Used for displaying imported boards in the sidebar
 */
export function useImportedBoards(communityId?: string) {
  return useAuthenticatedQuery<ImportedBoard[]>(
    ['imported-boards', communityId],
    `/api/communities/${communityId}/shared-boards`,
    {
      freshness: 'dynamic', // 1 min stale time
      updateFrequency: 'slow', // Background refresh every 5 minutes
      backgroundRefetch: false, // Don't refresh when tab inactive
      enabled: !!communityId,
      errorMessage: 'Failed to fetch imported boards',
    }
  );
}

/**
 * Hook for fetching boards available for import from partner communities
 * Shows boards that can be imported based on partnership permissions
 */
export function useImportableBoards(communityId?: string) {
  return useAuthenticatedQuery<ImportableBoardsData>(
    ['importable-boards', communityId],
    `/api/communities/${communityId}/importable-boards`,
    {
      freshness: 'static', // 5 min stale time - importable boards change less frequently
      updateFrequency: 'slow', // Background refresh every 5 minutes (reduced from 10 min for consistency)
      enabled: !!communityId,
      errorMessage: 'Failed to fetch importable boards',
    }
  );
}

/**
 * Hook for importing a board from a partner community
 */
export function useImportBoard() {
  const queryClient = useQueryClient();

  return useAuthenticatedMutation<ImportBoardResponse, ImportBoardRequest & { communityId: string }>({
    mutationFn: async ({ communityId, ...data }) => {
      console.log(`[useImportBoard] Importing board ${data.sourceBoardId} from ${data.sourceCommunityId} to ${communityId}`);
      
      const response = await authFetchJson<ImportBoardResponse>(
        `/api/communities/${communityId}/import-board`,
        {
          method: 'POST',
          body: JSON.stringify(data),
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
    errorMessage: 'Failed to import board',
  });
}

// Legacy aliases for backward compatibility
export const useSharedBoards = useImportedBoards; 