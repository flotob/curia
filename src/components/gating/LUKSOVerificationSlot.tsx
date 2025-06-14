/**
 * LUKSO Verification Slot
 * 
 * Handles verification for universal_profile gating category.
 * Users connect their Universal Profile and sign a challenge to verify requirements.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { UPGatingRequirements } from '@/types/gating';
import { useAuth } from '@/contexts/AuthContext';
import { useInvalidateVerificationStatus } from '@/hooks/useGatingData';
import { RichRequirementsDisplay, ExtendedVerificationStatus } from '@/components/gating/RichRequirementsDisplay';
// Wagmi and viem imports for isolated UP connection
import { WagmiProvider, createConfig, http, useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';
import { lukso, luksoTestnet } from 'viem/chains';
import { universalProfileConnector } from '@/lib/wagmi/connectors/universalProfile';

// Create a local, isolated wagmi config for the UP connector
const upConfig = createConfig({
  chains: [lukso, luksoTestnet],
  connectors: [universalProfileConnector()],
  transports: {
    [lukso.id]: http(),
    [luksoTestnet.id]: http(),
  },
});

interface LUKSOVerificationSlotProps {
  postId: number;
  requirements: unknown;
  currentStatus: 'not_started' | 'pending' | 'verified' | 'expired';
  onVerificationComplete?: () => void;
}

const LUKSOVerificationContent: React.FC<LUKSOVerificationSlotProps> = ({
  postId,
  requirements,
  currentStatus,
  onVerificationComplete
}) => {
  // ===== WAGMI HOOKS =====
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { data: balance } = useBalance({ address });

  // ===== OTHER HOOKS =====
  const { token } = useAuth();
  const invalidateVerificationStatus = useInvalidateVerificationStatus();

  // ===== STATE =====
  const [isVerifying] = useState(false);
  const [, setError] = useState<string | null>(null);

  // ===== REQUIREMENTS & CHAIN =====
  const upRequirements = requirements as UPGatingRequirements;
  const isCorrectChain = chain?.id === lukso.id || chain?.id === luksoTestnet.id;

  // ===== HANDLERS =====
  const handleConnect = useCallback(async () => {
    const upConnector = connectors.find(c => c.id === 'universalProfile');
    if (upConnector) {
      await connectAsync({ connector: upConnector });
    }
  }, [connectAsync, connectors]);

  // Placeholder for verification logic
  useCallback(() => {
    if (!isConnected || !address || !token) {
      setError('Please connect your Universal Profile first');
      return;
    }
    // ... (verification logic remains the same, but would need a wagmi-compatible signer)
  }, [isConnected, address, token, postId, invalidateVerificationStatus, onVerificationComplete]);

  // ===== RENDER LOGIC =====
  const extendedUserStatus: ExtendedVerificationStatus = {
    connected: isConnected && isCorrectChain,
    verified: currentStatus === 'verified',
    requirements: [],
    address: address,
    balances: {
      lyx: balance?.value,
      tokens: {},
    },
    followerStatus: {},
  };

  const upMetadata = {
    icon: '🆙',
    name: 'Universal Profile',
    brandColor: '#FE005B',
  };

  if (isConnected && !isCorrectChain) {
    // Simplified wrong network view for now
    return <div>Wrong Network. Please switch to LUKSO Mainnet or Testnet.</div>;
  }

  return (
    <div className="space-y-4">
      <RichRequirementsDisplay
        requirements={upRequirements}
        userStatus={extendedUserStatus}
        metadata={upMetadata}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        disabled={isVerifying || isConnecting}
        className="border-0"
      />
      {/* Verification button logic... */}
    </div>
  );
};

export const LUKSOVerificationSlot: React.FC<LUKSOVerificationSlotProps> = (props) => (
  <WagmiProvider config={upConfig}>
    <LUKSOVerificationContent {...props} />
  </WagmiProvider>
); 