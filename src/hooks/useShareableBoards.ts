// DEPRECATED: This file is deprecated with the move to the import model
// In the new import model, boards are automatically available for import based on partnership permissions
// Use useImportableBoards from useSharedBoards.ts instead

/**
 * @deprecated Use useImportableBoards from useSharedBoards.ts instead
 * Hook for fetching boards that can be shared and available partnerships
 * Used by admins in the board sharing interface
 */
export function useShareableBoards(): { data: { boards: never[]; partnerships: never[] }; isLoading: false; error: null } {
  // DEPRECATED: Return empty data to prevent breaking existing code
  return { data: { boards: [], partnerships: [] }, isLoading: false, error: null };
}

/**
 * @deprecated Use useImportBoard from useSharedBoards.ts instead
 * Mutation hook for sharing a board with a partner community
 */
export function useShareBoard(): { mutate: () => void; mutateAsync: () => Promise<void>; isLoading: false; error: null } {
  // DEPRECATED: Return mock mutation to prevent breaking existing code
  return { mutate: () => {}, mutateAsync: () => Promise.resolve(), isLoading: false, error: null };
}

/**
 * @deprecated Unsharing is not needed in the import model
 * Mutation hook for unsharing a board
 */
export function useUnshareBoard(): { mutate: () => void; mutateAsync: () => Promise<void>; isLoading: false; error: null } {
  // DEPRECATED: Return mock mutation to prevent breaking existing code
  return { mutate: () => {}, mutateAsync: () => Promise.resolve(), isLoading: false, error: null };
} 