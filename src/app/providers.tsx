'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { AuthProvider } from '@/contexts/AuthContext';
import { CgLibProvider } from '@/contexts/CgLibContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';
import { ConditionalUniversalProfileProvider } from '@/contexts/ConditionalUniversalProfileProvider';
import { ConditionalEthereumProvider } from '@/contexts/EthereumProfileContext';
import { AppInitializer } from '@/components/AppInitializer';
import { wagmiConfig } from '@/lib/wagmi';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional, for development

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

interface ProvidersProps {
  children: React.ReactNode;
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global default options for queries can go here
      // For example, staleTime, gcTime (previously cacheTime)
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes 
    },
  },
});

// Client-only wrapper for wallet providers
function WalletProviders({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render wallet providers during SSR
  if (!isMounted) {
    return <>{children}</>;
  }

  // Isolate the two wallet systems to prevent cross-contamination
  // UP provider runs standalone, Ethereum provider is conditionally mounted
  return (
    <ConditionalUniversalProfileProvider>
      <ConditionalWagmiProvider>
        {children}
      </ConditionalWagmiProvider>
    </ConditionalUniversalProfileProvider>
  );
}

// Conditional Wagmi Provider - only mounts when Ethereum gating is detected
function ConditionalWagmiProvider({ children }: { children: React.ReactNode }) {
  // TODO: Detect if Ethereum gating is needed
  // For now, always mount since we don't have gating detection at this level
  // This will be improved when we implement proper gating detection
  
  if (!wagmiConfig) {
    return (
      <ConditionalEthereumProvider enabled={false}>
        {children}
      </ConditionalEthereumProvider>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider>
        <ConditionalEthereumProvider enabled>
          {children}
        </ConditionalEthereumProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <CgLibProvider>
        <AuthProvider>
          <GlobalSearchProvider>
            <WalletProviders>
              <SocketProvider>
                <AppInitializer />
                {/* Children are now effectively inside QueryClientProvider through SocketProvider etc. */}
                {children}
                {/* <ReactQueryDevtools initialIsOpen={false} /> */}
              </SocketProvider>
            </WalletProviders>
          </GlobalSearchProvider>
        </AuthProvider>
      </CgLibProvider>
    </QueryClientProvider>
  );
} 