/**
 * Embed Page - Progressive Authentication Experience
 * 
 * This is what loads inside the iframe on customer sites.
 * Progressive stages: Session Check → Authentication → Community → Forum
 * Uses proper theme system and loads real Curia forum via ClientPluginHost.
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
  ForumStep
} from '@/components/embed';
import { useIframeResize } from '@/lib/embed/hooks';
import { EmbedConfig, EmbedStep, ProfileData } from '@/types/embed';

const EmbedContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<EmbedStep>('loading');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
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

  // Step transition handlers
  const handleLoadingComplete = useCallback(() => {
    setCurrentStep('session-check');
  }, []);

  const handleSessionResult = useCallback((hasSession: boolean) => {
    if (hasSession) {
      setCurrentStep('forum');
    } else {
      setCurrentStep('authentication');
    }
  }, []);

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
    setCurrentStep('signature-verification');
  }, []);

  const handleSwitchAccount = useCallback(() => {
    setProfileData(null);
    setCurrentStep('authentication');
  }, []);

  const handleSignatureComplete = useCallback(() => {
    setCurrentStep('community-selection');
  }, []);

  const handleCommunitySelected = useCallback(() => {
    setCurrentStep('forum');
  }, []);

  // Initialize loading sequence
  React.useEffect(() => {
    const timer = setTimeout(handleLoadingComplete, 1500);
    return () => clearTimeout(timer);
  }, [handleLoadingComplete]);

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
          />
        );
        
      case 'forum':
        return <ForumStep config={config} />;
        
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