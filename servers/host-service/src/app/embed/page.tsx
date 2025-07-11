/**
 * Embed Page - Progressive Authentication Experience
 * 
 * This is what loads inside the iframe on customer sites.
 * Progressive stages: Session Check → Authentication → Profile Preview → Signature → Community → Forum
 * Uses proper theme system and loads real Curia forum via ClientPluginHost.
 */

'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeProvider, ThemeToggle } from '@/contexts/ThemeContext';
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
  
  // Setup iframe communication
  useIframeResize();

  // Parse embed configuration from URL parameters
  const config: EmbedConfig = {
    community: searchParams.get('community') || undefined,
    theme: (searchParams.get('theme') as 'light' | 'dark') || 'light',
  };

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
    
    if (data.type === 'anonymous') {
      // Skip profile preview and signature for anonymous users
      setCurrentStep('community-selection');
    } else {
      // Show profile preview for wallet users
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
    </div>
  );
};

export default function EmbedPage() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Suspense fallback={<LoadingStep />}>
          <EmbedContent />
        </Suspense>
      </div>
    </ThemeProvider>
  );
} 