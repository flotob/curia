import { BoardSettings } from '../types/settings';
import { query } from './db';

/**
 * Determines if a user can access a specific board based on their roles and admin status
 * @param userRoles - Array of role IDs that the user has
 * @param boardSettings - Board settings object containing permissions
 * @param isAdmin - Whether the user has admin privileges
 * @returns boolean indicating if user can access the board
 */
export function canUserAccessBoard(
  userRoles: string[] | undefined, 
  boardSettings: BoardSettings | Record<string, unknown>, 
  isAdmin: boolean = false
): boolean {
  // Admins can access everything
  if (isAdmin) {
    return true;
  }
  
  // Type guard to check if settings has the expected structure
  const permissions = boardSettings && typeof boardSettings === 'object' && 'permissions' in boardSettings
    ? (boardSettings as BoardSettings).permissions
    : undefined;
  
  // If no permission restrictions exist, board is public to all community members
  if (!permissions?.allowedRoles || 
      !Array.isArray(permissions.allowedRoles) ||
      permissions.allowedRoles.length === 0) {
    return true;
  }
  
  // If user has no roles, they can't access gated boards
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  
  // Check if user has any of the required roles for this board
  const allowedRoles = permissions.allowedRoles;
  return userRoles.some(userRole => allowedRoles.includes(userRole));
}

/**
 * Filters an array of boards to only include those the user can access
 * @param boards - Array of board objects with settings
 * @param userRoles - Array of role IDs that the user has
 * @param isAdmin - Whether the user has admin privileges
 * @returns Filtered array of accessible boards
 */
export function filterAccessibleBoards<T extends { settings: BoardSettings | Record<string, unknown> }>(
  boards: T[], 
  userRoles: string[] | undefined, 
  isAdmin: boolean = false
): T[] {
  return boards.filter(board => 
    canUserAccessBoard(userRoles, board.settings, isAdmin)
  );
}

/**
 * Gets accessible board IDs for use in SQL queries
 * @param boards - Array of board objects with id and settings
 * @param userRoles - Array of role IDs that the user has  
 * @param isAdmin - Whether the user has admin privileges
 * @returns Array of board IDs that the user can access
 */
export function getAccessibleBoardIds(
  boards: Array<{ id: number; settings: BoardSettings | Record<string, unknown> }>, 
  userRoles: string[] | undefined, 
  isAdmin: boolean = false
): number[] {
  return boards
    .filter(board => canUserAccessBoard(userRoles, board.settings, isAdmin))
    .map(board => board.id);
}

// ===== SHARED BOARDS ACCESSIBILITY FUNCTIONS =====

/**
 * Checks if a user can access a specific board (including imported boards)
 * @param boardId - The board ID to check
 * @param userCommunityId - The user's community ID
 * @returns Promise<boolean> indicating if user can access this board
 */
export async function isAccessibleBoard(boardId: number, userCommunityId: string): Promise<boolean> {
  try {
    // Check if board is owned by user's community OR imported by user's community
    const result = await query(`
      SELECT 1 FROM boards b 
      WHERE b.id = $1 AND (
        b.community_id = $2 
        OR EXISTS (
          SELECT 1 FROM imported_boards ib 
          WHERE ib.source_board_id = $1 
            AND ib.importing_community_id = $2 
            AND ib.is_active = true
        )
      )
      LIMIT 1
    `, [boardId, userCommunityId]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error(`[boardPermissions] Error checking board accessibility for board ${boardId}:`, error);
    return false;
  }
}

/**
 * Gets all boards accessible to a user (owned + imported)
 * @param userCommunityId - The user's community ID
 * @returns Promise<Array> of board objects with accessibility info
 */
export async function getAccessibleBoards(userCommunityId: string): Promise<Array<{
  id: number;
  name: string;
  description: string | null;
  settings: BoardSettings | Record<string, unknown>;
  community_id: string;
  created_at: string;
  updated_at: string;
  is_imported: boolean;
  source_community_id?: string;
  source_community_name?: string;
}>> {
  try {
    const result = await query(`
      -- Get owned boards
      SELECT 
        b.id, b.name, b.description, b.settings, b.community_id, 
        b.created_at, b.updated_at,
        false as is_imported,
        null as source_community_id,
        null as source_community_name
      FROM boards b 
      WHERE b.community_id = $1
      
      UNION ALL
      
      -- Get imported boards
      SELECT 
        b.id, b.name, b.description, b.settings, b.community_id,
        b.created_at, b.updated_at,
        true as is_imported,
        ib.source_community_id,
        sc.name as source_community_name
      FROM boards b
      JOIN imported_boards ib ON b.id = ib.source_board_id
      JOIN communities sc ON ib.source_community_id = sc.id
      WHERE ib.importing_community_id = $1 AND ib.is_active = true
      
      ORDER BY name ASC
    `, [userCommunityId]);
    
    return result.rows.map(row => ({
      ...row,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings
    }));
  } catch (error) {
    console.error(`[boardPermissions] Error fetching accessible boards for community ${userCommunityId}:`, error);
    return [];
  }
}

/**
 * Safely resolves a board by ID, checking accessibility (owned or imported)
 * @param boardId - The board ID to resolve
 * @param userCommunityId - The user's community ID
 * @returns Promise<object | null> Board data if accessible, null if not found/accessible
 */
export async function resolveBoard(boardId: number, userCommunityId: string): Promise<{
  id: number;
  name: string;
  description: string | null;
  settings: BoardSettings | Record<string, unknown>;
  community_id: string;
  created_at: string;
  updated_at: string;
  is_imported: boolean;
  source_community_id?: string;
  source_community_name?: string;
} | null> {
  try {
    const result = await query(`
      SELECT 
        b.id, b.name, b.description, b.settings, b.community_id,
        b.created_at, b.updated_at,
        CASE WHEN ib.id IS NOT NULL THEN true ELSE false END as is_imported,
        ib.source_community_id,
        sc.name as source_community_name
      FROM boards b
      LEFT JOIN imported_boards ib ON (
        b.id = ib.source_board_id 
        AND ib.importing_community_id = $2 
        AND ib.is_active = true
      )
      LEFT JOIN communities sc ON ib.source_community_id = sc.id
      WHERE b.id = $1 AND (
        b.community_id = $2 
        OR ib.id IS NOT NULL
      )
    `, [boardId, userCommunityId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const board = result.rows[0];
    return {
      ...board,
      settings: typeof board.settings === 'string' ? JSON.parse(board.settings) : board.settings
    };
  } catch (error) {
    console.error(`[boardPermissions] Error resolving board ${boardId} for community ${userCommunityId}:`, error);
    return null;
  }
} 