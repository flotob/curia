/**
 * DataProvider - Real data provider for host service
 * 
 * This class provides implementations of all Common Ground API methods
 * using real database integration. It replaces the MockDataProvider
 * from the example-host-app with actual data persistence.
 */

/**
 * User information structure matching Common Ground's format
 */
export interface UserInfo {
  id: string;
  name: string;
  email: string;
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
  description: string;
  roles: Role[];
  settings?: Record<string, any>;
}

/**
 * Role definition structure
 */
export interface Role {
  id: string;
  title: string;
  description: string;
  assignmentRules: {
    type: 'free' | 'restricted' | null;
    requirements?: any;
  } | null;
}

/**
 * Friend/connection information
 */
export interface FriendInfo {
  id: string;
  name: string;
  imageUrl: string;
}

/**
 * API response wrapper that matches Common Ground's format
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
}

/**
 * Database-backed data provider implementation
 * 
 * TODO: Implement actual database queries using pg
 * For now, this provides mock data but with the structure for real implementation
 */
export class DatabaseDataProvider extends DataProvider {
  private mockUsers = new Map<string, UserInfo>();
  private mockCommunities = new Map<string, CommunityInfo>();

  constructor() {
    super();
    this.initializeMockData();
  }

  /**
   * Initialize with some mock data for development
   */
  private initializeMockData() {
    // Mock user data
    this.mockUsers.set('default_user', {
      id: 'default_user',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      roles: ['member', 'contributor'],
      twitter: { username: 'alice_codes' },
      lukso: { username: 'alice.lukso' },
      farcaster: { username: 'alice-fc' },
    });

    // Mock community data
    this.mockCommunities.set('default_community', {
      id: 'default_community',
      title: 'Default Community',
      description: 'A test community for development',
      roles: [
        {
          id: 'member',
          title: 'Member',
          description: 'Basic community member',
          assignmentRules: {
            type: 'free',
            requirements: null
          }
        },
        {
          id: 'contributor',
          title: 'Contributor',
          description: 'Active community contributor',
          assignmentRules: {
            type: 'free',
            requirements: null
          }
        },
        {
          id: 'moderator',
          title: 'Moderator',
          description: 'Community moderator',
          assignmentRules: {
            type: 'restricted',
            requirements: { minContributions: 10 }
          }
        },
        {
          id: 'admin',
          title: 'Administrator',
          description: 'Community administrator',
          assignmentRules: null
        }
      ]
    });
  }

  async getUserInfo(userId: string, communityId: string): Promise<ApiResponse<UserInfo>> {
    // TODO: Replace with actual database query
    // const user = await this.db.query('SELECT * FROM users WHERE id = $1 AND community_id = $2', [userId, communityId]);
    
    await this.delay(100); // Simulate database delay
    
    const user = this.mockUsers.get(userId);
    if (!user) {
      return {
        data: {} as UserInfo,
        success: false,
        error: `User ${userId} not found in community ${communityId}`
      };
    }

    return {
      data: { ...user },
      success: true
    };
  }

  async getCommunityInfo(communityId: string): Promise<ApiResponse<CommunityInfo>> {
    // TODO: Replace with actual database query
    // const community = await this.db.query('SELECT * FROM communities WHERE id = $1', [communityId]);
    
    await this.delay(150);
    
    const community = this.mockCommunities.get(communityId) || this.mockCommunities.get('default_community');
    if (!community) {
      return {
        data: {} as CommunityInfo,
        success: false,
        error: `Community ${communityId} not found`
      };
    }

    return {
      data: { ...community },
      success: true
    };
  }

  async getUserFriends(
    userId: string, 
    communityId: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<ApiResponse<{ friends: FriendInfo[] }>> {
    // TODO: Replace with actual database query
    // const friends = await this.db.query(
    //   'SELECT * FROM user_friends WHERE user_id = $1 AND community_id = $2 LIMIT $3 OFFSET $4',
    //   [userId, communityId, limit, offset]
    // );
    
    await this.delay(200);
    
    const mockFriends: FriendInfo[] = [
      {
        id: 'user_11111',
        name: 'Bob Smith',
        imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
      },
      {
        id: 'user_22222',
        name: 'Carol Wilson',
        imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol'
      },
      {
        id: 'user_33333',
        name: 'David Chen',
        imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
      }
    ];

    const paginatedFriends = mockFriends.slice(offset, offset + limit);

    return {
      data: {
        friends: paginatedFriends
      },
      success: true
    };
  }

  async giveRole(
    fromUserId: string, 
    toUserId: string, 
    roleId: string, 
    communityId: string
  ): Promise<ApiResponse<void>> {
    // TODO: Replace with actual database operations
    // 1. Verify fromUserId has permission to assign roleId
    // 2. Check if roleId exists and is assignable
    // 3. Assign role to toUserId in community
    
    await this.delay(300);
    
    // Mock validation
    const community = this.mockCommunities.get(communityId) || this.mockCommunities.get('default_community');
    if (!community) {
      return {
        data: undefined as any,
        success: false,
        error: `Community ${communityId} not found`
      };
    }

    const role = community.roles.find(r => r.id === roleId);
    if (!role) {
      return {
        data: undefined as any,
        success: false,
        error: `Role ${roleId} not found`
      };
    }

    if (role.assignmentRules?.type === 'restricted') {
      return {
        data: undefined as any,
        success: false,
        error: `Role ${roleId} requires special permissions to assign`
      };
    }

    if (role.assignmentRules === null) {
      return {
        data: undefined as any,
        success: false,
        error: `Role ${roleId} cannot be assigned through this interface`
      };
    }

    // Mock assignment (in real implementation, update database)
    console.log(`[DataProvider] Assigned role ${roleId} to user ${toUserId} in community ${communityId}`);

    return {
      data: undefined as any,
      success: true
    };
  }

  /**
   * Simulate network delay for realistic API behavior
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 