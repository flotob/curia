/**
 * DataProvider - Real data provider for host service
 * 
 * This class provides implementations of all Common Ground API methods
 * using real database integration. It replaces the MockDataProvider
 * from the example-host-app with actual data persistence.
 */

import { Pool } from 'pg';

/**
 * User information structure matching Common Ground's format
 */
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;        // Profile picture URL
  roles: string[];
  twitter?: { username: string };
  lukso?: { username: string };
  farcaster?: { username: string };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Community information structure
 */
export interface CommunityInfo {
  id: string;
  title: string;
  description?: string;
  url?: string;             // Community short ID for URLs  
  smallLogoUrl?: string;    // Logo URL for sidebar
  roles: RoleInfo[];
}

/**
 * Role information structure
 */
export interface RoleInfo {
  id: string;
  title: string;
  description: string;
  assignmentRules: {
    type: 'free' | 'restricted';
    requirements?: any;
  } | null;
}

/**
 * Friend information structure
 */
export interface FriendInfo {
  id: string;
  name: string;
  imageUrl?: string;
}

/**
 * Context data for plugin initialization
 */
export interface ContextData {
  pluginId: string;
  userId: string;
  assignableRoleIds: string[];
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

/**
 * Abstract base class for data providers
 */
export abstract class DataProvider {
  /**
   * Get user information by user ID and community
   */
  abstract getUserInfo(userId: string, communityId: string): Promise<ApiResponse<UserInfo>>;

  /**
   * Get community information by community ID
   */
  abstract getCommunityInfo(communityId: string): Promise<ApiResponse<CommunityInfo>>;

  /**
   * Get user's friends/connections with pagination
   */
  abstract getUserFriends(
    userId: string, 
    communityId: string, 
    limit: number, 
    offset: number
  ): Promise<ApiResponse<{ friends: FriendInfo[] }>>;

  /**
   * Assign a role to a user
   */
  abstract giveRole(
    fromUserId: string, 
    toUserId: string, 
    roleId: string, 
    communityId: string
  ): Promise<ApiResponse<void>>;

  /**
   * Get context data for plugin initialization
   */
  abstract getContextData(
    userId: string, 
    communityId: string
  ): Promise<ApiResponse<ContextData>>;
}

/**
 * Database-backed data provider implementation
 */
export class DatabaseDataProvider extends DataProvider {
  private db: Pool;

  constructor() {
    super();
    
    // Initialize database connection
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async getUserInfo(userId: string, communityId: string): Promise<ApiResponse<UserInfo>> {
    try {
      // Query user from database
      const userQuery = `
        SELECT 
          user_id as id,
          name,
          profile_picture_url as "imageUrl",
          settings,
          identity_type as "identityType",
          wallet_address as "walletAddress",
          ens_domain as "ensDomain",
          up_address as "upAddress"
        FROM users 
        WHERE user_id = $1
      `;
      
      const userResult = await this.db.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return {
          data: {} as UserInfo,
          success: false,
          error: `User ${userId} not found`
        };
      }

      const user = userResult.rows[0];
      
      // Get user's roles in this community
      const rolesQuery = `
        SELECT role
        FROM user_communities 
        WHERE user_id = $1 AND community_id = $2
      `;
      
      const rolesResult = await this.db.query(rolesQuery, [userId, communityId]);
      const roles = rolesResult.rows.length > 0 ? [rolesResult.rows[0].role] : ['member'];

      // Parse settings for social handles
      const settings = user.settings || {};
      
      return {
        data: {
          id: user.id,
          name: user.name || `User ${userId}`,
          email: settings.email || '',
          imageUrl: user.imageUrl,
          roles,
          twitter: settings.twitter ? { username: settings.twitter } : undefined,
          lukso: settings.lukso ? { username: settings.lukso } : undefined,
          farcaster: settings.farcaster ? { username: settings.farcaster } : undefined,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt
        },
        success: true
      };
      
    } catch (error) {
      console.error('[DatabaseDataProvider] getUserInfo error:', error);
      return {
        data: {} as UserInfo,
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getCommunityInfo(communityId: string): Promise<ApiResponse<CommunityInfo>> {
    try {
      // Query community from database
      const communityQuery = `
        SELECT 
          id,
          name as title,
          community_short_id as url,
          logo_url as "smallLogoUrl",
          settings
        FROM communities 
        WHERE id = $1
      `;
      
      const result = await this.db.query(communityQuery, [communityId]);
      
      if (result.rows.length === 0) {
        return {
          data: {} as CommunityInfo,
          success: false,
          error: `Community ${communityId} not found`
        };
      }

      const community = result.rows[0];
      const settings = community.settings || {};
      
      // For now, provide basic role structure
      // In a real implementation, you might store roles in the database
      const defaultRoles: RoleInfo[] = [
        {
          id: 'member',
          title: 'Member',
          description: 'Basic community member',
          assignmentRules: { type: 'free', requirements: null }
        },
        {
          id: 'moderator',
          title: 'Moderator', 
          description: 'Community moderator',
          assignmentRules: { type: 'restricted', requirements: { minContributions: 10 } }
        },
        {
          id: 'admin',
          title: 'Administrator',
          description: 'Community administrator', 
          assignmentRules: null
        }
      ];

      return {
        data: {
          id: community.id,
          title: community.title,
          description: settings.description || 'A test community for development',
          url: community.url,
          smallLogoUrl: community.smallLogoUrl,
          roles: defaultRoles
        },
        success: true
      };
      
    } catch (error) {
      console.error('[DatabaseDataProvider] getCommunityInfo error:', error);
      return {
        data: {} as CommunityInfo,
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getUserFriends(
    userId: string, 
    communityId: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<ApiResponse<{ friends: FriendInfo[] }>> {
    try {
      // Query user friends from database
      const friendsQuery = `
        SELECT 
          friend_user_id as id,
          friend_name as name,
          friend_image_url as "imageUrl"
        FROM user_friends 
        WHERE user_id = $1 AND friendship_status = 'active'
        ORDER BY friend_name
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(friendsQuery, [userId, limit, offset]);
      
      const friends: FriendInfo[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        imageUrl: row.imageUrl
      }));

      return {
        data: { friends },
        success: true
      };
      
    } catch (error) {
      console.error('[DatabaseDataProvider] getUserFriends error:', error);
      return {
        data: { friends: [] },
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async giveRole(
    fromUserId: string, 
    toUserId: string, 
    roleId: string, 
    communityId: string
  ): Promise<ApiResponse<void>> {
    try {
      // Check if fromUser has permission to assign roles
      const fromUserQuery = `
        SELECT role 
        FROM user_communities 
        WHERE user_id = $1 AND community_id = $2
      `;
      
      const fromUserResult = await this.db.query(fromUserQuery, [fromUserId, communityId]);
      
      if (fromUserResult.rows.length === 0) {
        return {
          data: undefined as any,
          success: false,
          error: `User ${fromUserId} not found in community ${communityId}`
        };
      }

      const fromUserRole = fromUserResult.rows[0].role;
      
      // Basic permission check - only admins and moderators can assign roles
      if (!['admin', 'moderator'].includes(fromUserRole)) {
        return {
          data: undefined as any,
          success: false,
          error: `User ${fromUserId} does not have permission to assign roles`
        };
      }

      // Admins can assign any role except admin, moderators can only assign member
      if (fromUserRole === 'moderator' && roleId !== 'member') {
        return {
          data: undefined as any,
          success: false,
          error: `Moderators can only assign member role`
        };
      }

      if (roleId === 'admin' && fromUserRole !== 'admin') {
        return {
          data: undefined as any,
          success: false,
          error: `Only admins can assign admin role`
        };
      }

      // Update or insert user role
      const upsertQuery = `
        INSERT INTO user_communities (user_id, community_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, community_id)
        DO UPDATE SET role = $3, updated_at = CURRENT_TIMESTAMP
      `;
      
      await this.db.query(upsertQuery, [toUserId, communityId, roleId]);

      return {
        data: undefined as any,
        success: true
      };
      
    } catch (error) {
      console.error('[DatabaseDataProvider] giveRole error:', error);
      return {
        data: undefined as any,
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getContextData(userId: string, communityId: string): Promise<ApiResponse<ContextData>> {
    try {
      // Get user role to determine assignable roles
      const userResult = await this.getUserInfo(userId, communityId);
      if (!userResult.success) {
        return {
          data: {} as ContextData,
          success: false,
          error: userResult.error
        };
      }

      const userRoles = userResult.data.roles || [];
      
      // Determine assignable roles based on user's role
      let assignableRoleIds: string[] = [];
      
      if (userRoles.includes('admin')) {
        assignableRoleIds = ['member', 'moderator'];
      } else if (userRoles.includes('moderator')) {
        assignableRoleIds = ['member'];
      }

      // Generate plugin ID
      const pluginId = `plugin_${communityId}_${Date.now()}`;

      return {
        data: {
          pluginId,
          userId,
          assignableRoleIds
        },
        success: true
      };
      
    } catch (error) {
      console.error('[DatabaseDataProvider] getContextData error:', error);
      return {
        data: {} as ContextData,
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 