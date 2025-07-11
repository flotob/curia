/**
 * Isolated Authentication Flow Component
 * 
 * Uses the proven TippingModal pattern:
 * - Provider wrapper + internal component architecture
 * - Local provider scope (no global wallet state)
 * - Both Universal Profile and Ethereum support
 * - Clean hook interfaces like main forum app
 * - "Moment of delight" profile display step after connection
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useUniversalProfile } from '../../contexts/UniversalProfileContext';
import { useEthereumProfile } from '../../contexts/EthereumProfileContext';
import { UniversalProfileProvider } from '../../contexts/UniversalProfileContext';
import { EthereumProfileProvider } from '../../contexts/EthereumProfileContext';
import { getUPSocialProfile, UPSocialProfile } from '../../lib/upProfile';
import { UPProfileDisplay } from '../universal-profile/UPProfileDisplay';
import { EthereumProfileDisplay } from '../ethereum/EthereumProfileDisplay';

// ===== TYPES =====

export interface AuthenticationResult {
  success: boolean;
  identityType: 'universal_profile' | 'ens' | 'anonymous';
  address?: string;
  displayName?: string;
  sessionToken?: string;
  profile?: UPSocialProfile;
  error?: string;
}

export interface AuthenticationFlowProps {
  onAuthenticationComplete: (result: AuthenticationResult) => void;
  allowAnonymous?: boolean;
  className?: string;
}

type FlowStep = 'connection' | 'profile_display';
type ConnectedWalletType = 'universal_profile' | 'ethereum' | null;

// ===== INTERNAL COMPONENT (INSIDE PROVIDERS) =====

const AuthenticationFlowContent: React.FC<{
  onAuthenticationComplete: (result: AuthenticationResult) => void;
  allowAnonymous?: boolean;
  className?: string;
}> = ({ onAuthenticationComplete, allowAnonymous = true, className = '' }) => {
  
  // 🚀 PROVEN PATTERN: Clean hook interfaces like TippingModal
  const { upAddress, isConnecting: upConnecting, connect: connectUP, disconnect: disconnectUP } = useUniversalProfile();
  const { ethAddress, isConnecting: ethConnecting, isConnected: ethConnected, getENSProfile, disconnect: disconnectEth } = useEthereumProfile();
  
  const [flowStep, setFlowStep] = useState<FlowStep>('connection');
  const [connectedWalletType, setConnectedWalletType] = useState<ConnectedWalletType>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ensProfile, setEnsProfile] = useState<{ name?: string; avatar?: string }>({});

  // ===== STEP MANAGEMENT =====
  
  // Auto-advance to profile display when wallet connects
  useEffect(() => {
    if (upAddress && flowStep === 'connection') {
      setConnectedWalletType('universal_profile');
      setFlowStep('profile_display');
    } else if (ethConnected && ethAddress && flowStep === 'connection') {
      setConnectedWalletType('ethereum');
      setFlowStep('profile_display');
      
      // Fetch ENS profile data
      getENSProfile().then(profile => {
        setEnsProfile(profile);
      }).catch(err => {
        console.error('[AuthenticationFlow] Failed to fetch ENS profile:', err);
        setEnsProfile({});
      });
    }
  }, [upAddress, ethConnected, ethAddress, flowStep, getENSProfile]);

  // ===== WALLET SWITCHING =====
  
  const handleSwitchWallet = useCallback(() => {
    // Disconnect current wallet and return to connection step
    if (connectedWalletType === 'universal_profile') {
      disconnectUP();
    } else if (connectedWalletType === 'ethereum') {
      disconnectEth();
      setEnsProfile({});
    }
    
    setConnectedWalletType(null);
    setFlowStep('connection');
    setError(null);
  }, [connectedWalletType, disconnectUP, disconnectEth]);

  // ===== AUTHENTICATION =====
  
  const handleContinue = useCallback(async () => {
    if (!connectedWalletType) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      if (connectedWalletType === 'universal_profile' && upAddress) {
        console.log('[AuthenticationFlow] Authenticating Universal Profile:', upAddress);

        // Fetch profile data
        const profile = await getUPSocialProfile(upAddress);
        
        // Step 1: Generate challenge from backend
        const challengeResponse = await fetch('/api/auth/generate-challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identityType: 'universal_profile',
            upAddress
          })
        });

        if (!challengeResponse.ok) {
          throw new Error('Failed to generate authentication challenge');
        }

        const { challenge, message } = await challengeResponse.json();
        console.log('[AuthenticationFlow] Generated challenge for UP:', challenge);

        // Step 2: Sign the message with UP extension
        // TODO: Implement actual UP message signing
        // For now, simulate signature (this needs UP extension integration)
        const signature = `mock_signature_${Date.now()}`;
        
        // Step 3: Verify signature with backend and create session
        const verifyResponse = await fetch('/api/auth/verify-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identityType: 'universal_profile',
            upAddress,
            challenge,
            signature,
            message
          })
        });

        if (!verifyResponse.ok) {
          throw new Error(`Authentication failed: ${verifyResponse.statusText}`);
        }

        const { user, session } = await verifyResponse.json();
        console.log('[AuthenticationFlow] UP authentication successful:', user);

        // Create successful result with real session token
        const result: AuthenticationResult = {
          success: true,
          identityType: 'universal_profile',
          address: upAddress,
          displayName: profile.displayName,
          profile,
          sessionToken: session.session_token
        };

        console.log('[AuthenticationFlow] UP authentication successful:', result);
        onAuthenticationComplete(result);

      } else if (connectedWalletType === 'ethereum' && ethAddress) {
        console.log('[AuthenticationFlow] Authenticating Ethereum/ENS:', ethAddress);

        // Step 1: Generate challenge from backend
        const challengeResponse = await fetch('/api/auth/generate-challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identityType: 'ens',
            walletAddress: ethAddress,
            ensName: ensProfile.name || `${ethAddress.slice(0, 6)}...${ethAddress.slice(-4)}`
          })
        });

        if (!challengeResponse.ok) {
          throw new Error('Failed to generate authentication challenge');
        }

        const { challenge, message } = await challengeResponse.json();
        console.log('[AuthenticationFlow] Generated challenge for ENS:', challenge);

        // Step 2: Sign the message with wallet
        // TODO: Implement actual wallet message signing
        // For now, simulate signature (this needs wallet integration)
        const signature = `mock_signature_${Date.now()}`;
        
        // Step 3: Verify signature with backend and create session
        const verifyResponse = await fetch('/api/auth/verify-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identityType: 'ens',
            walletAddress: ethAddress,
            ensName: ensProfile.name,
            challenge,
            signature,
            message
          })
        });

        if (!verifyResponse.ok) {
          throw new Error(`Authentication failed: ${verifyResponse.statusText}`);
        }

        const { user, session } = await verifyResponse.json();
        console.log('[AuthenticationFlow] ENS authentication successful:', user);

        // Create successful result with real session token
        const result: AuthenticationResult = {
          success: true,
          identityType: 'ens',
          address: ethAddress,
          displayName: ensProfile.name || user.name || `${ethAddress.slice(0, 6)}...${ethAddress.slice(-4)}`,
          sessionToken: session.session_token
        };

        console.log('[AuthenticationFlow] Ethereum authentication successful:', result);
        onAuthenticationComplete(result);
      }

    } catch (error) {
      console.error('[AuthenticationFlow] Authentication failed:', error);
      const result: AuthenticationResult = {
        success: false,
        identityType: connectedWalletType === 'universal_profile' ? 'universal_profile' : 'ens',
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
      onAuthenticationComplete(result);
    } finally {
      setIsAuthenticating(false);
    }
  }, [connectedWalletType, upAddress, ethAddress, ensProfile, onAuthenticationComplete]);

  // ===== ANONYMOUS AUTHENTICATION =====
  
  const handleAnonymousAuthentication = useCallback(async () => {
    console.log('[AuthenticationFlow] Creating anonymous session');
    
    try {
      // Call backend API to create anonymous user session
      const response = await fetch('/api/auth/create-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: window.location.origin
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create anonymous session: ${response.statusText}`);
      }

      const { user, session } = await response.json();
      console.log('[AuthenticationFlow] Anonymous session created:', user);

      const result: AuthenticationResult = {
        success: true,
        identityType: 'anonymous',
        displayName: 'Anonymous User',
        sessionToken: session.session_token
      };

      onAuthenticationComplete(result);
    } catch (error) {
      console.error('[AuthenticationFlow] Anonymous authentication failed:', error);
      const result: AuthenticationResult = {
        success: false,
        identityType: 'anonymous',
        error: error instanceof Error ? error.message : 'Anonymous authentication failed'
      };
      onAuthenticationComplete(result);
    }
  }, [onAuthenticationComplete]);

  // ===== RENDER =====

  const isConnecting = upConnecting || ethConnecting || isAuthenticating;

  // Profile Display Step
  if (flowStep === 'profile_display') {
    if (connectedWalletType === 'universal_profile' && upAddress) {
      return (
        <div className={`space-y-6 ${className}`}>
          <UPProfileDisplay
            address={upAddress}
            onSwitchWallet={handleSwitchWallet}
            onContinue={handleContinue}
          />
        </div>
      );
    }

    if (connectedWalletType === 'ethereum' && ethAddress) {
      return (
        <div className={`space-y-6 ${className}`}>
          <EthereumProfileDisplay
            address={ethAddress}
            ensName={ensProfile.name}
            ensAvatar={ensProfile.avatar}
            onSwitchWallet={handleSwitchWallet}
            onContinue={handleContinue}
          />
        </div>
      );
    }
  }

  // Connection Step (default)
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Welcome to Curia</h2>
        <p className="mt-2 text-gray-600">Choose your preferred way to sign in</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Universal Profile Option */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Universal Profile</h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect with your LUKSO Universal Profile for rich social features
          </p>
          
          <button
            onClick={connectUP}
            disabled={isConnecting}
            className="w-full border border-emerald-600 text-emerald-600 px-4 py-2 rounded-md hover:bg-emerald-50 disabled:opacity-50"
          >
            {upConnecting ? 'Connecting...' : 'Connect Universal Profile'}
          </button>
        </div>

        {/* Ethereum/ENS Option */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Ethereum / ENS</h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect with any Ethereum wallet or ENS domain
          </p>
          
          <div className="space-y-2">
            <ConnectButton.Custom>
              {({ openConnectModal, connectModalOpen }) => (
                <button
                  onClick={openConnectModal}
                  disabled={connectModalOpen || isConnecting}
                  className="w-full border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {connectModalOpen ? 'Connecting...' : 'Connect Ethereum Wallet'}
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        </div>

        {/* Anonymous Option */}
        {allowAnonymous && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Continue as Guest</h3>
            <p className="text-sm text-gray-600 mb-4">
              Browse anonymously without wallet connection
            </p>
            <button
              onClick={handleAnonymousAuthentication}
              disabled={isConnecting}
              className="w-full border border-gray-400 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Continue as Guest
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT WITH PROVIDERS (TIPPING MODAL PATTERN) =====

export const AuthenticationFlow: React.FC<AuthenticationFlowProps> = (props) => {
  return (
    <UniversalProfileProvider>
      <EthereumProfileProvider storageKey="host_service_auth_ethereum">
        <AuthenticationFlowContent {...props} />
      </EthereumProfileProvider>
    </UniversalProfileProvider>
  );
}; 