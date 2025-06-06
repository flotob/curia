'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Client-side Semantic URL Redirect Handler
 * 
 * This page handles the final step of semantic URL redirection.
 * It receives encoded redirect data, sets the necessary cookies for
 * iframe share detection, and then redirects to Common Ground.
 * 
 * This approach is necessary because Next.js App Router doesn't allow
 * setting cookies during server-side redirects.
 */
export default function SemanticRedirectPage() {
  const searchParams = useSearchParams();
  const hasRedirected = useRef(false);
  
  useEffect(() => {
    // Prevent double execution in development mode
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    
    try {
      const encodedData = searchParams.get('data');
      if (!encodedData) {
        console.error('[SemanticRedirect] No redirect data provided');
        window.location.href = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
        return;
      }
      
      // Decode the redirect data
      const redirectData = JSON.parse(decodeURIComponent(encodedData));
      const { redirectUrl, sharedContentToken, postData, semanticUrl } = redirectData;
      
      console.log(`[SemanticRedirect] Processing redirect for: "${semanticUrl.postTitle}"`);
      console.log(`[SemanticRedirect] Target URL: ${redirectUrl}`);
      
      // Set cookies for iframe share detection (compatible with existing system)
      // These cookies help Common Ground detect when content is being accessed via share
      document.cookie = `shared_content_token=${sharedContentToken}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `shared_post_data=${encodeURIComponent(postData)}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;
      
      // Add a small delay to ensure cookies are set before redirect
      setTimeout(() => {
        console.log(`[SemanticRedirect] Redirecting to Common Ground...`);
        window.location.href = redirectUrl;
      }, 100);
      
    } catch (error) {
      console.error('[SemanticRedirect] Error processing redirect:', error);
      // Fallback redirect to Common Ground home
      window.location.href = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
    }
  }, [searchParams]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Redirecting to Discussion...
        </h1>
        <p className="text-gray-600">
          Taking you to the full conversation on Common Ground
        </p>
      </div>
    </div>
  );
} 