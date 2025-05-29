'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { useCgLib } from '@/contexts/CgLibContext';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { CommunityAccessGate } from '@/components/access/CommunityAccessGate';

interface MainLayoutWithSidebarProps {
  children: React.ReactNode;
}

export const MainLayoutWithSidebar: React.FC<MainLayoutWithSidebarProps> = ({ children }) => {
  const { user, isAuthenticated, token } = useAuth();
  const { cgInstance, isInitializing: isCgLibInitializing, initError: cgLibError } = useCgLib();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const searchParams = useSearchParams();

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false); // Close mobile sidebar when screen becomes large
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Get theme from URL params
  useEffect(() => {
    const cgTheme = searchParams?.get('cg_theme') || 'light';
    setTheme(cgTheme as 'light' | 'dark');
  }, [searchParams]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isMobile && sidebarOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-sidebar]') && !target.closest('[data-sidebar-trigger]')) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMobile, sidebarOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen]);

  const { data: communityInfo, isLoading: isLoadingCommunityInfo, error: communityInfoError } = useQuery<CommunityInfoResponsePayload | null>({
    queryKey: ['communityInfo', cgInstance?.getCommunityInfo !== undefined],
    queryFn: async () => {
      if (!cgInstance) throw new Error('CgInstance not available');
      const response = await cgInstance.getCommunityInfo();
      if (!response?.data) throw new Error('Failed to fetch community info data from CgLib.');
      return response.data;
    },
    enabled: !!cgInstance && !isCgLibInitializing,
  });

  const communityIdForBoards = communityInfo?.id || user?.cid;

  const { data: boardsList, isLoading: isLoadingBoards, error: boardsError } = useQuery<ApiBoard[]>({
    queryKey: ['boards', communityIdForBoards],
    queryFn: async () => {
      if (!communityIdForBoards || !token) throw new Error('Community context or token not available for fetching boards');
      return authFetchJson<ApiBoard[]>(`/api/communities/${communityIdForBoards}/boards`, { token });
    },
    enabled: !!isAuthenticated && !!token && !!communityIdForBoards && !!communityInfo,
  });

  const showSidebar = isAuthenticated && communityInfo && boardsList && !isLoadingCommunityInfo && !isLoadingBoards && !cgLibError && !communityInfoError && !boardsError;

  if (isCgLibInitializing || (isAuthenticated && (isLoadingCommunityInfo || (communityIdForBoards && isLoadingBoards && communityInfo)))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading application data...</p>
        </div>
      </div>
    );
  }

  if (cgLibError || communityInfoError || boardsError) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col p-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-red-500 font-semibold">Error loading application data</p>
          {cgLibError && <p className="text-sm text-slate-600">CgLib Error: {cgLibError.message}</p>}
          {communityInfoError && <p className="text-sm text-slate-600">CommunityInfo Error: {(communityInfoError as Error).message}</p>}
          {boardsError && <p className="text-sm text-slate-600">Boards Error: {(boardsError as Error).message}</p>}
        </div>
      </div>
    );
  }

  // If not authenticated, just show children without access control
  if (!isAuthenticated) {
    return <div className="min-h-screen">{children}</div>;
  }

  // For authenticated users, wrap with access control
  return (
    <CommunityAccessGate theme={theme}>
      <div className="flex min-h-screen relative">
        {/* Mobile backdrop overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        {showSidebar && communityInfo && boardsList && (
          <div data-sidebar>
            <Sidebar 
              communityInfo={communityInfo} 
              boardsList={boardsList}
              isOpen={sidebarOpen}
              isMobile={isMobile}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main content area */}
        <main className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          showSidebar && !isMobile ? "lg:ml-0" : "ml-0"
        )}>
          {/* Mobile header with menu button */}
          {showSidebar && isMobile && (
            <header className={cn(
              "lg:hidden border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl",
              theme === 'dark' 
                ? 'bg-gradient-to-r from-slate-900/95 via-slate-900 to-slate-800/95 border-slate-700/40' 
                : 'bg-gradient-to-r from-white/95 via-white to-slate-50/95 border-slate-200/60'
            )}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                data-sidebar-trigger
                className="lg:hidden"
              >
                <Menu size={20} />
              </Button>
              <div className="flex items-center space-x-2">
                {communityInfo?.smallLogoUrl && (
                  <div className="relative">
                    <div className="w-6 h-6 rounded overflow-hidden shadow-sm">
                      <img 
                        src={communityInfo.smallLogoUrl} 
                        alt={communityInfo.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <span className={cn(
                  "font-semibold truncate bg-gradient-to-r bg-clip-text text-transparent",
                  theme === 'dark' 
                    ? 'from-slate-100 to-slate-300' 
                    : 'from-slate-900 to-slate-700'
                )}>
                  {communityInfo?.title}
                </span>
              </div>
              <div className="w-8" /> {/* Spacer for centering */}
            </header>
          )}

          {/* Page content */}
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </CommunityAccessGate>
  );
}; 