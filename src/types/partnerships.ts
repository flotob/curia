// Community partnerships type definitions

export interface CommunityPartnership {
  id: number;
  sourceCommunityId: string;
  targetCommunityId: string;
  status: PartnershipStatus;
  relationshipType: PartnershipType;
  sourceToTargetPermissions: PartnershipPermissions;
  targetToSourcePermissions: PartnershipPermissions;
  invitedByUserId: string;
  invitedAt: string;
  respondedByUserId?: string;
  respondedAt?: string;
  partnershipStartedAt?: string;
  partnershipEndedAt?: string;
  inviteMessage?: string;
  responseMessage?: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  sourceCommunityName?: string;
  targetCommunityName?: string;
  invitedByUserName?: string;
  respondedByUserName?: string;
  canRespond?: boolean;
  canCancel?: boolean;
  canSuspend?: boolean;
  canResume?: boolean;
}

export type PartnershipStatus = 
  | 'pending' 
  | 'accepted' 
  | 'rejected' 
  | 'cancelled' 
  | 'expired' 
  | 'suspended';

export type PartnershipType = 'partner' | 'ecosystem';

export interface PartnershipPermissions {
  allowCrossCommunityNavigation?: boolean;
  allowCrossCommunityNotifications?: boolean;
  allowCrossCommunitySearch?: boolean;
  allowPresenceSharing?: boolean;
  customSettings?: Record<string, unknown>;
}

// API Request/Response types
export interface CreatePartnershipRequest {
  targetCommunityId: string;
  relationshipType: PartnershipType;
  sourceToTargetPermissions: PartnershipPermissions;
  targetToSourcePermissions: PartnershipPermissions;
  inviteMessage?: string;
}

export interface UpdatePartnershipRequest {
  status?: PartnershipStatus;
  sourceToTargetPermissions?: PartnershipPermissions;
  targetToSourcePermissions?: PartnershipPermissions;
  responseMessage?: string;
}

export interface PartnershipListResponse {
  success: boolean;
  data: CommunityPartnership[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface PartnershipResponse {
  success: boolean;
  data: CommunityPartnership;
}

// Database row interface
export interface PartnershipRow {
  id: number;
  source_community_id: string;
  target_community_id: string;
  status: PartnershipStatus;
  relationship_type: PartnershipType;
  source_to_target_permissions: Record<string, unknown>;
  target_to_source_permissions: Record<string, unknown>;
  invited_by_user_id: string;
  invited_at: string;
  responded_by_user_id?: string;
  responded_at?: string;
  partnership_started_at?: string;
  partnership_ended_at?: string;
  invite_message?: string;
  response_message?: string;
  created_at: string;
  updated_at: string;
  // From joins
  source_community_name?: string;
  target_community_name?: string;
  invited_by_user_name?: string;
  responded_by_user_name?: string;
} 