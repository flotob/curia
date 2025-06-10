/**
 * Wagmi Configuration
 * 
 * Configures wagmi for Ethereum wallet connection and blockchain interactions
 * Used by the Ethereum gating system for ENS/EFP verification
 */

import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected, walletConnect, metaMask, coinbaseWallet } from 'wagmi/connectors';

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id';
const ethereumRpcUrl = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://cloudflare-eth.com';

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId,
      metadata: {
        name: 'Curia',
        description: 'Community governance and discussions',
        url: 'https://curia.app',
        icons: ['https://curia.app/favicon.ico']
      }
    }),
    coinbaseWallet({
      appName: 'Curia',
      appLogoUrl: 'https://curia.app/favicon.ico'
    })
  ],
  transports: {
    [mainnet.id]: http(ethereumRpcUrl)
  },
  ssr: true, // Enable SSR support for Next.js
});

// Export for type inference
export type Config = typeof wagmiConfig;

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
} 