'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CgLibProvider } from '@/contexts/CgLibContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { AppInitializer } from '@/components/AppInitializer';
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
      <CgLibProvider>
        <AuthProvider>
          <SocketProvider>
            <AppInitializer />
            {/* Children are now effectively inside QueryClientProvider through SocketProvider etc. */}
            {children}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </SocketProvider>
        </AuthProvider>
      </CgLibProvider>
    </QueryClientProvider>
  );
} 