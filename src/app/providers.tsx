'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CgLibProvider } from '@/contexts/CgLibContext';
import { WagmiContextProvider } from '@/contexts/WagmiContext';
import { AppInitializer } from '@/components/AppInitializer';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional, for development

interface ProvidersProps {
  children: React.ReactNode;
}

// Create a client for non-Wagmi queries
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
    <WagmiContextProvider>
      <CgLibProvider>
        <AuthProvider>
          <AppInitializer />
          <QueryClientProvider client={queryClient}>
            {children}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </QueryClientProvider>
        </AuthProvider>
      </CgLibProvider>
    </WagmiContextProvider>
  );
} 