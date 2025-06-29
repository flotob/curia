/**
 * UP Verification Wrapper Component
 * 
 * Provides wagmi context and renders UP verification using the reusable hook.
 * This wrapper eliminates the need for duplicate wagmi setup across components.
 */

'use client';

import React from 'react';
import {
  WagmiProvider,
  createConfig,
  http,
  createStorage,
} from 'wagmi';
import { lukso, luksoTestnet } from 'viem/chains';
import { universalProfileConnector } from '@/lib/wagmi/connectors/universalProfile';
import { UPGatingRequirements, GatingCategoryStatus } from '@/types/gating';
import { UniversalProfileGatingPanel } from '../gating/UniversalProfileGatingPanel';
import { Button } from '@/components/ui/button';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { Wallet } from 'lucide-react';

// ===== WAGMI CONFIG =====

const noopStorage = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getItem: (_key: string): string | null => null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setItem: (_key: string, _value: string): void => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeItem: (_key: string): void => {},
};

// Create different configs for different contexts to avoid conflicts
export const createUPWagmiConfig = (storageKey: string = 'wagmi_up_verification') => {
  return createConfig({
    chains: [lukso, luksoTestnet],
    connectors: [universalProfileConnector()],
    storage: createStorage({
      storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
      key: storageKey,
    }),
    transports: {
      [lukso.id]: http(),
      [luksoTestnet.id]: http(),
    },
    ssr: true,
  });
};

// ===== INTERFACES =====

export interface UPVerificationWrapperProps {
  requirements: UPGatingRequirements;
  fulfillment: "any" | "all"; // Fulfillment is now mandatory
  onStatusUpdate: (status: GatingCategoryStatus) => void; // Callback is now mandatory
  postId?: number;
  isPreviewMode?: boolean;
  onVerificationComplete?: () => void;
  storageKey?: string;
  verificationContext?: {
    type: 'board' | 'post' | 'preview';
    communityId?: string;
    boardId?: number;
    postId?: number;
    lockId?: number;
  };
}

// ===== INTERNAL COMPONENT (uses hooks) =====

type UPVerificationInternalProps = Omit<UPVerificationWrapperProps, 'storageKey'>;

const UPVerificationInternal: React.FC<UPVerificationInternalProps> = ({
  requirements,
  fulfillment,
  onStatusUpdate,
  postId,
  isPreviewMode,
  onVerificationComplete,
}) => {
  const { upAddress, connect, isConnecting } = useUniversalProfile();

  if (!upAddress) {
    return (
      <div className="text-center p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect your Universal Profile to see the requirements.
        </p>
        <Button onClick={() => connect()} disabled={isConnecting}>
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? 'Connecting...' : 'Connect Universal Profile'}
        </Button>
      </div>
    );
  }

  return (
    <UniversalProfileGatingPanel 
      requirements={requirements} 
      fulfillment={fulfillment}
      onStatusUpdate={onStatusUpdate}
      postId={postId}
      isPreviewMode={isPreviewMode}
      onVerificationComplete={onVerificationComplete}
    />
  );
};

// ===== MAIN WRAPPER COMPONENT =====

export const UPVerificationWrapper: React.FC<UPVerificationWrapperProps> = ({
  storageKey,
  ...props
}) => {
  const config = React.useMemo(
    () => createUPWagmiConfig(storageKey),
    [storageKey]
  );

  return (
    <WagmiProvider config={config}>
      <UPVerificationInternal {...props} />
    </WagmiProvider>
  );
}; 