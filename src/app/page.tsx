'use client'; // Marking as client component as FeedList uses client-side hooks

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FeedList } from '@/components/voting/FeedList';
import { SearchFirstPostInput } from '@/components/voting/SearchFirstPostInput';
import { TagFilterComponent } from '@/components/filtering/TagFilterComponent';
import { ModalContainer } from '@/components/modals/ModalContainer';
import { TelegramSetupBanner } from '@/components/banners/TelegramSetupBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useCgLib } from '@/contexts/CgLibContext';
import { useSocket } from '@/contexts/SocketContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { authFetchJson } from '@/utils/authFetch';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';
import { Button } from '@/components/ui/button';
import { BoardAccessStatus } from '@/components/boards/BoardAccessStatus';
import { BoardVerificationModal } from '@/components/boards/BoardVerificationModal';
import { BoardVerificationApiResponse } from '@/types/boardVerification';
import { 
  Settings, 
} from 'lucide-react';
import { getSharedContentInfo, clearSharedContentCookies, logCookieDebugInfo } from '@/utils/cookieUtils';
import '@/utils/cookieDebug'; // Load cookie debug utilities
import { Card } from '@/components/ui/card';
import { useCardStyling } from '@/hooks/useCardStyling';

export default function HomePage() {
  const { cgInstance, isInitializing } = useCgLib();
  const { token, user } = useAuth();
  const { joinBoard, leaveBoard, isConnected } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showExpandedForm, setShowExpandedForm] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [initialPostTitle, setInitialPostTitle] = useState('');

  // Get card styling for conditional header display
  const { hasActiveBackground } = useCardStyling();

  // Get boardId from URL params for board-specific filtering
  const boardId = searchParams?.get('boardId');

  // Initialize theme from URL params (same as sidebar)
  useEffect(() => {
    const cgTheme = searchParams?.get('cg_theme') || 'light';
    setTheme(cgTheme as 'light' | 'dark');
  }, [searchParams]);

  // Handle create post from URL params (mobile navigation from search)
  useEffect(() => {
    const shouldCreatePost = searchParams?.get('createPost') === 'true';
    const titleFromUrl = searchParams?.get('title') || '';
    
    if (shouldCreatePost) {
      setShowExpandedForm(true);
      setInitialPostTitle(titleFromUrl);
      
      // Clean up URL params to avoid showing form again on refresh
      const newSearchParams = new URLSearchParams(searchParams?.toString() || '');
      newSearchParams.delete('createPost');
      newSearchParams.delete('title');
      
      const newUrl = newSearchParams.toString() 
        ? `/?${newSearchParams.toString()}` 
        : '/';
      
      // Replace the current URL without triggering a re-render
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams]);

  // 🚀 REAL-TIME: Auto-join/leave board rooms based on current boardId
  useEffect(() => {
    if (!isConnected || !boardId) return;

    const boardIdNum = parseInt(boardId, 10);
    if (isNaN(boardIdNum)) return;

    console.log(`[HomePage] Auto-joining board room: ${boardIdNum}`);
    joinBoard(boardIdNum);

    // Cleanup: leave board room when component unmounts or boardId changes
    return () => {
      console.log(`[HomePage] Auto-leaving board room: ${boardIdNum}`);
      leaveBoard(boardIdNum);
    };
  }, [isConnected, boardId, joinBoard, leaveBoard]);

  /**
   * Standard URL builder that preserves existing URL parameters.
   * 
   * USAGE: Use for ALL navigation except post creation success callbacks
   * (For post creation, use buildPostUrlWithSharedBoardContext instead)
   * 
   * Preserves: cg_theme, boardId, and any other existing URL parameters
   * Adds/overrides: any additional parameters provided
   */
  const buildUrl = useCallback((path: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Add/override with new params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    return `${path}?${params.toString()}`;
  }, [searchParams]);

  /**
   * Builds post navigation URLs with shared board context awareness.
   * 
   * For OWNED boards: Uses standard buildUrl() - no special handling needed
   * For SHARED boards: Adds 'sharedFrom' parameter to maintain user context
   * 
   * WHY: When users create posts in shared boards, they expect to stay in their
   * importing community context, not get redirected to the source community.
   * 
   * USAGE: Only for post creation success navigation - use buildUrl() for everything else
   */
  const buildPostUrlWithSharedBoardContext = (newPost: ApiPost) => {
    // Detect shared board: board belongs to different community than current context
    const isSharedBoard = boardInfo && communityInfo && 
                         boardInfo.community_id !== communityInfo.id;
    
    if (isSharedBoard) {
      console.log(`[HomePage] Shared board detected: staying in importing community context`);
      // Add 'sharedFrom' parameter so post detail page knows to preserve importing community context
      return buildUrl(`/board/${newPost.board_id}/post/${newPost.id}`, {
        sharedFrom: communityInfo.id
      });
    } else {
      // Owned boards: standard navigation (no shared board logic needed)
      return buildUrl(`/board/${newPost.board_id}/post/${newPost.id}`);
    }
  };

  // Handle shared content detection (from external share links)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      console.log('[HomePage] Skipping shared content check - server side');
      return;
    }
    
    console.log('[HomePage] 🔍 Running shared content detection...');
    
    const { isShared, postData } = getSharedContentInfo();
    
    if (isShared && postData) {
      console.log('[HomePage] 🔗 Shared content detected, navigating to post:', postData);
      
      // Log debug info for browser compatibility testing
      logCookieDebugInfo();
      
      // Navigate to the shared post
      const postUrl = buildUrl(`/board/${postData.boardId}/post/${postData.postId}`);
      console.log('[HomePage] Navigating to shared post URL:', postUrl);
      router.push(postUrl);
      
      // Clear the cookies after processing to avoid repeated redirects
      clearSharedContentCookies();
    } else {
      console.log('[HomePage] No shared content detected');
      // Still log debug info to help troubleshoot
      logCookieDebugInfo();
    }
  }, [buildUrl, router]); // Include dependencies to fix React Hook warning

  // Fetch community info
  const { data: communityInfo, isLoading: isLoadingCommunityInfo } = useQuery<CommunityInfoResponsePayload | null>({
    queryKey: ['communityInfo', cgInstance?.getCommunityInfo !== undefined],
    queryFn: async () => {
      if (!cgInstance) throw new Error('CgInstance not available');
      const response = await cgInstance.getCommunityInfo();
      if (!response?.data) throw new Error('Failed to fetch community info data from CgLib.');
      return response.data;
    },
    enabled: !!cgInstance && !isInitializing,
  });

  // If we have a boardId, fetch board info to display board name (handles both owned and shared boards)
  const { data: boardInfo } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      if (!boardId || !communityInfo?.id || !token) return null;
      
      // Use direct board resolution approach that handles shared boards
      try {
        const response = await authFetchJson<{ board: ApiBoard | null }>(
          `/api/communities/${communityInfo.id}/boards/${boardId}`, 
          { token }
        );
        return response.board;
      } catch (error) {
        console.error('[HomePage] Failed to resolve board info:', error);
        return null;
      }
    },
    enabled: !!boardId && !!communityInfo?.id && !!token,
  });

  // Fetch board verification status if board has lock gating
  const { data: boardVerificationStatus } = useQuery({
    queryKey: ['boardVerificationStatus', boardId],
    queryFn: async () => {
      if (!boardId || !token || !communityInfo?.id) return null;
      try {
        // Use the existing board verification status endpoint (still works for boards)
        const response = await authFetchJson<BoardVerificationApiResponse>(
          `/api/communities/${communityInfo.id}/boards/${boardId}/verification-status`, 
          { token }
        );
        return response.data;
      } catch (error) {
        console.error('[HomePage] Failed to fetch board verification status:', error);
        return null;
      }
    },
    enabled: !!boardId && !!token && !!communityInfo?.id && !!boardInfo && 
             !!boardInfo.settings?.permissions?.locks?.lockIds?.length,
  });

  // 🚀 POST CREATION GATING: Check board verification before allowing post creation
  const handleCreatePostClick = useCallback((title?: string) => {
    setInitialPostTitle(title || '');
    
    // Check if board has lock requirements and user verification status
    if (boardId && boardVerificationStatus && !boardVerificationStatus.hasWriteAccess) {
      console.log(`[HomePage] User needs verification for board ${boardId}, showing verification modal`);
      setShowVerificationModal(true);
    } else {
      console.log(`[HomePage] User has access or no verification required, showing post creation form`);
      setShowExpandedForm(true);
    }
  }, [boardId, boardVerificationStatus]);

  // Watch for verification completion via React Query status changes
  useEffect(() => {
    // If verification modal is open and user gains write access, show post creation form
    if (showVerificationModal && boardVerificationStatus?.hasWriteAccess) {
      console.log(`[HomePage] Verification completed, showing post creation form`);
      setShowVerificationModal(false);
      setShowExpandedForm(true);
    }
  }, [showVerificationModal, boardVerificationStatus?.hasWriteAccess]);

  if (isInitializing || isLoadingCommunityInfo) {
    return (
      <div className="min-h-screen">
        {/* Hero Skeleton */}
        <div className="relative h-80 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="relative z-10 flex items-end justify-center h-full p-8">
            <div className="text-center space-y-4">
              <div className="h-8 w-64 bg-white/20 rounded-lg mx-auto" />
              <div className="h-4 w-48 bg-white/10 rounded mx-auto" />
            </div>
          </div>
        </div>
        
        <div className="container mx-auto py-8 px-4">
          <div className="space-y-8">
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!communityInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl font-semibold text-slate-700 dark:text-slate-300">
            Unable to load community information
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Main Container - Clean layout, OnlineUsersSidebar now in MainLayoutWithSidebar */}
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Search-First Post Creation */}
          <section className="max-w-3xl mx-auto">
            {showExpandedForm ? (
              <ModalContainer
                isPostModalOpen={showExpandedForm}
                onPostModalClose={() => {
                  setShowExpandedForm(false);
                  setInitialPostTitle('');
                }}
                onPostCreated={(newPost: ApiPost) => {
                  // Navigate to the newly created post detail page (shared board aware)
                  const postUrl = buildPostUrlWithSharedBoardContext(newPost);
                  console.log(`[HomePage] Navigating to new post: ${postUrl}`);
                  router.push(postUrl);
                }}
                boardId={boardId}
                initialTitle={initialPostTitle}
              />
            ) : (
              <SearchFirstPostInput 
                boardId={boardId}
                enableGlobalSearch={true}
                onCreatePostClick={handleCreatePostClick}
                onPostCreated={(newPost: ApiPost) => {
                  // Navigate to the newly created post detail page (shared board aware)
                  const postUrl = buildPostUrlWithSharedBoardContext(newPost);
                  console.log(`[HomePage] Navigating to new post from search: ${postUrl}`);
                  router.push(postUrl);
                }}
              />
            )}
          </section>

          {/* Tag Filtering */}
          <section className="max-w-3xl mx-auto">
            <TagFilterComponent
              boardId={boardId}
              theme={theme}
              className="mb-4"
            />
          </section>

          {/* Board Verification Modal - Show when user needs to verify before posting */}
          {showVerificationModal && boardId && communityInfo?.id && (
            <BoardVerificationModal
              isOpen={showVerificationModal}
              onClose={() => {
                setShowVerificationModal(false);
                setInitialPostTitle('');
              }}
              boardId={parseInt(boardId, 10)}
              communityId={communityInfo.id}
            />
          )}

          {/* Telegram Setup Banner - Admin Only */}
          {communityInfo?.id && (
            <section className="max-w-3xl mx-auto">
              <TelegramSetupBanner 
                communityId={communityInfo.id}
                theme={theme}
                buildUrl={buildUrl}
              />
            </section>
          )}

          {/* Feed Section */}
          <main className="max-w-3xl mx-auto space-y-6">
          {/* Recent Discussions Header - Only show in solid background mode */}
          {!hasActiveBackground && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">
                  {boardId && boardInfo ? `${boardInfo.name}` : 'Recent Discussions'}
                </h2>
                
                {/* Board Settings Gear - Admin Only */}
                {user?.isAdmin && boardId && boardInfo && (
                  <Link href={buildUrl('/board-settings', { boardId })}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 rounded-full hover:bg-muted"
                      title="Board Settings"
                    >
                      <Settings size={16} className="transition-colors text-muted-foreground hover:text-foreground" />
                    </Button>
                  </Link>
                )}
              </div>
              
              {boardId && boardInfo && boardInfo.description && (
                <p className="text-sm text-muted-foreground">
                  {boardInfo.description}
                </p>
              )}
            </div>
          )}

          {/* Board Access Status - Show lock gating requirements */}
          {boardId && boardVerificationStatus && communityInfo?.id && (
            <section className="mb-6">
              <BoardAccessStatus
                boardId={parseInt(boardId, 10)}
                communityId={communityInfo.id}
                verificationStatus={boardVerificationStatus}
              />
            </section>
          )}
                    
          <FeedList boardId={boardId} boardInfo={boardInfo} />
          </main>
        </div>
      </div>
    </div>
  );
}
