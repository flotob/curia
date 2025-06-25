// Frontend types for imported boards functionality

export interface ImportedBoard {
  id: number;
  source_board_id: number;
  source_community_id: string;
  importing_community_id: string;
  imported_by_user_id: string;
  imported_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from boards table
  board_name: string;
  board_description: string | null;
  board_settings: Record<string, unknown>;
  // Joined fields from communities table
  source_community_name: string;
  source_community_logo_url: string | null;
  // Joined fields from users table
  imported_by_user_name: string | null;
  // Computed fields
  user_can_access?: boolean;
  user_can_post?: boolean;
}

export interface ImportableBoard {
  id: number;
  name: string;
  description: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  source_community_id: string;
  source_community_name: string;
  source_community_logo_url: string | null;
  post_count: number;
  last_activity: string;
  is_already_imported: boolean;
  is_role_gated: boolean;
}

export interface PartnershipWithSharing {
  id: number;
  target_community_id: string;
  target_community_name: string;
  target_community_logo_url: string | null;
  status: string;
  allows_board_sharing: boolean;
  board_count: number;
  sharing_enabled: boolean;
}

export interface ImportableBoardsData {
  boards: ImportableBoard[];
  partnerships: PartnershipWithSharing[];
}

export interface ImportBoardRequest {
  sourceBoardId: number;
  sourceCommunityId: string;
}

// Legacy types for backward compatibility
export type SharedBoard = ImportedBoard;
export type ShareableBoard = ImportableBoard;  
export type Partnership = PartnershipWithSharing;
export type ShareableBoardsData = ImportableBoardsData;
export type CreateSharedBoardRequest = ImportBoardRequest; 