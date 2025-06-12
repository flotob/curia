/**
 * Ethereum Smart Verification Button Component
 * 
 * Intelligent button that changes state based on:
 * - Wallet connection status
 * - Requirements verification status
 * - Loading/verification states
 * - Success/error states
 * 
 * Matches Universal Profile verification button patterns
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
  | 'verification_failed';

export interface EthereumSmartVerificationButtonProps {
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
  
  // ===== BUTTON STATE LOGIC =====
  
  const getButtonConfig = () => {
    // Override state based on actual conditions
    let actualState = state;
    
    if (!isConnected) {
      actualState = 'wallet_not_connected';
    } else if (!isCorrectChain) {
      actualState = 'wrong_network';
    } else if (isVerifying) {
      actualState = 'verifying';
    } else if (verified) {
      actualState = 'verification_complete';
    } else if (error) {
      actualState = 'verification_failed';
    } else if (!allRequirementsMet) {
      actualState = 'requirements_not_met';
    } else {
      actualState = 'ready_to_verify';
    }
    
    switch (actualState) {
      case 'wallet_not_connected':
        return {
          text: 'Connect Ethereum Wallet',
          icon: <Wallet className="h-4 w-4 mr-2" />,
          variant: 'default' as const,
          disabled: disabled,
          clickable: true
        };
        
      case 'wrong_network':
        return {
          text: 'Switch to Ethereum Mainnet',
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