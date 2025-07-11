/**
 * Global Type Declarations for Curia Host Service
 * 
 * Defines types for browser wallet objects and other global interfaces
 */

// Ethereum provider (MetaMask, etc.)
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  chainId?: string;
  selectedAddress?: string;
}

// Universal Profile provider (LUKSO)
interface LuksoProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  isUniversalProfile?: boolean;
  chainId?: string;
  selectedAddress?: string;
}

// Extend the global Window interface
declare global {
  interface Window {
    ethereum?: EthereumProvider;
    lukso?: LuksoProvider;
  }
}

// Common wallet request parameters
interface WalletRequestAccounts {
  method: 'eth_requestAccounts';
  params?: never;
}

interface WalletPersonalSign {
  method: 'personal_sign';
  params: [string, string]; // [message, address]
}

interface WalletGetBalance {
  method: 'eth_getBalance';
  params: [string, string]; // [address, block]
}

// Export empty object to make this a module
export {}; 