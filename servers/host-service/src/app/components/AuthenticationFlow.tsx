'use client'

/**
 * Authentication Flow Component (Using Proven Patterns)
 * 
 * Now uses the battle-tested wallet integration patterns from the main forum app:
 * - TippingModal pattern (provider wrapper + internal component)
 * - Clean hook interfaces (useUniversalProfile, useEthereumProfile)  
 * - Local provider scope (isolated contexts)
 * - Professional UI with RainbowKit + proven UP integration
 */

import { useState, useCallback } from 'react';
import { AuthenticationFlow as NewAuthFlow, AuthenticationResult } from '../../components/auth/AuthenticationFlow';

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

interface AuthenticationFlowProps {
  config: IframeConfig;
  onAuthComplete: (session: UserSession) => void;
  onError: (error: string, details?: any) => void;
  setIsLoading: (loading: boolean) => void;
}

export function AuthenticationFlow({ 
  config, 
  onAuthComplete, 
  onError, 
  setIsLoading 
}: AuthenticationFlowProps) {
  
  // Convert the new AuthenticationResult to the expected UserSession format
  const handleAuthenticationComplete = useCallback((result: AuthenticationResult) => {
    if (result.success) {
      // Convert to UserSession format expected by the parent
      const userSession: UserSession = {
        userId: result.sessionToken || `${result.identityType}_${Date.now()}`,
        identityType: result.identityType,
        walletAddress: result.identityType === 'ens' ? result.address : undefined,
        ensName: result.identityType === 'ens' ? result.displayName : undefined,
        upAddress: result.identityType === 'universal_profile' ? result.address : undefined,
        name: result.displayName || 'User',
        profilePicture: result.profile?.profileImage,
        authToken: result.sessionToken || `mock_${Date.now()}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };

      console.log('[AuthenticationFlow] Authentication successful:', userSession);
      onAuthComplete(userSession);
    } else {
      console.error('[AuthenticationFlow] Authentication failed:', result.error);
      onError(result.error || 'Authentication failed');
    }
  }, [onAuthComplete, onError]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      padding: '20px',
      background: config.theme === 'dark' ? '#1f2937' : '#ffffff',
      color: config.theme === 'dark' ? '#ffffff' : '#000000'
    }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <NewAuthFlow
          onAuthenticationComplete={handleAuthenticationComplete}
          allowAnonymous={config.allowAnonymous}
          className="w-full"
        />
      </div>
    </div>
  );
} 