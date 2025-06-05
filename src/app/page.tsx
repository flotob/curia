'use client'; // Marking as client component as FeedList uses client-side hooks

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FeedList } from '@/components/voting/FeedList';
import { SearchFirstPostInput } from '@/components/voting/SearchFirstPostInput';
import { ExpandedNewPostForm } from '@/components/voting/ExpandedNewPostForm';
import { useAuth } from '@/contexts/AuthContext';
import { useCgLib } from '@/contexts/CgLibContext';
import { useSocket } from '@/contexts/SocketContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { authFetchJson } from '@/utils/authFetch';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
} from 'lucide-react';
import { getSharedContentInfo, clearSharedContentCookies, logCookieDebugInfo } from '@/utils/cookieUtils';
import '@/utils/cookieDebug'; // Load cookie debug utilities

export default function HomePage() {
  const { cgInstance, isInitializing } = useCgLib();
  const { token, user } = useAuth();
  const { joinBoard, leaveBoard, isConnected } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showExpandedForm, setShowExpandedForm] = useState(false);
  const [initialPostTitle, setInitialPostTitle] = useState('');

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

  // Helper function to preserve existing URL params
  const buildUrl = (path: string, additionalParams: Record<string, string> = {}) => {
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

  // If we have a boardId, fetch board info to display board name
  const { data: boardInfo } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      if (!boardId || !communityInfo?.id || !token) return null;
      const boards = await authFetchJson<ApiBoard[]>(`/api/communities/${communityInfo.id}/boards`, { token });
      return boards.find((board) => board.id.toString() === boardId) || null;
    },
    enabled: !!boardId && !!communityInfo?.id && !!token,
  });

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
          <section className="max-w-2xl mx-auto">
            {showExpandedForm ? (
              <ExpandedNewPostForm 
                boardId={boardId} 
                initialTitle={initialPostTitle}
                onCancel={() => {
                  setShowExpandedForm(false);
                  setInitialPostTitle('');
                }}
                onPostCreated={(newPost: ApiPost) => {
                  // Navigate to the newly created post detail page
                  const postUrl = buildUrl(`/board/${newPost.board_id}/post/${newPost.id}`);
                  console.log(`[HomePage] Navigating to new post: ${postUrl}`);
                  router.push(postUrl);
                }}
              />
            ) : (
              <SearchFirstPostInput 
                boardId={boardId}
                enableGlobalSearch={true}
                onCreatePostClick={(title) => {
                  setInitialPostTitle(title || '');
                  setShowExpandedForm(true);
                }}
                onPostCreated={(newPost: ApiPost) => {
                  // Navigate to the newly created post detail page
                  const postUrl = buildUrl(`/board/${newPost.board_id}/post/${newPost.id}`);
                  console.log(`[HomePage] Navigating to new post from search: ${postUrl}`);
                  router.push(postUrl);
                }}
              />
            )}
          </section>

          {/* Feed Section */}
          <main className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={cn(
                'text-xl font-semibold',
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}>
                {boardId && boardInfo ? `${boardInfo.name}` : 'Recent Discussions'}
              </h2>
              {boardId && boardInfo && boardInfo.description && (
                <p className={cn(
                  'text-sm mt-1',
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>
                  {boardInfo.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium',
                theme === 'dark' 
                  ? 'bg-slate-800/50 text-slate-400 border border-slate-700/40'
                  : 'bg-slate-100/70 text-slate-600 border border-slate-200/60'
              )}>
                {boardId ? 'Board Posts' : 'Latest Posts'}
              </div>
              
              {/* Board Settings Button - Admin Only */}
              {user?.isAdmin && boardId && boardInfo && (
                <Link href={buildUrl('/board-settings', { boardId })}>
                  <Button variant="outline" size="sm" className="flex items-center">
                    <Settings size={14} className="mr-2" />
                    Settings
                  </Button>
                </Link>
              )}
            </div>
          </div>
                    
          <FeedList boardId={boardId} />
          </main>
        </div>
      </div>
    </div>
  );
}
