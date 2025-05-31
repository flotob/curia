import { useConnect, useDisconnect, useAccount, useConnectors } from 'wagmi'
import { Hooks } from 'porto/wagmi'
import { useCallback, useMemo } from 'react'
import type { Connector } from 'wagmi'

export type WalletType = 'metamask' | 'porto' | 'unknown'

export function useWalletConnection() {
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, isConnected, connector } = useAccount()
  const connectors = useConnectors()
  
  // Porto-specific hooks
  const portoConnect = Hooks.useConnect()
  const portoCreateAccount = Hooks.useCreateAccount()

  const availableWallets = useMemo(() => {
    const wallets: Array<{ type: WalletType, name: string, connector: Connector }> = []
    
    connectors.forEach(conn => {
      if (conn.name.toLowerCase().includes('metamask')) {
        wallets.push({ type: 'metamask', name: 'MetaMask', connector: conn })
      } else if (conn.name.toLowerCase().includes('porto')) {
        wallets.push({ type: 'porto', name: 'Porto (No Extension)', connector: conn })
      } else {
        wallets.push({ type: 'unknown', name: conn.name, connector: conn })
      }
    })
    
    return wallets
  }, [connectors])

  const connectWallet = useCallback(async (walletType: WalletType) => {
    const wallet = availableWallets.find(w => w.type === walletType)
    if (!wallet) throw new Error(`Wallet type ${walletType} not found`)

    if (walletType === 'porto') {
      // For Porto, might need to create account first if new user
      try {
        await portoConnect.mutateAsync({ connector: wallet.connector })
      } catch {
        // If connection fails, try creating account first
        await portoCreateAccount.mutateAsync({ connector: wallet.connector })
        await portoConnect.mutateAsync({ connector: wallet.connector })
      }
    } else {
      await connect({ connector: wallet.connector })
    }
  }, [availableWallets, connect, portoConnect, portoCreateAccount])

  const getWalletType = useCallback((): WalletType => {
    if (!connector) return 'unknown'
    const name = connector.name.toLowerCase()
    if (name.includes('metamask')) return 'metamask'
    if (name.includes('porto')) return 'porto'
    return 'unknown'
  }, [connector])

  return {
    // Connection state
    address,
    isConnected,
    walletType: getWalletType(),
    
    // Available options
    availableWallets,
    
    // Actions
    connectWallet,
    disconnect,
    
    // Porto-specific
    isPortoAvailable: availableWallets.some(w => w.type === 'porto'),
    isMetaMaskAvailable: availableWallets.some(w => w.type === 'metamask'),
  }
} 