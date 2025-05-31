import { http, createConfig, createStorage } from 'wagmi'
import { gnosis } from 'wagmi/chains'
import { metaMask, injected } from '@wagmi/connectors'

// Initialize Porto only on client side with iframe context awareness
if (typeof window !== 'undefined') {
  import('porto').then(({ Porto }) => {
    // Check if we're in an iframe context for debugging
    const isInIframe = window.self !== window.top;
    
    // Check WebAuthn availability
    const hasWebAuthn = 'credentials' in navigator && 'create' in navigator.credentials;
    
    if (isInIframe) {
      console.log('[Porto] Initializing in iframe context - may have limitations');
      console.log('[Porto] WebAuthn available:', hasWebAuthn);
      
      // Test if passkey creation is actually allowed
      if (hasWebAuthn) {
        // Quick test to see if credential creation would work
        navigator.permissions?.query({ name: 'publickey-credentials-create' as any })
          .then(result => {
            console.log('[Porto] Passkey creation permission:', result.state);
            if (result.state === 'denied') {
              console.warn('[Porto] Passkey creation blocked - Porto account creation may fail');
            }
          })
          .catch(() => {
            console.log('[Porto] Unable to check passkey permissions');
          });
      }
    }
    
    Porto.create()
  }).catch((error) => {
    console.error('Failed to initialize Porto:', error);
    // Graceful fallback - continue without Porto
  })
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