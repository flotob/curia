'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CgLibProvider } from '@/contexts/CgLibContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';
import { ConditionalUniversalProfileProvider } from '@/contexts/ConditionalUniversalProfileProvider';
import { AppInitializer } from '@/components/AppInitializer';

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

  // Only UP provider at app level - Ethereum wagmi contexts are created per-component
  return (
    <ConditionalUniversalProfileProvider>
      {children}
    </ConditionalUniversalProfileProvider>
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
                {children}
              </SocketProvider>
            </WalletProviders>
          </GlobalSearchProvider>
        </AuthProvider>
      </CgLibProvider>
    </QueryClientProvider>
  );
} 