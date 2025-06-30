/**
 * Smart Verification Button Component
 * 
 * Unified button that works for both Universal Profile and Ethereum verification contexts.
 * 
 * Intelligent button that changes state based on:
 * - Wallet connection status
 * - Requirements verification status
 * - Loading/verification states
 * - Success/error states
 * 
 * Note: Originally named EthereumSmartVerificationButton but now supports both profile types
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Loader2,
  Wallet,
  AlertTriangle,
  XCircle
} from 'lucide-react';

// ===== TYPES =====

export type VerificationButtonState = 
  | 'wallet_not_connected'
  | 'wrong_network' 
  | 'requirements_not_met'
  | 'ready_to_verify'
  | 'verifying'
  | 'verification_complete'
  | 'verification_failed'
  | 'verification_success_pending'
  | 'verification_error_pending'
  | 'preview_mode_complete';

export interface EthereumSmartVerificationButtonProps {
  profileType?: 'universal_profile' | 'ethereum_profile'; // Optional for backwards compatibility
  state: VerificationButtonState;
  allRequirementsMet: boolean;
  isConnected: boolean;
  isCorrectChain: boolean;
  isVerifying: boolean;
  verified: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  error?: string;
}

// ===== MAIN COMPONENT =====

export const EthereumSmartVerificationButton: React.FC<EthereumSmartVerificationButtonProps> = ({
  profileType = 'ethereum_profile', // Default to ethereum for backwards compatibility
  state,
  allRequirementsMet,
  isConnected,
  isCorrectChain,
  isVerifying,
  verified,
  onClick,
  disabled = false,
  className = '',
  error
}) => {
  
  // Get profile-specific text and metadata
  const getProfileConfig = () => {
    if (profileType === 'universal_profile') {
      return {
        walletName: 'Universal Profile',
        chainName: 'LUKSO',
      };
    }
    return {
      walletName: 'Ethereum Wallet',
      chainName: 'Ethereum Mainnet',
    };
  };
  
  const profileConfig = getProfileConfig();
  
  // ===== BUTTON STATE LOGIC =====
  
  const getButtonConfig = () => {
    // Override state based on actual conditions
    let actualState = state;
    
    // Special handling for preview mode - don't override this state
    if (state === 'preview_mode_complete') {
      actualState = 'preview_mode_complete';
    } else if (!isConnected) {
      actualState = 'wallet_not_connected';
    } else if (!isCorrectChain) {
      actualState = 'wrong_network';
    } else if (isVerifying) {
      actualState = 'verifying';
    } else if (verified) {
      actualState = 'verification_complete';
    } else if (error && (state === 'verification_error_pending' || state === 'verification_failed')) {
      actualState = state; // Keep the pending/failed state as passed
    } else if (state === 'verification_success_pending') {
      actualState = 'verification_success_pending'; // Keep the success pending state
    } else if (!allRequirementsMet) {
      actualState = 'requirements_not_met';
    } else {
      actualState = 'ready_to_verify';
    }
    
    switch (actualState) {
      case 'wallet_not_connected':
        return {
          text: `Connect ${profileConfig.walletName}`,
          icon: <Wallet className="h-4 w-4 mr-2" />,
          variant: 'default' as const,
          disabled: disabled,
          clickable: true
        };
        
      case 'wrong_network':
        return {
          text: `Switch to ${profileConfig.chainName}`,
          icon: <AlertTriangle className="h-4 w-4 mr-2" />,
          variant: 'destructive' as const,
          disabled: disabled,
          clickable: true
        };
        
      case 'requirements_not_met':
        return {
          text: 'Requirements Not Met',
          icon: <XCircle className="h-4 w-4 mr-2" />,
          variant: 'secondary' as const,
          disabled: true,
          clickable: false
        };
        
      case 'ready_to_verify':
        return {
          text: 'Complete Verification',
          icon: <CheckCircle className="h-4 w-4 mr-2" />,
          variant: 'default' as const,
          disabled: disabled,
          clickable: true
        };
        
      case 'verifying':
        return {
          text: 'Verifying Requirements...',
          icon: <Loader2 className="h-4 w-4 mr-2 animate-spin" />,
          variant: 'default' as const,
          disabled: true,
          clickable: false
        };
        
      case 'verification_complete':
        return {
          text: 'Verification Complete',
          icon: <CheckCircle className="h-4 w-4 mr-2" />,
          variant: 'default' as const,
          disabled: true,
          clickable: false
        };
        
      case 'verification_failed':
        return {
          text: error || 'Verification Failed',
          icon: <XCircle className="h-4 w-4 mr-2" />,
          variant: 'destructive' as const,
          disabled: disabled,
          clickable: true
        };
        
      case 'verification_success_pending':
        return {
          text: 'Verification Submitted ✓',
          icon: <CheckCircle className="h-4 w-4 mr-2" />,
          variant: 'default' as const,
          disabled: true,
          clickable: false
        };
        
      case 'verification_error_pending':
        return {
          text: error || 'Verification Failed',
          icon: <XCircle className="h-4 w-4 mr-2" />,
          variant: 'destructive' as const,
          disabled: disabled,
          clickable: true
        };
        
      case 'preview_mode_complete':
        return {
          text: 'Preview Complete ✓',
          icon: <CheckCircle className="h-4 w-4 mr-2" />,
          variant: 'secondary' as const,
          disabled: true,
          clickable: false
        };
        
      default:
        return {
          text: 'Verify Requirements',
          icon: <CheckCircle className="h-4 w-4 mr-2" />,
          variant: 'default' as const,
          disabled: disabled,
          clickable: true
        };
    }
  };

  const buttonConfig = getButtonConfig();

  // ===== RENDER =====

  return (
    <Button
      onClick={buttonConfig.clickable ? onClick : undefined}
      disabled={buttonConfig.disabled}
      variant={buttonConfig.variant}
      className={`w-full ${className}`}
      size="sm"
    >
      {buttonConfig.icon}
      {buttonConfig.text}
    </Button>
  );
}; 