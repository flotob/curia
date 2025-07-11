/**
 * Isolated Ethereum Wagmi Provider
 * 
 * Provides wagmi context specifically for Ethereum verification components.
 * Each component that needs Ethereum verification can wrap itself with this provider
 * to get isolated wagmi context without conflicts with UP verification.
 */

'use client';

import React, { useMemo } from 'react';
import { WagmiProvider, createStorage } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

interface EthereumWagmiProviderProps {
  children: React.ReactNode;
  storageKey?: string;
}

// Create isolated Ethereum wagmi config
const createEthereumWagmiConfig = (storageKey: string = 'wagmi_ethereum') => {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id';
  
  return getDefaultConfig({
    appName: 'Curia Host Service',
    projectId,
    chains: [mainnet],
    ssr: true,
    storage: createStorage({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      key: storageKey,
    }),
  });
};

// Themed RainbowKit Provider (simplified without theme detection for host service)
function ThemedRainbowKitProvider({ children }: { children: React.ReactNode }) {
  const customTheme = lightTheme({
    accentColor: '#3b82f6',
    accentColorForeground: 'white', 
    borderRadius: 'medium',
    fontStack: 'system',
    overlayBlur: 'small',
  });

  return (
    <RainbowKitProvider 
      theme={customTheme}
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}

export const EthereumWagmiProvider: React.FC<EthereumWagmiProviderProps> = ({
  children,
  storageKey = 'host_service_ethereum'
}) => {
  const config = useMemo(() => createEthereumWagmiConfig(storageKey), [storageKey]);

  return (
    <WagmiProvider config={config}>
      <ThemedRainbowKitProvider>
        {children}
      </ThemedRainbowKitProvider>
    </WagmiProvider>
  );
}; 