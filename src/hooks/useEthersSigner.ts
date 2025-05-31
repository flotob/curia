import { useMemo } from 'react'
import { useWalletClient } from 'wagmi'
import { BrowserProvider } from 'ethers'

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient()

  return useMemo(() => {
    if (!walletClient) return null
    
    // Convert Wagmi's wallet client to ethers signer
    const provider = new BrowserProvider(walletClient)
    return provider.getSigner()
  }, [walletClient])
} 