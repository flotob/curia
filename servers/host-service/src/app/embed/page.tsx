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
import { useIframeResize } from '@/lib/embed/hooks';
import { EmbedConfig, EmbedStep, ProfileData } from '@/types/embed';

const EmbedContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<EmbedStep>('loading');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [useModernFlow, setUseModernFlow] = useState(true); // Use proven AuthenticationFlow by default
  
  // Setup iframe communication
  useIframeResize();

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
    
    console.log('[Embed] Sending auth complete message to parent:', message);
    
    // Send to parent window
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }, []);

  // Step transition handlers
  const handleLoadingComplete = useCallback(() => {
    setCurrentStep('session-check');
  }, []);

  const handleSessionResult = useCallback((hasSession: boolean) => {
    if (hasSession) {
      // Check if embed has a specific community target
      if (config.community) {
        // Has session + specific community → send auth complete immediately
        // We'll need to extract user ID from session data
        console.log('[Embed] Has session and specific community, sending auth complete');
        // For now, we'll proceed to community selection to get the user context
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

  const handleProfileContinue = useCallback(() => {
    // Skip signature verification since we handle signing directly in the profile step
    setCurrentStep('community-selection');
  }, []);

  const handleSwitchAccount = useCallback(() => {
    setProfileData(null);
    setCurrentStep('authentication');
  }, []);

  const handleSignatureComplete = useCallback(() => {
    setCurrentStep('community-selection');
  }, []);

  const handleCommunitySelected = useCallback((communityId?: string) => {
    if (communityId) {
      setSelectedCommunityId(communityId);
      console.log('[Embed] Community selected:', communityId);
      
      // Instead of going to forum, send auth complete message and show completion
      if (profileData) {
        // Create user ID from profile data
        let userId: string;
        if (profileData.type === 'anonymous') {
          userId = `anonymous_${Date.now()}`;
        } else {
          userId = profileData.address || `wallet_${Date.now()}`;
        }
        
        // Send auth complete message to parent
        sendAuthCompleteMessage(userId, communityId, profileData.sessionToken);
        
        // Show completion step
        setCurrentStep('auth-complete');
      }
    }
  }, [profileData, sendAuthCompleteMessage]);

  // Initialize loading sequence
  React.useEffect(() => {
    const timer = setTimeout(handleLoadingComplete, 1500);
    return () => clearTimeout(timer);
  }, [handleLoadingComplete]);

  // Handle signature verification bypass
  React.useEffect(() => {
    if (currentStep === 'signature-verification') {
      setCurrentStep('community-selection');
    }
  }, [currentStep]);

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
        // Skip signature verification - now handled directly in profile step
        // This should never be reached in normal flow
        return (
          <div className="embed-step">
            <div className="embed-card embed-card--sm">
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Redirecting...</p>
              </div>
            </div>
          </div>
        );
        
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