'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode'; // Utility to decode JWTs on the client-side
import { AuthService } from '@/services/AuthService';
import { useCgLib } from '@/contexts/CgLibContext';

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

  const performLoginLogic = useCallback(async (loginData: UserDataFromCgLib, isRefresh: boolean = false) => {
    console.log(`[AuthContext] ${isRefresh ? 'REFRESHING TOKEN' : 'LOGIN ATTEMPT'}. User roles from input:`, loginData.roles, 'Community roles from input:', loginData.communityRoles);
    setIsLoading(true);

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
          pluginId?: string           // 🆕
        }>(newToken);
        console.log('[AuthContext] New token received. Decoded JWT:', decoded);
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
  }, []);

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