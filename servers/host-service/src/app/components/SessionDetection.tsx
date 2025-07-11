'use client'

/**
 * Session Detection Component
 * 
 * Automatically checks for existing authentication:
 * 1. Look for session cookies/localStorage
 * 2. Validate session with backend API
 * 3. Return session data or null if no valid session
 */

import { useEffect } from 'react';

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

interface SessionDetectionProps {
  config: IframeConfig;
  onSessionDetected: (session: UserSession | null) => void;
  onError: (error: string, details?: any) => void;
  setIsLoading: (loading: boolean) => void;
}

export function SessionDetection({ 
  config, 
  onSessionDetected, 
  onError, 
  setIsLoading 
}: SessionDetectionProps) {

  useEffect(() => {
    const detectSession = async () => {
      setIsLoading(true);
      
      try {
        // Check for session token in various storage mechanisms
        const sessionToken = 
          // Cookie-based session
          getCookie('curia_session') ||
          // localStorage fallback  
          (typeof window !== 'undefined' ? localStorage.getItem('curia_session') : null) ||
          // sessionStorage fallback
          (typeof window !== 'undefined' ? sessionStorage.getItem('curia_session') : null);

        if (!sessionToken) {
          // No session found, user needs to authenticate
          onSessionDetected(null);
          return;
        }

        // Validate session with backend
        const response = await fetch('/api/auth/validate-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            sessionToken,
            origin: config.embedOrigin 
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Session expired or invalid
            clearSession();
            onSessionDetected(null);
            return;
          }
          throw new Error(`Session validation failed: ${response.statusText}`);
        }

        const sessionData = await response.json();
        
        // Convert API response to UserSession format
        const userSession: UserSession = {
          userId: sessionData.user.user_id,
          identityType: sessionData.user.identity_type,
          walletAddress: sessionData.user.wallet_address,
          ensName: sessionData.user.ens_domain,
          upAddress: sessionData.user.up_address,
          name: sessionData.user.name,
          profilePicture: sessionData.user.profile_picture_url,
          authToken: sessionData.token,
          expiresAt: sessionData.expiresAt,
        };

        // Update session storage with fresh token
        if (typeof window !== 'undefined') {
          setCookie('curia_session', sessionData.token, new Date(sessionData.expiresAt));
          localStorage.setItem('curia_session', sessionData.token);
        }

        onSessionDetected(userSession);

      } catch (error) {
        console.error('[SessionDetection] Error:', error);
        
        // Clear potentially corrupted session data
        clearSession();
        
        if (error instanceof Error) {
          onError(`Session detection failed: ${error.message}`);
        } else {
          onError('Failed to detect existing session');
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Start session detection automatically
    detectSession();
  }, [config.embedOrigin, onSessionDetected, onError, setIsLoading]);

  // Helper: Get cookie value
  const getCookie = (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Helper: Set cookie
  const setCookie = (name: string, value: string, expires: Date) => {
    if (typeof window === 'undefined') return;
    
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
  };

  // Helper: Clear all session data
  const clearSession = () => {
    if (typeof window === 'undefined') return;
    
    // Clear cookie
    document.cookie = 'curia_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Clear storage
    localStorage.removeItem('curia_session');
    sessionStorage.removeItem('curia_session');
  };

  // This component renders a loading state while checking session
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px'
      }} />
      <p style={{ opacity: 0.7, fontSize: '14px' }}>
        Checking for existing session...
      </p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 