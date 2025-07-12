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
  | 'auth-complete';

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
  logoUrl?: string | null;
  requiresApproval?: boolean;
  isMember?: boolean;
  userRole?: string;
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
  sessionToken?: string;
  userId?: string; // Database user_id (e.g., "ens:florianglatz.eth")
}

export interface StepProps {
  config: EmbedConfig;
}

export interface SessionCheckStepProps extends StepProps {
  onSessionResult: (hasSession: boolean, userData?: any) => void;
}

export interface AuthenticationStepProps extends StepProps {
  onAuthenticated: (profileData: ProfileData) => void;
}

export interface ProfilePreviewStepProps extends StepProps {
  profileData: ProfileData;
  onSwitchAccount: () => void;
  onContinue: (updatedProfileData?: ProfileData) => void;
}

export interface SignatureVerificationStepProps extends StepProps {
  profileData: ProfileData;
  onSignatureComplete: (updatedProfileData?: ProfileData) => void;
}

export interface CommunitySelectionStepProps extends StepProps {
  onCommunitySelected: (communityId?: string) => void;
  sessionToken?: string;
}

export interface AuthCompleteStepProps extends StepProps {
  profileData: ProfileData | null;
  communityId: string | null;
} 