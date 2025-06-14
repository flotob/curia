import { createConnector } from 'wagmi';
import { getAddress } from 'viem';

/**
 * Minimal EIP-1193-compatible provider interface exposed by the
 * Universal Profile browser extension.
 */
interface LuksoProvider {
  request(args: { method: 'eth_requestAccounts' | 'eth_accounts' }): Promise<string[]>;
  request(args: { method: 'eth_chainId' }): Promise<string>;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: 'accountsChanged' | 'chainChanged' | 'disconnect', listener: (...args: unknown[]) => void): void;
  removeListener?(event: 'accountsChanged' | 'chainChanged' | 'disconnect', listener: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    lukso?: LuksoProvider;
  }
}

export function universalProfileConnector() {
  return createConnector<LuksoProvider | undefined>((config) => {
    let provider: LuksoProvider | undefined;

    // --- Helper listeners --------------------------------------------------
    const onAccountsChanged = (accounts: string[]) => {
      const normalized = accounts.map((addr) => getAddress(addr));
      config.emitter.emit('change', { accounts: normalized });
    };

    const onChainChanged = (chainIdHex: string) => {
      const chainId = Number(chainIdHex);
      config.emitter.emit('change', { chainId });
    };

    const onDisconnect = () => {
      config.emitter.emit('disconnect');
    };

    // ----------------------------------------------------------------------
    return {
      id: 'universalProfile',
      name: 'Universal Profile',
      type: 'injected',

      async getProvider() {
        if (typeof window === 'undefined') return undefined;
        if (!provider) {
          provider = (window as Window).lukso;
          // If the extension injects the provider under a different key we could
          // extend the detection logic here.
        }
        return provider;
      },

      async connect() {
        const _provider = await this.getProvider();
        if (!_provider) throw new Error('LUKSO Universal Profile Extension not found');

        const accounts = (await _provider.request({ method: 'eth_requestAccounts' })) as string[];
        const firstAccount = accounts?.[0];
        if (!firstAccount) throw new Error('No accounts returned from LUKSO provider');

        const account = getAddress(firstAccount);
        const chainIdHex = (await _provider.request({ method: 'eth_chainId' })) as string;
        const chainId = Number(chainIdHex);

        _provider.on?.('accountsChanged', onAccountsChanged as (...args: unknown[]) => void);
        _provider.on?.('chainChanged', onChainChanged as (...args: unknown[]) => void);
        _provider.on?.('disconnect', onDisconnect as (...args: unknown[]) => void);

        return { accounts: [account], chainId };
      },

      async disconnect() {
        const _provider = await this.getProvider();
        _provider?.removeListener?.('accountsChanged', onAccountsChanged as (...args: unknown[]) => void);
        _provider?.removeListener?.('chainChanged', onChainChanged as (...args: unknown[]) => void);
        _provider?.removeListener?.('disconnect', onDisconnect as (...args: unknown[]) => void);
      },

      async getAccounts() {
        const _provider = await this.getProvider();
        if (!_provider) return [];
        const accounts = (await _provider.request({ method: 'eth_accounts' })) as string[];
        return accounts.map((addr) => getAddress(addr));
      },

      async getChainId() {
        const _provider = await this.getProvider();
        if (!_provider) throw new Error('LUKSO provider not found');
        const chainIdHex = (await _provider.request({ method: 'eth_chainId' })) as string;
        return Number(chainIdHex);
      },

      async isAuthorized() {
        const accounts = await this.getAccounts();
        return accounts.length > 0;
      },

      // expose the listener functions so wagmi's internal typings that
      // expect them on the connector object are satisfied
      onAccountsChanged,
      onChainChanged,
      onDisconnect,
    };
  });
} 