'use client';
import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';

interface MeApiResponse {
  userId: string;
  name?: string | null;
  picture?: string | null;
  isAdmin?: boolean;
}

const publicKey = process.env.NEXT_PUBLIC_PUBKEY as string;
if (!publicKey) {
  throw new Error("Public key is not set in the .env file, please set it and try again.");
}

const MyInfo = () => {
  const [cgUserInfo, setCgUserInfo] = useState<UserInfoResponsePayload | null>(null);
  const [communityInfo, setCommunityInfo] = useState<CommunityInfoResponsePayload | null>(null);
  const [friends, setFriends] = useState<UserFriendsResponsePayload | null>(null);
  const [cgLibInstance, setCgLibInstance] = useState<CgPluginLib | null>(null);
  const [initialCgDataLoaded, setInitialCgDataLoaded] = useState(false);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null); // null = loading, boolean = determined

  const searchParams = useSearchParams();
  const iframeUid = searchParams.get('iframeUid');

  const { 
    token: pluginToken, 
    login: pluginLogin, 
    isLoading: isAuthContextLoading, 
    isAuthenticated: isPluginAuthenticated
  } = useAuth();
  
  const [meData, setMeData] = useState<MeApiResponse | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [localAuthLoginError, setLocalAuthLoginError] = useState<string | null>(null);

  // Effect 1: Initialize CgPluginLib 
  useEffect(() => {
    if (!iframeUid) {
      console.warn('iframeUid missing, CgPluginLib will not initialize.');
      setCgLibInstance(null);
      setInitialCgDataLoaded(false);
      setCgUserInfo(null);
      return;
    }

    let didUnmount = false;
    console.log('[MyInfo] Initializing CgPluginLib with iframeUid:', iframeUid);
    CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
      .then(instance => {
        if (!didUnmount) {
          console.log('[MyInfo] CgPluginLib initialized successfully.');
          setCgLibInstance(instance);
        }
      })
      .catch(err => {
        if (!didUnmount) {
          console.error("[MyInfo] Error initializing CgPluginLib:", err);
          // Handle init error, maybe set an error state for the UI
        }
      });
    
    return () => {
        didUnmount = true;
        // Optional: CgPluginLib.dispose() if available and needed on component unmount or iframeUid change
    };
  }, [iframeUid]); // publicKey is static from env, not needed as dep if used directly from module scope

  // Effect 2: Fetch initial CG data once CgPluginLib instance is available
  useEffect(() => {
    if (!cgLibInstance) return;

    let didUnmount = false;
    console.log('[MyInfo] CgPluginLib instance available, fetching initial CG data...');
    setInitialCgDataLoaded(false); // Reset before fetching
    setIsCurrentUserAdmin(null); // Reset admin status while loading new data

    const fetchInitialData = async () => {
      try {
        // Fetch user and community info concurrently for admin check
        const [userInfoResponse, communityInfoResponse] = await Promise.all([
          cgLibInstance.getUserInfo(),
          cgLibInstance.getCommunityInfo(),
        ]);
        
        if (didUnmount) return;

        console.log('[MyInfo] Fetched CG UserInfo:', userInfoResponse.data);
        setCgUserInfo(userInfoResponse.data);
        console.log('[MyInfo] Fetched CG CommunityInfo:', communityInfoResponse.data);
        setCommunityInfo(communityInfoResponse.data);

        // Determine admin status once both are fetched
        if (userInfoResponse.data && communityInfoResponse.data) {
          const adminRoleTitlesEnv = process.env.NEXT_PUBLIC_ADMIN_ROLE_IDS || 'Admin';
          const requiredAdminTitlesLower = adminRoleTitlesEnv.split(',').map(t => t.trim().toLowerCase()).filter(t => !!t);
          
          const roleIdToTitleLowerMap = new Map<string, string>();
          communityInfoResponse.data.roles.forEach(role => {
            roleIdToTitleLowerMap.set(role.id, role.title.toLowerCase());
          });

          const isAdminCheck = userInfoResponse.data.roles.some(userRoleId => {
            const userRoleTitleLower = roleIdToTitleLowerMap.get(userRoleId);
            return userRoleTitleLower ? requiredAdminTitlesLower.includes(userRoleTitleLower) : false;
          });
          console.log(`[MyInfo] Admin check: User has roles [${userInfoResponse.data.roles.join(', ')}], required admin titles [${requiredAdminTitlesLower.join(', ')}], is admin: ${isAdminCheck}`);
          setIsCurrentUserAdmin(isAdminCheck);
        }

        // Fetch friends (less critical for initial admin check)
        cgLibInstance.getUserFriends(10, 0).then(friendsResponse => {
          if (!didUnmount) setFriends(friendsResponse.data);
        });

        setInitialCgDataLoaded(true);
      } catch (error) {
        if (!didUnmount) {
          console.error("[MyInfo] Error fetching initial CG data:", error);
          // Handle fetch error
        }
      }
    };

    fetchInitialData();
    return () => { didUnmount = true; };
  }, [cgLibInstance]);

  // Effect 3: Attempt Plugin Login once initial CG data is loaded, admin status determined, and not already authenticated
  useEffect(() => {
    if (initialCgDataLoaded && cgUserInfo && communityInfo && isCurrentUserAdmin !== null && !pluginToken && !isAuthContextLoading && !isPluginAuthenticated) {
      console.log(`[MyInfo] Attempting plugin JWT login for user: ${cgUserInfo.id}, Admin status: ${isCurrentUserAdmin}, Community: ${communityInfo.id}`);
      setLocalAuthLoginError(null); 
      pluginLogin({
        userId: cgUserInfo.id,
        name: cgUserInfo.name,
        profilePictureUrl: cgUserInfo.imageUrl || null,
        isAdmin: isCurrentUserAdmin,
        iframeUid: iframeUid,
        communityId: communityInfo.id,
      }).catch(err => {
        console.error("[MyInfo] Plugin login call failed:", err);
        setLocalAuthLoginError(err.message || 'Plugin login attempt failed');
      });
    }
  }, [initialCgDataLoaded, cgUserInfo, communityInfo, isCurrentUserAdmin, pluginToken, isAuthContextLoading, isPluginAuthenticated, pluginLogin, iframeUid]);

  // Effect 4: Fetch /api/me when plugin token is available
  useEffect(() => {
    if (pluginToken) {
      const fetchMeData = async () => {
        setMeError(null);
        try {
          console.log('[MyInfo] Fetching /api/me with plugin token:', pluginToken);
          const data = await authFetchJson<MeApiResponse>('/api/me', { token: pluginToken });
          setMeData(data);
          console.log('[MyInfo] /api/me response:', data);
        } catch (error: any) {
          console.error('[MyInfo] Failed to fetch /api/me:', error);
          setMeError(error.message || 'Failed to load user data from plugin API');
        }
      };
      fetchMeData();
    }
  }, [pluginToken]);

  const assignableRoles = useMemo(() => {
    return communityInfo?.roles?.filter((role: any) => role.assignmentRules?.type === 'free' || role.assignmentRules === null) || [];
  }, [communityInfo]);

  return (
    <div className='flex flex-col gap-6'>
      <h2 className="text-xl font-semibold">CG User Info:</h2>
      {cgUserInfo ? (
        <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
          <p>Name: {cgUserInfo.name}</p>
          <p>ID: {cgUserInfo.id}</p>
          <p>Determined Admin Status: {isCurrentUserAdmin === null ? 'Checking...' : isCurrentUserAdmin ? 'Yes' : 'No'}</p>
          {!!(cgUserInfo as any)?.twitter && <p>Twitter: {(cgUserInfo as any)?.twitter?.username || 'Not connected'}</p>}
          {!!(cgUserInfo as any)?.lukso && <p>Lukso: {(cgUserInfo as any)?.lukso?.username || 'Not connected'}</p>}
          {!!(cgUserInfo as any)?.farcaster && <p>Farcaster: {(cgUserInfo as any)?.farcaster?.username || 'Not connected'}</p>}
          {!!(cgUserInfo as any)?.email && <p>Email: {(cgUserInfo as any)?.email || 'Not connected'}</p>}
          <p>Community: {communityInfo?.title}</p>
        </div>
      ) : (
        <p>{!iframeUid ? 'iframeUid missing.' : cgLibInstance ? 'Loading CG User Info...' : 'Initializing CgPluginLib...'}</p>
      )}

      <h2 className="text-xl font-semibold">Plugin Auth Status:</h2>
      {isAuthContextLoading && <p>Plugin Auth Loading...</p>}
      {localAuthLoginError && <p className="text-red-500">Plugin Login Error: {localAuthLoginError}</p>}
      {isPluginAuthenticated && cgUserInfo && <p className="text-green-500">Successfully logged into plugin! Token: {pluginToken ? pluginToken.substring(0, 30) + '...' : 'N/A'}</p>}
      {!isPluginAuthenticated && initialCgDataLoaded && cgUserInfo && !isAuthContextLoading && <p>Ready to attempt plugin login.</p>}
      
      <h2 className="text-xl font-semibold">Plugin API (/api/me) Response:</h2>
      {meError && <p className="text-red-500">Error fetching /api/me: {meError}</p>}
      {meData ? (
        <div className='flex flex-col gap-2 p-2 border border-blue-300 rounded-md'>
          <p>User ID (from plugin JWT): {meData.userId}</p>
          <p>Name (from plugin JWT): {meData.name || 'N/A'}</p>
          <p>Is Admin (from plugin JWT): {meData.isAdmin !== undefined ? meData.isAdmin.toString() : 'N/A'}</p>
        </div>
      ) : (
        <p>{pluginToken ? 'Fetching plugin user data from /api/me...' : 'Waiting for plugin auth to call /api/me...'}</p>
      )}

      {friends && friends.friends.length > 0 && (
        <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
          <p className='font-bold'>Some of your friends:</p>
          {friends.friends.map((friend) => (
            <div key={friend.id} className='flex items-center gap-2'>
              <Image src={friend.imageUrl} alt={friend.name} width={40} height={40} className='rounded-full' />
              <span>{friend.name}</span>
            </div>
          ))}
        </div>
      )}

      {assignableRoles && assignableRoles.length > 0 && (
        <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
          <p className='font-bold'>Assignable roles</p>
          {assignableRoles?.map((role: any) => (
            <div className='grid grid-cols-2 items-center gap-2' key={role.id}>
              <p>{role.title}</p>
              {cgUserInfo?.roles?.includes(role.id) ? (
                <span>Has Role</span>
              ) : (
                <button 
                  className='bg-blue-500 text-white px-2 py-1 rounded-md' 
                  onClick={async () => {
                    if (cgLibInstance && cgUserInfo?.id) {
                      await cgLibInstance.giveRole(role.id, cgUserInfo.id);
                      // Re-fetch user info to update roles and potentially re-trigger plugin login
                      const userInfoResponse = await cgLibInstance.getUserInfo();
                      setCgUserInfo(userInfoResponse.data);
                      // This might re-trigger plugin login if roles changed admin status etc.
                      // but the pluginLogin effect condition !pluginToken should prevent re-login if already logged in.
                    }
                  }}
                >
                  Give role
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyInfo;