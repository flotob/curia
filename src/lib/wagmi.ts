/**
 * Wagmi Configuration with RainbowKit
 * 
 * Configures wagmi with RainbowKit for improved wallet connection UX
 * Used by the Ethereum gating system for ENS/EFP verification
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id';

// Create config safely - only in browser environment
export const wagmiConfig = (() => {
  // Prevent SSR issues by only creating config in browser
  if (typeof window === 'undefined') {
    return null;
  }

  return getDefaultConfig({
    appName: 'Curia',
    projectId,
    chains: [mainnet],
    ssr: true, // Enable SSR support for Next.js
  });
})();

// Export for type inference
export type Config = typeof wagmiConfig;

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
} 