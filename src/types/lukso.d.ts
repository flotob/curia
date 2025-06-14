/**
 * TypeScript declarations for LUKSO Universal Profile extension
 * The UP extension injects window.lukso with EIP-1193 provider interface
 */

interface LuksoProvider {
  // Overloads for common methods with precise return types
  request(args: { method: 'eth_requestAccounts' | 'eth_accounts' }): Promise<string[]>;
  request(args: { method: 'eth_chainId' }): Promise<string>;
  // Fallback overload for any other methods
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  
  // Event handling
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
  
  // Provider identification
  isUniversalProfile?: boolean;
  isLukso?: boolean;
  
  // Chain/account info
  chainId?: string;
  selectedAddress?: string;
}

declare global {
  interface Window {
    lukso?: LuksoProvider;
  }
}

export {}; 