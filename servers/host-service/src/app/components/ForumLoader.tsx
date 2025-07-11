'use client'

/**
 * Forum Loader Component
 * 
 * Final stage that loads the complete Curia forum experience:
 * 1. Construct the forum URL with user + community context
 * 2. Load the forum in an iframe with proper authentication
 * 3. Handle communication between forum and host
 */

import { useEffect, useRef } from 'react';

// Types
interface IframeConfig {
  communityId?: string;
  communityName?: string;
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  allowAnonymous?: boolean;
  requireAuth?: boolean;
  returnUrl?: string;
  embedOrigin?: string;
}

interface UserSession {
  userId: string;
  identityType: 'legacy' | 'ens' | 'universal_profile' | 'anonymous';
  walletAddress?: string;
  ensName?: string;
  upAddress?: string;
  name?: string;
  profilePicture?: string;
  authToken: string;
  expiresAt: string;
}

interface CommunityContext {
  communityId: string;
  communityName: string;
  userRole: 'owner' | 'admin' | 'moderator' | 'member';
  permissions: string[];
}

interface ForumLoaderProps {
  config: IframeConfig;
  userSession: UserSession;
  communityContext: CommunityContext;
  onError: (error: string, details?: any) => void;
}

export function ForumLoader({ 
  config, 
  userSession, 
  communityContext, 
  onError 
}: ForumLoaderProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadForum = async () => {
      try {
        // Construct the forum URL with authentication and context
        const forumUrl = buildForumUrl();
        
        if (iframeRef.current) {
          iframeRef.current.src = forumUrl;
        }

        // Set up postMessage communication with the forum
        const handleForumMessage = (event: MessageEvent) => {
          // Security: Verify origin
          const allowedOrigins = [
            process.env.NEXT_PUBLIC_FORUM_URL,
            'http://localhost:3000',
            window.location.origin
          ].filter(Boolean);

          if (!allowedOrigins.includes(event.origin)) {
            return;
          }

          // Handle forum messages
          if (event.data.type === 'FORUM_READY') {
            // Forum has loaded and is ready
            console.log('[ForumLoader] Forum is ready');
          } else if (event.data.type === 'FORUM_ERROR') {
            onError(`Forum error: ${event.data.error}`, event.data.details);
          } else if (event.data.type === 'FORUM_NAVIGATION') {
            // Handle navigation events if needed
            console.log('[ForumLoader] Forum navigation:', event.data.path);
          }
        };

        window.addEventListener('message', handleForumMessage);

        // Cleanup listener on unmount
        return () => {
          window.removeEventListener('message', handleForumMessage);
        };

      } catch (error) {
        console.error('[ForumLoader] Error:', error);
        onError('Failed to load forum');
      }
    };

    loadForum();
  }, [userSession, communityContext, config]);

  // Build the forum URL with all necessary parameters
  const buildForumUrl = (): string => {
    const baseUrl = process.env.NEXT_PUBLIC_FORUM_URL || 'http://localhost:3000';
    const params = new URLSearchParams();

    // Set standalone mode
    params.set('mod', 'standalone');

    // Authentication parameters
    params.set('auth_token', userSession.authToken);
    params.set('user_id', userSession.userId);
    params.set('identity_type', userSession.identityType);

    // Community context
    params.set('community_id', communityContext.communityId);
    params.set('community_name', communityContext.communityName);
    params.set('user_role', communityContext.userRole);

    // Visual customization
    if (config.theme) {
      params.set('cg_theme', config.theme);
    }
    if (config.primaryColor) {
      params.set('primary_color', config.primaryColor);
    }

    // Embedding context
    if (config.embedOrigin) {
      params.set('embed_origin', config.embedOrigin);
    }

    // Return URL for navigation
    if (config.returnUrl) {
      params.set('return_url', config.returnUrl);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative'
    }}>
      <iframe
        ref={iframeRef}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '0px'
        }}
        title="Curia Forum"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
      />
      
      {/* Loading overlay while iframe loads */}
      <div 
        id="forum-loading-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: config.theme === 'dark' ? '#1f2937' : '#ffffff',
          color: config.theme === 'dark' ? '#ffffff' : '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          transition: 'opacity 0.3s ease-out'
        }}
      >
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: `4px solid ${config.primaryColor || '#3b82f6'}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }} />
        <p style={{ opacity: 0.7, fontSize: '14px' }}>
          Loading {communityContext.communityName} forum...
        </p>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Hide loading overlay when iframe loads
            if (typeof window !== 'undefined') {
              const iframe = document.querySelector('iframe[title="Curia Forum"]');
              const overlay = document.getElementById('forum-loading-overlay');
              
              if (iframe && overlay) {
                iframe.addEventListener('load', function() {
                  setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                      overlay.style.display = 'none';
                    }, 300);
                  }, 500); // Small delay to ensure forum is ready
                });
              }
            }
          `
        }}
      />
    </div>
  );
} 