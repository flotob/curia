/**
 * MockDataProvider - Provides sample data for plugin testing
 * 
 * This class provides mock implementations of all Common Ground API methods
 * with realistic sample data that allows plugins to be tested without requiring
 * a real backend. In a production system, this would be replaced with actual
 * API calls to your database and services.
 * 
 * The data structure exactly matches Common Ground's API responses to ensure
 * complete compatibility with existing plugins.
 */

/**
 * Sample user data that mimics a Common Ground user
 */
const MOCK_USER = {
  id: 'user_12345',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  roles: ['member', 'contributor'],
  twitter: { username: 'alice_codes' },
  lukso: { username: 'alice.lukso' },
  farcaster: { username: 'alice-fc' },
};

/**
 * Sample community data with roles and permissions
 */
const MOCK_COMMUNITY = {
  id: 'community_67890',
  title: 'Web3 Developers Community',
  description: 'A thriving community of Web3 developers building the future',
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
      description: 'Community moderator with special permissions',
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
};

/**
 * Sample friends/connections data
 */
const MOCK_FRIENDS = [
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
  },
  {
    id: 'user_44444',
    name: 'Emma Davis',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
  },
  {
    id: 'user_55555',
    name: 'Frank Miller',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank'
  }
];

/**
 * API response wrapper that matches Common Ground's format
 */
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

/**
 * Mock data provider that simulates Common Ground's API
 */
export class MockDataProvider {
  /** In-memory storage for user state changes */
  private userState = {
    ...MOCK_USER,
    roles: [...MOCK_USER.roles] // Make a copy so we can modify it
  };

  /**
   * Get current user information
   * 
   * @returns Promise<ApiResponse<UserInfoResponsePayload>>
   */
  public async getUserInfo(): Promise<ApiResponse<any>> {
    // Simulate API delay
    await this.delay(100);

    return {
      data: { ...this.userState },
      success: true
    };
  }

  /**
   * Get community information including available roles
   * 
   * @returns Promise<ApiResponse<CommunityInfoResponsePayload>>
   */
  public async getCommunityInfo(): Promise<ApiResponse<any>> {
    // Simulate API delay
    await this.delay(150);

    return {
      data: { ...MOCK_COMMUNITY },
      success: true
    };
  }

  /**
   * Get user's friends/connections with pagination
   * 
   * @param limit - Maximum number of friends to return
   * @param offset - Number of friends to skip (for pagination)
   * @returns Promise<ApiResponse<UserFriendsResponsePayload>>
   */
  public async getUserFriends(limit: number = 10, offset: number = 0): Promise<ApiResponse<any>> {
    // Simulate API delay
    await this.delay(200);

    // Apply pagination
    const startIndex = Math.max(0, offset);
    const endIndex = Math.min(MOCK_FRIENDS.length, startIndex + limit);
    const paginatedFriends = MOCK_FRIENDS.slice(startIndex, endIndex);

    return {
      data: {
        friends: paginatedFriends
      },
      success: true
    };
  }

  /**
   * Assign a role to a user
   * 
   * @param roleId - ID of the role to assign
   * @param userId - ID of the user to assign the role to
   * @returns Promise<ApiResponse<void>>
   */
  public async giveRole(roleId: string, userId: string): Promise<ApiResponse<void>> {
    // Simulate API delay
    await this.delay(300);

    // Validate role exists
    const role = MOCK_COMMUNITY.roles.find(r => r.id === roleId);
    if (!role) {
      return {
        data: undefined as any,
        success: false,
        error: `Role ${roleId} not found`
      };
    }

    // Check if role assignment is allowed
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

    // For this demo, we'll assume we're always assigning to the current user
    if (userId === this.userState.id || userId === MOCK_USER.id) {
      // Add role if not already present
      if (!this.userState.roles.includes(roleId)) {
        this.userState.roles.push(roleId);
        console.log(`[MockDataProvider] Assigned role ${roleId} to user ${userId}`);
      } else {
        console.log(`[MockDataProvider] User ${userId} already has role ${roleId}`);
      }
    }

    return {
      data: undefined as any,
      success: true
    };
  }

  /**
   * Remove a role from a user (additional method for demo purposes)
   * 
   * @param roleId - ID of the role to remove
   * @param userId - ID of the user to remove the role from
   * @returns Promise<ApiResponse<void>>
   */
  public async removeRole(roleId: string, userId: string): Promise<ApiResponse<void>> {
    // Simulate API delay
    await this.delay(250);

    // For this demo, we'll assume we're always modifying the current user
    if (userId === this.userState.id || userId === MOCK_USER.id) {
      const roleIndex = this.userState.roles.indexOf(roleId);
      if (roleIndex > -1) {
        this.userState.roles.splice(roleIndex, 1);
        console.log(`[MockDataProvider] Removed role ${roleId} from user ${userId}`);
      }
    }

    return {
      data: undefined as any,
      success: true
    };
  }

  /**
   * Reset user state to original (for testing purposes)
   */
  public resetUserState(): void {
    this.userState = {
      ...MOCK_USER,
      roles: [...MOCK_USER.roles]
    };
    console.log('[MockDataProvider] User state reset to original');
  }

  /**
   * Get current user state (for debugging)
   */
  public getCurrentUserState(): any {
    return { ...this.userState };
  }

  /**
   * Add a custom friend to the friends list (for testing dynamic data)
   * 
   * @param friend - Friend data to add
   */
  public addFriend(friend: { id: string; name: string; imageUrl: string }): void {
    MOCK_FRIENDS.push(friend);
    console.log(`[MockDataProvider] Added friend: ${friend.name}`);
  }

  /**
   * Simulate network delay for realistic API behavior
   * 
   * @param ms - Milliseconds to delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random sample data (for extended testing)
   */
  public generateRandomUser(): any {
    const names = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Sage', 'Quinn'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    
    return {
      id: `user_${Date.now()}`,
      name: `${randomName} ${Math.floor(Math.random() * 1000)}`,
      imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomName}`
    };
  }

  /**
   * Get available roles that can be assigned
   */
  public getAssignableRoles(): any[] {
    return MOCK_COMMUNITY.roles.filter(role => 
      role.assignmentRules?.type === 'free' || role.assignmentRules === null
    );
  }

  /**
   * Validate if a user can be assigned a specific role
   * 
   * @param roleId - Role to check
   * @param userId - User to check
   * @returns Whether the assignment is valid
   */
  public canAssignRole(roleId: string, _userId: string): boolean {
    const role = MOCK_COMMUNITY.roles.find(r => r.id === roleId);
    if (!role) return false;
    
    // Free roles can always be assigned
    if (role.assignmentRules?.type === 'free') return true;
    
    // Null rules mean admin-only assignment
    if (role.assignmentRules === null) return false;
    
    // Restricted roles need special validation
    if (role.assignmentRules?.type === 'restricted') {
      // In a real implementation, you'd check the requirements
      return false;
    }
    
    return false;
  }
} 