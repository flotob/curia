'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCrossCommunityNavigation } from '@/hooks/useCrossCommunityNavigation';
import { Loader2, ExternalLink } from 'lucide-react';

export default function ForwardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { navigateToPost } = useCrossCommunityNavigation();
  const [isForwarding, setIsForwarding] = useState(false);
  
  // Extract forwarding parameters
  const postId = parseInt(searchParams?.get('postId') || '0', 10);
  const boardId = parseInt(searchParams?.get('boardId') || '0', 10);
  const communityShortId = searchParams?.get('communityShortId') || '';
  const pluginId = searchParams?.get('pluginId') || '';
  const postTitle = searchParams?.get('postTitle') || 'post';
  const sourceCommunityName = searchParams?.get('sourceCommunityName') || 'Partner Community';

  useEffect(() => {
    // Validate required parameters
    if (!postId || !boardId || !communityShortId || !pluginId) {
      console.error('[Forwarding] Missing required parameters:', {
        postId, boardId, communityShortId, pluginId
      });
      // Fallback to home if parameters are invalid
      router.push('/');
      return;
    }

    const performForwarding = async () => {
      try {
        console.log('[Forwarding] Starting cross-community navigation to:', {
          postTitle, sourceCommunityName, postId, boardId, communityShortId, pluginId
        });
        
        setIsForwarding(true);
        
        // Wait a moment for the user to see the message (better UX than instant redirect)
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Perform cross-community navigation using the same logic as Activity Items
        await navigateToPost(communityShortId, pluginId, postId, boardId);
        
      } catch (error) {
        console.error('[Forwarding] Cross-community navigation failed:', error);
        // Fallback to home on error
        router.push('/');
      }
    };

    performForwarding();
  }, [postId, boardId, communityShortId, pluginId, postTitle, sourceCommunityName, navigateToPost, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 relative">
      {/* Background Blur Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" />
      
      {/* Modal Content */}
      <div className="max-w-md w-full mx-4 relative z-[70]">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center">
          {/* Loading Spinner */}
          <div className="mb-6">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
              <ExternalLink className="h-6 w-6 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          
          {/* Forwarding Message */}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Opening in {sourceCommunityName}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Forwarding you to{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              &ldquo;{postTitle}&rdquo;
            </span>
            ...
          </p>
          
          {/* Progress Indicator */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: isForwarding ? '100%' : '30%' }}
            />
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            This should only take a moment...
          </p>
        </div>
      </div>
    </div>
  );
} 