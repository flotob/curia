/**
 * Embed Types - All interfaces and types for the embed system
 */

export interface EmbedConfig {
  community?: string;
  theme: 'light' | 'dark';
}

export type EmbedStep = 
  | 'loading' 
  | 'session-check' 
  | 'authentication' 
  | 'profile-preview' 
  | 'signature-verification' 
  | 'community-selection' 
  | 'forum';

export interface AuthOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradientClass: string;
  buttonClass: string;
  action: () => void;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPublic: boolean;
  gradientClass: string;
  icon: string;
}

export interface ProfileData {
  type: 'ens' | 'universal_profile' | 'anonymous';
  address?: string;
  name?: string;
  avatar?: string | null;
  domain?: string;
  balance?: string;
  followerCount?: number;
  verificationLevel?: 'verified' | 'partial' | 'unverified';
}

export interface StepProps {
  config: EmbedConfig;
}

export interface SessionCheckStepProps extends StepProps {
  onSessionResult: (hasSession: boolean) => void;
}

export interface AuthenticationStepProps extends StepProps {
  onAuthenticated: (profileData: ProfileData) => void;
}

export interface ProfilePreviewStepProps extends StepProps {
  profileData: ProfileData;
  onSwitchAccount: () => void;
  onContinue: () => void;
}

export interface SignatureVerificationStepProps extends StepProps {
  profileData: ProfileData;
  onSignatureComplete: () => void;
}

export interface CommunitySelectionStepProps extends StepProps {
  onCommunitySelected: () => void;
}

export interface ForumStepProps extends StepProps {} 