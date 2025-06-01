"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canUserAccessBoard = canUserAccessBoard;
exports.filterAccessibleBoards = filterAccessibleBoards;
exports.getAccessibleBoardIds = getAccessibleBoardIds;
/**
 * Determines if a user can access a specific board based on their roles and admin status
 * @param userRoles - Array of role IDs that the user has
 * @param boardSettings - Board settings object containing permissions
 * @param isAdmin - Whether the user has admin privileges
 * @returns boolean indicating if user can access the board
 */
function canUserAccessBoard(userRoles, boardSettings, isAdmin = false) {
    // Admins can access everything
    if (isAdmin) {
        return true;
    }
    // Type guard to check if settings has the expected structure
    const permissions = boardSettings && typeof boardSettings === 'object' && 'permissions' in boardSettings
        ? boardSettings.permissions
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
function filterAccessibleBoards(boards, userRoles, isAdmin = false) {
    return boards.filter(board => canUserAccessBoard(userRoles, board.settings, isAdmin));
}
/**
 * Gets accessible board IDs for use in SQL queries
 * @param boards - Array of board objects with id and settings
 * @param userRoles - Array of role IDs that the user has
 * @param isAdmin - Whether the user has admin privileges
 * @returns Array of board IDs that the user can access
 */
function getAccessibleBoardIds(boards, userRoles, isAdmin = false) {
    return boards
        .filter(board => canUserAccessBoard(userRoles, board.settings, isAdmin))
        .map(board => board.id);
}
