'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch'; // Assuming this can be used for GET too
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route'; // Import type
import { useCgLib } from '@/contexts/CgLibContext'; // For communityInfo
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib'; // Correct import

// DetailedCommunityInfo interface is no longer needed as we use the lib's type

interface MainLayoutWithSidebarProps {
  children: React.ReactNode;
}

export const MainLayoutWithSidebar: React.FC<MainLayoutWithSidebarProps> = ({ children }) => {
  const { user, isAuthenticated, token } = useAuth();
  const { cgInstance, isInitializing: isCgLibInitializing, initError: cgLibError } = useCgLib();

  const { data: communityInfo, isLoading: isLoadingCommunityInfo, error: communityInfoError } = useQuery<CommunityInfoResponsePayload | null>({
    queryKey: ['communityInfo', cgInstance?.getCommunityInfo !== undefined], // Query key depends on cgInstance being available
    queryFn: async () => {
      if (!cgInstance) throw new Error('CgInstance not available');
      const response = await cgInstance.getCommunityInfo();
      if (!response?.data) throw new Error('Failed to fetch community info data from CgLib.');
      return response.data; // This is already CommunityInfoResponsePayload
    },
    enabled: !!cgInstance && !isCgLibInitializing, // Only run if cgInstance is ready
    // staleTime: 10 * 60 * 1000, // Optional: 10 minutes
  });

  const communityIdForBoards = communityInfo?.id || user?.cid;

  const { data: boardsList, isLoading: isLoadingBoards, error: boardsError } = useQuery<ApiBoard[]>({
    queryKey: ['boards', communityIdForBoards],
    queryFn: async () => {
      if (!communityIdForBoards || !token) throw new Error('Community context or token not available for fetching boards');
      return authFetchJson<ApiBoard[]>(`/api/communities/${communityIdForBoards}/boards`, { token });
    },
    enabled: !!isAuthenticated && !!token && !!communityIdForBoards && !!communityInfo, // Depends on communityInfo and auth
  });

  const showSidebar = isAuthenticated && communityInfo && boardsList && !isLoadingCommunityInfo && !isLoadingBoards && !cgLibError && !communityInfoError && !boardsError;

  if (isCgLibInitializing || (isAuthenticated && (isLoadingCommunityInfo || (communityIdForBoards && isLoadingBoards && communityInfo) ))) {
    return <div className="flex min-h-screen items-center justify-center"><p>Loading application data...</p></div>;
  }

  if (cgLibError || communityInfoError || boardsError) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col">
        <p className="text-red-500">Error loading application data:</p>
        {cgLibError && <p className="text-sm">CgLib Error: {cgLibError.message}</p>}
        {communityInfoError && <p className="text-sm">CommunityInfo Error: {(communityInfoError as Error).message}</p>}
        {boardsError && <p className="text-sm">Boards Error: {(boardsError as Error).message}</p>}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {showSidebar && communityInfo && boardsList && (
        <Sidebar communityInfo={communityInfo} boardsList={boardsList} />
      )}
      <main className={`flex-grow p-4 md:p-6 ${!showSidebar ? 'w-full' : ''}`}>
        {/* If sidebar is not shown, main can take full width if needed, 
            or rely on flex-grow. Explicit w-full if sidebar is hidden can be useful. */}
        {children}
      </main>
    </div>
  );
}; 