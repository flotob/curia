'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCgLib } from '@/contexts/CgLibContext';

export function AppInitializer() {
  const auth = useAuth();
  const { cgInstance, iframeUid, isInitializing: isCgLibInitializing, initError: cgLibError } = useCgLib();

  useEffect(() => {
    // Prevent re-running if already authenticated or a login attempt is in progress
    if (auth.isAuthenticated || auth.isLoading) {
      return;
    }

    if (isCgLibInitializing) {
      console.log('[AppInitializer] CgLib is still initializing. Waiting...');
      return;
    }

    if (cgLibError) {
      console.error('[AppInitializer] CgLib initialization error:', cgLibError);
      // Optionally, you could set a global error state or display a message
      return;
    }

    if (cgInstance && iframeUid) {
      console.log('[AppInitializer] CgInstance and iframeUid available. Attempting to fetch user data and login.');
      
      const fetchDataAndLogin = async () => {
        try {
          const userInfoResponse = await cgInstance.getUserInfo();
          const communityInfoResponse = await cgInstance.getCommunityInfo();

          if (!userInfoResponse?.data) {
            console.error('[AppInitializer] Failed to get user info data from CgLib.', userInfoResponse);
            // Handle missing userInfo: maybe show error, or try login with partial data if backend supports
            return; 
          }
          if (!communityInfoResponse?.data) {
            console.error('[AppInitializer] Failed to get community info data from CgLib.', communityInfoResponse);
            // Handle missing communityInfo
            return;
          }
          
          const userInfo = userInfoResponse.data;
          const communityInfo = communityInfoResponse.data;

          // isAdmin is now determined by the backend based on roles and communityRoles
          // const isAdmin = userInfo.roles?.includes('admin') || false; 
          // console.log(`[AppInitializer] Determined isAdmin: ${isAdmin} from roles:`, userInfo.roles);

          const loginPayload = {
            userId: userInfo.id,
            name: userInfo.name,
            profilePictureUrl: userInfo.imageUrl,
            // isAdmin: isAdmin, // No longer sending isAdmin from client
            roles: userInfo.roles, // Pass user's role IDs
            communityRoles: communityInfo.roles, // Pass all community role definitions
            iframeUid: iframeUid,
            communityId: communityInfo.id,
          };

          console.log('[AppInitializer] Data fetched successfully. Calling auth.login() with payload:', loginPayload);
          await auth.login(loginPayload);
          console.log('[AppInitializer] auth.login() call completed.');

        } catch (error) {
          console.error('[AppInitializer] Error during CgLib data fetching or application login process:', error);
          // Optionally, set an error state in AuthContext or a global error context
        }
      };

      fetchDataAndLogin();
    } else {
      // This case should ideally be covered by isCgLibInitializing or cgLibError checks
      console.log('[AppInitializer] Waiting for CgInstance or iframeUid to become available.');
    }
  // Ensure dependencies are correct to prevent excessive re-runs.
  // auth.isAuthenticated and auth.isLoading prevent re-runs if login is done/in-progress.
  // cgInstance, iframeUid, isCgLibInitializing, cgLibError cover CgLib states.
  // auth.login is stable due to useCallback in AuthContext (if it were there, but here it's passed so assumed stable from context value).
  }, [auth, cgInstance, iframeUid, isCgLibInitializing, cgLibError]);

  return null; // This component does not render any UI itself
} 