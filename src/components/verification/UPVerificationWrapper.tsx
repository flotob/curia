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
import { UPGatingRequirements } from '@/types/gating';
import { ensureRegistered } from '@/lib/gating/categoryRegistry';
import { useUPVerificationData } from '@/hooks/useUPVerificationData';

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
  postId,
  isPreviewMode = false,
  onVerificationComplete,
  verificationContext,
}) => {
  const {
    userStatus,
    isLoading,
    error,
    connect,
    disconnect,
  } = useUPVerificationData(requirements, {
    enabled: true,
    isPreviewMode,
  });

  const renderer = ensureRegistered('universal_profile');

  const handleConnect = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    
    try {
      await connect();
    } catch (error) {
      console.error('[UPVerificationWrapper] Connection failed:', error);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
        <p className="font-medium">Universal Profile Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return renderer.renderConnection({
    requirements,
    onConnect: handleConnect,
    onDisconnect: disconnect,
    userStatus,
    disabled: isLoading,
    postId: postId,
    isPreviewMode: isPreviewMode,
    onVerificationComplete: onVerificationComplete,
    verificationContext: verificationContext,
  });
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