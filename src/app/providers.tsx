'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { AuthProvider } from '@/contexts/AuthContext';
import { CgLibProvider } from '@/contexts/CgLibContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';
import { ConditionalUniversalProfileProvider } from '@/contexts/ConditionalUniversalProfileProvider';
import { ConditionalEthereumProvider } from '@/contexts/EthereumProfileContext';
import { AppInitializer } from '@/components/AppInitializer';
import { wagmiConfig } from '@/lib/wagmi';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional, for development

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

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <CgLibProvider>
          <AuthProvider>
            <GlobalSearchProvider>
              <ConditionalUniversalProfileProvider>
                <ConditionalEthereumProvider enabled>
                  <SocketProvider>
                    <AppInitializer />
                    {/* Children are now effectively inside QueryClientProvider through SocketProvider etc. */}
                    {children}
                    {/* <ReactQueryDevtools initialIsOpen={false} /> */}
                  </SocketProvider>
                </ConditionalEthereumProvider>
              </ConditionalUniversalProfileProvider>
            </GlobalSearchProvider>
          </AuthProvider>
        </CgLibProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
} 