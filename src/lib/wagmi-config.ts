import { http, createConfig, createStorage } from 'wagmi'
import { gnosis } from 'wagmi/chains'
import { metaMask, injected } from '@wagmi/connectors'

// Initialize Porto only on client side
if (typeof window !== 'undefined') {
  import('porto').then(({ Porto }) => {
    Porto.create()
  }).catch(console.error)
}

export const wagmiConfig = createConfig({
  chains: [gnosis],
  connectors: [
    metaMask(), // MetaMask connector
    injected(), // Generic injected connector (will pick up Porto)
  ],
  storage: typeof window !== 'undefined' 
    ? createStorage({ 
        storage: localStorage,
        key: 'curia-wagmi-cache'
      })
    : undefined, // Use undefined storage for SSR
  transports: {
    [gnosis.id]: http(process.env.NEXT_PUBLIC_GNOSIS_RPC_URL || 'https://rpc.gnosischain.com'),
  },
}) 