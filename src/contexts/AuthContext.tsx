'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode'; // Utility to decode JWTs on the client-side
import { AuthService } from '@/services/AuthService';
import { useCgLib } from '@/contexts/CgLibContext';

// Interface for CG lib instance with friends method
interface CgInstanceWithFriends {
  getUserFriends(limit: number, offset: number): Promise<{
    data?: {
      friends?: Array<{
        id: string;
        name: string;
        imageUrl?: string;
      }>;
    };
  }>;
}

// Define the shape of the user object derived from the JWT
interface AuthUser {
  userId: string; // from jwt 'sub'
  name?: string | null;
  picture?: string | null;
  isAdmin?: boolean;
  cid?: string | null; // Added communityId
  roles?: string[]; // Add user roles from JWT
  communityShortId?: string | null; // 🆕 Short ID for URL construction
  pluginId?: string | null;         // 🆕 Plugin ID from context
  previousVisit?: string | null;    // 🆕 ISO timestamp of user's last visit
  stats?: {
    postCount: number;
    commentCount: number;
    isNewUser: boolean;
  };
}

// Define the structure for a community role, mirroring cg-data.md
interface CommunityRoleInfo {
  id: string;
  title: string;
  type?: string; // Or other relevant fields from your cg-data.md Community Info roles
  permissions?: string[];
  // Add other fields if necessary for other logic, but id and title are key for admin check
}

// Define the shape of the AuthContext
interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean; // Will now primarily reflect in-flight login(), not initial load from storage
  isAuthenticated: boolean;
  login: (userDataFromCgLib: UserDataFromCgLib) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

// Type for data expected from CgLib, used in login and stored for refresh
interface UserDataFromCgLib {
  userId: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  roles?: string[]; 
  communityRoles?: CommunityRoleInfo[]; 
  communityName?: string | null;
  iframeUid?: string | null; 
  communityId?: string | null;
  communityShortId?: string | null;  // 🆕 Short ID for URL construction
  pluginId?: string | null;          // 🆕 Plugin ID from context
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const { cgInstance, isInitializing: isCgLibInitializing, iframeUid: cgIframeUid } = useCgLib();
  const lastCgUserData = useRef<UserDataFromCgLib | null>(null);

  // Fetch user stats from enhanced /api/me endpoint
  const fetchUserStats = useCallback(async (authToken: string) => {
    try {
      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.stats;
      }
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user stats:', error);
    }
    
    // Fallback stats
    return {
      postCount: 0,
      commentCount: 0,
      isNewUser: true
    };
  }, []);

  const performLoginLogic = useCallback(async (loginData: UserDataFromCgLib, isRefresh: boolean = false) => {
    console.log(`[AuthContext] ${isRefresh ? 'REFRESHING TOKEN' : 'LOGIN ATTEMPT'}. User roles from input:`, loginData.roles, 'Community roles from input:', loginData.communityRoles);
    setIsLoading(true);

    // 🆕 Fetch friends from CG lib for automatic sync
    let friends: Array<{ id: string; name: string; image?: string }> = [];
    if (cgInstance && !isRefresh && !isCgLibInitializing && cgIframeUid) { // All prerequisites met
      try {
        // Check if getUserFriends method exists
        if (typeof (cgInstance as unknown as CgInstanceWithFriends).getUserFriends === 'function') {
          console.log('[AuthContext] Fetching friends from CG lib for session sync...');
          const friendsResponse = await (cgInstance as unknown as CgInstanceWithFriends).getUserFriends(100, 0); // Fetch up to 100 friends
          
          // Access the correct nested structure: response.data.friends
          const friendsData = friendsResponse?.data?.friends || [];
          
          if (Array.isArray(friendsData)) {
            friends = friendsData.map((friend: { id: string; name: string; imageUrl?: string }) => ({
              id: friend.id,
              name: friend.name,
              image: friend.imageUrl // Map imageUrl to image
            })).filter((friend) => friend.id && friend.name); // Filter out invalid entries
            
            console.log(`[AuthContext] Fetched ${friends.length} friends from CG lib`);
          } else {
            console.warn('[AuthContext] Friends response data is not an array:', friendsData);
          }
        } else {
          console.log('[AuthContext] getUserFriends method not available on cgInstance');
        }
      } catch (friendsError) {
        console.warn('[AuthContext] Failed to fetch friends from CG lib (non-critical):', friendsError);
        // Continue with empty friends array - this shouldn't block login
      }
    } else {
      const reasons = [];
      if (!cgInstance) reasons.push('cgInstance not available');
      if (isRefresh) reasons.push('token refresh (skipping friends sync)');
      if (isCgLibInitializing) reasons.push('CG lib still initializing');
      if (!cgIframeUid) reasons.push('iframeUid not available');
      
      console.log(`[AuthContext] Skipping friends sync: ${reasons.join(', ')}`);
    }

    const payloadForBackend = {
        userId: loginData.userId,
        name: loginData.name,
        profilePictureUrl: loginData.profilePictureUrl,
        roles: loginData.roles, 
        communityRoles: loginData.communityRoles,
        iframeUid: loginData.iframeUid,       
        communityId: loginData.communityId,
        communityName: loginData.communityName,
        communityShortId: loginData.communityShortId,  // 🆕 Short ID for URLs
        pluginId: loginData.pluginId,                  // 🆕 Plugin ID from context
        friends: friends.length > 0 ? friends : undefined, // 🆕 Include friends if available
    };

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadForBackend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthContext] Fetch session token failed:', errorData);
        throw new Error(errorData.error || 'Failed to fetch session token');
      }

      const { token: newToken } = await response.json();
      if (newToken) {
        const decoded = jwtDecode<AuthUser & { 
          sub: string, 
          adm?: boolean, 
          exp?: number, 
          uid?: string, 
          cid?: string, 
          roles?: string[],
          communityShortId?: string,  // 🆕
          pluginId?: string,          // 🆕
          previousVisit?: string | null // 🆕
        }>(newToken);
        console.log('[AuthContext] New token received. Decoded JWT:', decoded);
        
        // Fetch user stats after successful login
        const userStats = await fetchUserStats(newToken);
        
        setToken(newToken);
        setUser({
            userId: decoded.sub,
            name: decoded.name,
            picture: decoded.picture,
            isAdmin: decoded.adm || decoded.sub === process.env.NEXT_PUBLIC_SUPERADMIN_ID,
            cid: decoded.cid, 
            roles: decoded.roles,
            communityShortId: decoded.communityShortId,  // 🆕
            pluginId: decoded.pluginId,                  // 🆕
            previousVisit: decoded.previousVisit,        // 🆕
            stats: userStats,
        });
        lastCgUserData.current = loginData; // Store successful login data for potential refresh fallback
        return true; // Indicate success
      } else {
        throw new Error('No token received from session endpoint');
      }
    } catch (error) {
      console.error(`${isRefresh ? 'Token refresh' : 'Login'} failed overall:`, error);
      if (!isRefresh) {
        setToken(null);
        setUser(null);
      }
      throw error; 
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserStats, cgInstance, isCgLibInitializing, cgIframeUid]);

  const login = useCallback(async (userDataFromCgLib: UserDataFromCgLib) => {
    await performLoginLogic(userDataFromCgLib, false);
  }, [performLoginLogic]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    lastCgUserData.current = null; 
    setIsLoading(false); 
    console.log('[AuthContext] Logged out, token and user cleared.');
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    console.log('[AuthContext] Attempting to refresh token.');
    if (isCgLibInitializing) {
      console.warn('[AuthContext] CgLib still initializing, refresh deferred.');
      return false;
    }

    let freshCgData: UserDataFromCgLib | null = null;
    const currentIframeUid = cgIframeUid || lastCgUserData.current?.iframeUid;

    if (cgInstance && currentIframeUid) {
      try {
        const [userInfoResponse, communityInfoResponse] = await Promise.all([
          cgInstance.getUserInfo(),
          cgInstance.getCommunityInfo(),
        ]);

        if (userInfoResponse?.data?.id && communityInfoResponse?.data?.id) {
          // Extract plugin context data for pluginId
          const contextData = cgInstance.getContextData();
          const pluginId = contextData?.pluginId;
          
          freshCgData = {
            userId: userInfoResponse.data.id,
            name: userInfoResponse.data.name,
            profilePictureUrl: userInfoResponse.data.imageUrl,
            roles: userInfoResponse.data.roles,
            communityRoles: communityInfoResponse.data.roles, 
            communityName: communityInfoResponse.data.title,
            iframeUid: currentIframeUid,
            communityId: communityInfoResponse.data.id,
            communityShortId: communityInfoResponse.data.url,  // 🆕 Short ID for URLs
            pluginId: pluginId,                                // 🆕 Plugin ID from context
          };
          
          console.log('[AuthContext] Extracted data for refresh:', {
            communityShortId: communityInfoResponse.data.url,
            pluginId: pluginId,
            contextData: contextData
          });
        } else {
          console.warn('[AuthContext] Failed to get complete fresh data from CgLib for refresh.', {userInfoResponse, communityInfoResponse});
        }
      } catch (error) {
        console.error('[AuthContext] Error fetching fresh data from CgLib for refresh:', error);
      }
    }

    const dataForRefresh = freshCgData || lastCgUserData.current;

    if (!dataForRefresh) {
      console.error('[AuthContext] No user data available for token refresh. Logging out.');
      logout();
      return false;
    }

    try {
      if (!dataForRefresh.iframeUid) {
        dataForRefresh.iframeUid = currentIframeUid;
      }
      if (!dataForRefresh.iframeUid) {
         console.error('[AuthContext] iframeUid missing, cannot refresh token. Logging out.');
         logout();
         return false;
      }

      await performLoginLogic(dataForRefresh, true);
      return true;
    } catch (_error: unknown) {
      console.error('[AuthContext] Token refresh failed after attempting with available data. Logging out. Details:', _error);
      logout(); 
      return false;
    }
  }, [cgInstance, isCgLibInitializing, performLoginLogic, logout, cgIframeUid]);

  useEffect(() => {
    AuthService.initialize(
      () => token,
      refreshToken,
      logout
    );
    console.log('[AuthContext] AuthService initialized.');
  }, [token, refreshToken, logout]);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ token, user, isLoading, isAuthenticated, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 