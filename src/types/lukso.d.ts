/**
 * TypeScript declarations for LUKSO Universal Profile extension
 * The UP extension injects window.lukso with EIP-1193 provider interface
 */

interface LuksoProvider {
  // EIP-1193 methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request(args: { method: string; params?: any[] }): Promise<any>;
  
  // Event handling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener(event: string, handler: (...args: any[]) => void): void;
  
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