/**
 * Embed Page - Progressive Authentication Experience
 * 
 * This is what loads inside the iframe on customer sites.
 * Progressive stages: Session Check → Authentication → Community → Auth Complete Message
 * After completion, sends curia-auth-complete message to parent for iframe switching.
 * 
 * Updated to use proven AuthenticationFlow component which handles:
 * - Wallet connection
 * - Profile preview ("moment of delight")
 * - Signature verification
 * - Session creation
 */

'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeProvider, ThemeToggle } from '@/contexts/ThemeContext';
import { QueryClientProvider } from '@/components/providers/QueryClientProvider';
import { 
  LoadingStep,
  SessionCheckStep,
  AuthenticationStep,
  ProfilePreviewStep,
  SignatureVerificationStep,
  CommunitySelectionStep,
  AuthCompleteStep
} from '@/components/embed';
import { EmbedConfig, EmbedStep, ProfileData } from '@/types/embed';

const EmbedContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<EmbedStep>('loading');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [useModernFlow, setUseModernFlow] = useState(true); // Use proven AuthenticationFlow by default

  // Parse embed configuration from URL parameters
  const config: EmbedConfig = {
    community: searchParams.get('community') || undefined,
    theme: (searchParams.get('theme') as 'light' | 'dark') || 'light',
  };

  // Check for legacy flow parameter (for backwards compatibility)
  React.useEffect(() => {
    const legacy = searchParams.get('legacy');
    if (legacy === 'true') {
      setUseModernFlow(false);
    }
  }, [searchParams]);

  // Send auth completion message to parent
  const sendAuthCompleteMessage = useCallback((userId: string, communityId: string, sessionToken?: string) => {
    const message = {
      type: 'curia-auth-complete',
      userId,
      communityId,
      sessionToken,
      timestamp: new Date().toISOString()
    };
    
    console.log('[Embed] DEBUG - sendAuthCompleteMessage called with:', { userId, communityId, sessionToken });
    console.log('[Embed] DEBUG - Message to send:', message);
    console.log('[Embed] DEBUG - window.parent:', window.parent);
    console.log('[Embed] DEBUG - window.parent !== window:', window.parent !== window);
    
    // Send to parent window
    if (window.parent && window.parent !== window) {
      console.log('[Embed] DEBUG - Sending PostMessage to parent...');
      window.parent.postMessage(message, '*');
      console.log('[Embed] DEBUG - PostMessage sent successfully');
    } else {
      console.log('[Embed] DEBUG - WARNING: No parent window or same window, cannot send message');
    }
  }, []);

  // Step transition handlers
  const handleLoadingComplete = useCallback(() => {
    setCurrentStep('session-check');
  }, []);

  const handleSessionResult = useCallback((hasSession: boolean, userData?: any) => {
    if (hasSession && userData) {
      console.log('[Embed] Session valid with user data:', userData);
      
      // Create ProfileData from session user data
      const sessionProfileData: ProfileData = {
        type: userData.identity_type === 'ens' ? 'ens' : 
              userData.identity_type === 'universal_profile' ? 'universal_profile' : 'anonymous',
        address: userData.wallet_address || userData.up_address,
        name: userData.name,
        domain: userData.ens_domain,
        avatar: userData.profile_picture_url,
        verificationLevel: userData.identity_type === 'anonymous' ? 'unverified' : 'verified',
        sessionToken: localStorage.getItem('curia_session_token') || undefined,
        // Store the actual database user_id for later use
        userId: userData.user_id
      };
      
      // Set profile data from existing session
      setProfileData(sessionProfileData);
      console.log('[Embed] Profile data populated from session:', sessionProfileData);
      
      // Check if embed has a specific community target
      if (config.community) {
        setSelectedCommunityId(config.community);
        setCurrentStep('community-selection');
      } else {
        // Has session + no specific community → show community selection
        setCurrentStep('community-selection');
      }
    } else {
      // No session → show authentication
      setCurrentStep('authentication');
    }
  }, [config.community]);

  const handleAuthenticated = useCallback((data: ProfileData) => {
    setProfileData(data);
    
    // Always show proper flow progression
    if (data.type === 'anonymous') {
      // Skip profile preview and signature for anonymous users
      console.log('[Embed] Anonymous user: proceeding to community selection');
      setCurrentStep('community-selection');
    } else {
      // Show "moment of delight" profile preview for wallet users (both fresh and already connected)
      console.log('[Embed] Wallet connected: showing profile preview');
      setCurrentStep('profile-preview');
    }
  }, []);

  const handleProfileContinue = useCallback((updatedProfileData?: ProfileData) => {
    // Update ProfileData with database user information if provided from signing
    if (updatedProfileData) {
      console.log('[Embed] ProfileData updated from profile preview signing:', updatedProfileData);
      setProfileData(updatedProfileData);
    }
    // Skip signature verification - signing happens in profile preview
    setCurrentStep('community-selection');
  }, []);

  const handleSwitchAccount = useCallback(() => {
    setProfileData(null);
    setCurrentStep('authentication');
  }, []);

  const handleSignatureComplete = useCallback((updatedProfileData?: ProfileData) => {
    // Update ProfileData with database user information if provided
    if (updatedProfileData) {
      console.log('[Embed] ProfileData updated from signature verification:', updatedProfileData);
      setProfileData(updatedProfileData);
    }
    setCurrentStep('community-selection');
  }, []);

  const handleCommunitySelected = useCallback((communityId?: string) => {
    if (communityId) {
      setSelectedCommunityId(communityId);
      console.log('[Embed] Community selected:', communityId);
      console.log('[Embed] DEBUG - profileData state:', profileData);
      console.log('[Embed] DEBUG - currentStep:', currentStep);
      
      // FIXED: Handle both authenticated and session-only users
      let userId: string;
      let sessionToken: string | undefined;
      
      if (profileData) {
        // User went through full authentication flow
        console.log('[Embed] DEBUG - Using profileData for auth complete');
        if (profileData.type === 'anonymous') {
          userId = `anonymous_${Date.now()}`;
        } else if (profileData.userId) {
          // Use the actual database user_id (e.g., "ens:florianglatz.eth")
          userId = profileData.userId;
        } else {
          // Fallback for cases without stored userId
          userId = profileData.address || `wallet_${Date.now()}`;
        }
        sessionToken = profileData.sessionToken;
      } else {
        // User has existing session but no profileData 
        console.log('[Embed] DEBUG - No profileData, creating fallback userId');
        userId = `session_user_${Date.now()}`;
        sessionToken = undefined; // No session token available
      }
      
      console.log('[Embed] DEBUG - Sending auth complete with userId:', userId);
      
      // Send auth complete message to parent
      sendAuthCompleteMessage(userId, communityId, sessionToken);
      
      // Show completion step
      setCurrentStep('auth-complete');
    } else {
      console.log('[Embed] DEBUG - No communityId provided to handleCommunitySelected');
    }
  }, [profileData, sendAuthCompleteMessage, currentStep]);

  // Initialize loading sequence
  React.useEffect(() => {
    const timer = setTimeout(handleLoadingComplete, 1500);
    return () => clearTimeout(timer);
  }, [handleLoadingComplete]);

  // Note: Signature verification is now properly integrated into the flow

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'loading':
        return <LoadingStep />;
        
      case 'session-check':
        return (
          <SessionCheckStep 
            config={config}
            onSessionResult={handleSessionResult}
          />
        );
        
      case 'authentication':
        return (
          <AuthenticationStep 
            config={config}
            onAuthenticated={handleAuthenticated}
          />
        );
        
      case 'profile-preview':
        return profileData ? (
          <ProfilePreviewStep 
            config={config}
            profileData={profileData}
            onSwitchAccount={handleSwitchAccount}
            onContinue={handleProfileContinue}
          />
        ) : null;
        
      case 'signature-verification':
        return profileData ? (
          <SignatureVerificationStep 
            config={config}
            profileData={profileData}
            onSignatureComplete={handleSignatureComplete}
          />
        ) : null;
        
      case 'community-selection':
        return (
          <CommunitySelectionStep 
            config={config}
            onCommunitySelected={handleCommunitySelected}
            sessionToken={profileData?.sessionToken}
          />
        );
        
      case 'auth-complete':
        return (
          <AuthCompleteStep 
            config={config}
            profileData={profileData}
            communityId={selectedCommunityId}
          />
        );
        
      default:
        return <LoadingStep />;
    }
  };

  return (
    <div className="embed-container">
      <div className="embed-content">
        {renderStep()}
      </div>
      
      {/* Theme Toggle (for development) */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Flow Indicator (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-background border border-border rounded-lg px-3 py-2 text-xs">
            <div className="font-mono text-muted-foreground">
              {useModernFlow ? '🚀 Modern Flow' : '📜 Legacy Flow'}
            </div>
            <div className="font-mono text-muted-foreground">
              Step: {currentStep}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function EmbedPage() {
  return (
    <QueryClientProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Suspense fallback={<LoadingStep />}>
            <EmbedContent />
          </Suspense>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
} 