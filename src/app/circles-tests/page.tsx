'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Sdk, circlesConfig, type Avatar } from '@circles-sdk/sdk';
import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';
import { Button } from '@/components/ui/button';
import { isAddress, getAddress, type Eip1193Provider } from 'ethers';
import { useAuth } from '@/contexts/AuthContext';

// Extend the Window interface for TypeScript to recognize window.ethereum
declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

// Type alias for Ethereum address format expected by Circles SDK
type EthereumAddress = `0x${string}`;

const GNOSIS_CHAIN_ID = 100;

export default function CirclesTestsPage() {
  const { token, isAuthenticated } = useAuth();
  const [sdkInstance, setSdkInstance] = useState<Sdk | null>(null);
  const [connectedEoaAddress, setConnectedEoaAddress] = useState<string | null>(null);
  const [userCirclesSafeAddress, setUserCirclesSafeAddress] = useState<string | null>(null);
  const [linkedCirclesSafeAddress, setLinkedCirclesSafeAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingSafe, setIsFetchingSafe] = useState<boolean>(false);
  const [isLinkingAddress, setIsLinkingAddress] = useState<boolean>(false);
  const [isCheckingLinkedAddress, setIsCheckingLinkedAddress] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const checkLinkedCirclesAddress = useCallback(async () => {
    if (!token) return;

    setIsCheckingLinkedAddress(true);
    try {
      const response = await fetch('/api/user/link-circles-identity', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedCirclesSafeAddress(data.circlesSafeAddress);
      } else {
        console.error('Failed to fetch linked Circles address:', await response.text());
      }
    } catch (error) {
      console.error('Error checking linked Circles address:', error);
    } finally {
      setIsCheckingLinkedAddress(false);
    }
  }, [token]);

  // Check for existing linked Circles address when component mounts
  useEffect(() => {
    if (isAuthenticated && token) {
      checkLinkedCirclesAddress();
    }
  }, [isAuthenticated, token, checkLinkedCirclesAddress]);

  const handleLinkCirclesAddress = useCallback(async () => {
    if (!token || !userCirclesSafeAddress) {
      setError('Authentication token or Circles Safe address not available.');
      return;
    }

    setIsLinkingAddress(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/user/link-circles-identity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          circlesSafeAddress: userCirclesSafeAddress,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedCirclesSafeAddress(data.circlesSafeAddress);
        setMessage('Circles Safe address linked to your Curia account successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to link Circles Safe address');
      }
    } catch (error) {
      console.error('Error linking Circles address:', error);
      setError('An error occurred while linking the Circles Safe address.');
    } finally {
      setIsLinkingAddress(false);
    }
  }, [token, userCirclesSafeAddress]);

  const handleConnectAndInitSdk = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    setSdkInstance(null);
    setConnectedEoaAddress(null);
    setUserCirclesSafeAddress(null);

    if (!window.ethereum) {
      setError('MetaMask (or another Ethereum wallet) is not installed. Please install it to continue.');
      setIsLoading(false);
      return;
    }

    try {
      setMessage('Connecting to wallet and initializing Circles SDK...');
      const adapter = new BrowserProviderContractRunner();
      await adapter.init();
      
      if (!adapter.address) {
        throw new Error('Failed to connect wallet or get address.');
      }
      setConnectedEoaAddress(adapter.address);
      setMessage(`Wallet connected: ${adapter.address}. Initializing SDK...`);

      const sdkConfig = circlesConfig[GNOSIS_CHAIN_ID];
      if (!sdkConfig) {
        throw new Error(`Circles configuration for Gnosis Chain (ID: ${GNOSIS_CHAIN_ID}) not found.`);
      }

      const sdk = new Sdk(adapter, sdkConfig);
      setSdkInstance(sdk);
      setMessage('Circles SDK initialized successfully! You can now try to get your Circles Safe address.');
      console.log('[CirclesTestsPage] Circles SDK initialized:', sdk);

    } catch (err: unknown) {
      console.error('[CirclesTestsPage] Error connecting wallet or initializing SDK:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during initialization.';
      setError(errorMessage);
      setMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGetCirclesSafeAddress = useCallback(async () => {
    if (!sdkInstance || !connectedEoaAddress) {
      setError('SDK not initialized or EOA address not available.');
      return;
    }

    if (!isAddress(connectedEoaAddress)) {
      setError('Invalid Ethereum address format for connected EOA.');
      setIsFetchingSafe(false);
      return;
    }

    const checksumAddress = getAddress(connectedEoaAddress);

    setIsFetchingSafe(true);
    setError(null);
    setMessage(null);
    setUserCirclesSafeAddress(null);
    try {
      setMessage(`Fetching Circles Safe address for EOA: ${checksumAddress}...`);
      // Cast the validated and checksummed address to the expected format
      const typedAddress = checksumAddress as EthereumAddress;
      const avatar: Avatar | null = await sdkInstance.getAvatar(typedAddress);
      
      if (avatar && avatar.address) {
        setUserCirclesSafeAddress(avatar.address);
        setMessage(`Circles Safe address found: ${avatar.address}`);
        console.log('[CirclesTestsPage] Avatar details:', avatar);
      } else {
        setError(`No Circles Safe address found for EOA: ${checksumAddress}. This EOA might not be registered with Circles, or the avatar data is incomplete.`);
        setMessage(null);
      }
    } catch (err: unknown) {
      console.error('[CirclesTestsPage] Error fetching Circles Safe address:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching the Circles Safe address.';
      setError(errorMessage);
      setMessage(null);
    } finally {
      setIsFetchingSafe(false);
    }
  }, [sdkInstance, connectedEoaAddress]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Circles Integration Tests</h1>

      {/* Authentication Status */}
      <section className="p-4 border rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-medium">Authentication Status</h2>
        {isAuthenticated ? (
          <div className="p-3 border rounded bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
            <p className="font-semibold text-green-700 dark:text-green-400">✓ Authenticated</p>
            <p className="text-sm text-green-600 dark:text-green-300">Ready to link Circles identity to your Curia account.</p>
          </div>
        ) : (
          <div className="p-3 border rounded bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700">
            <p className="font-semibold text-yellow-700 dark:text-yellow-400">⚠ Not Authenticated</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-300">Please authenticate with Common Ground to link your Circles identity.</p>
          </div>
        )}

        {/* Show existing linked address if available */}
        {isCheckingLinkedAddress && (
          <div className="p-3 border rounded bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700">
            <p className="text-sm text-blue-600 dark:text-blue-300">Checking for existing linked Circles address...</p>
          </div>
        )}

        {linkedCirclesSafeAddress && (
          <div className="p-3 border rounded bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700">
            <p className="font-semibold text-purple-700 dark:text-purple-400">✓ Circles Account Already Linked</p>
            <p className="text-sm text-purple-600 dark:text-purple-300 break-all">Linked Address: {linkedCirclesSafeAddress}</p>
          </div>
        )}
      </section>

      <section className="p-4 border rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-medium">WP1.1: Connect Wallet & Init SDK</h2>
        <Button onClick={handleConnectAndInitSdk} disabled={isLoading || isFetchingSafe}>
          {isLoading ? 'Initializing SDK...' : (sdkInstance ? 'SDK Initialized' : 'Connect Wallet & Initialize SDK')}
        </Button>

        {connectedEoaAddress && (
          <div className="mt-2 p-3 border rounded bg-slate-100 dark:bg-slate-800">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Wallet Connected</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 break-all">Your EOA: {connectedEoaAddress}</p>
          </div>
        )}

        {sdkInstance && (
          <div className="mt-2 p-3 border rounded bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
            <p className="font-semibold text-green-700 dark:text-green-400">SDK Initialized</p>
            <p className="text-sm text-green-600 dark:text-green-300">Circles SDK instance is ready.</p>
          </div>
        )}
      </section>

      {sdkInstance && connectedEoaAddress && (
        <section className="p-4 border rounded-lg shadow-sm space-y-4">
          <h2 className="text-xl font-medium">WP1.2: Get & Link Circles Identity</h2>
          <Button onClick={handleGetCirclesSafeAddress} disabled={isFetchingSafe || !sdkInstance || !connectedEoaAddress}>
            {isFetchingSafe ? 'Fetching Safe Address...' : 'Get My Circles Safe Address'}
          </Button>
          
          {userCirclesSafeAddress && (
             <div className="mt-2 p-3 border rounded bg-sky-100 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700">
                <p className="font-semibold text-sky-700 dark:text-sky-400">Circles Safe Found</p>
                <p className="text-sm text-sky-600 dark:text-sky-300 break-all">Your Circles Safe Address: {userCirclesSafeAddress}</p>
            </div>
          )}

          {/* Link button - only show if authenticated, safe address found, and not already linked to same address */}
          {userCirclesSafeAddress && isAuthenticated && (linkedCirclesSafeAddress !== userCirclesSafeAddress) && (
            <div className="space-y-2">
              <Button 
                onClick={handleLinkCirclesAddress} 
                disabled={isLinkingAddress}
                className="w-full"
              >
                {isLinkingAddress ? 'Linking to Curia Account...' : 'Link to My Curia Account'}
              </Button>
              
              {linkedCirclesSafeAddress && linkedCirclesSafeAddress !== userCirclesSafeAddress && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠ This will replace your currently linked address: {linkedCirclesSafeAddress}
                </p>
              )}
            </div>
          )}

          {userCirclesSafeAddress && linkedCirclesSafeAddress === userCirclesSafeAddress && (
            <div className="p-3 border rounded bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
              <p className="font-semibold text-green-700 dark:text-green-400">✓ This Address is Already Linked</p>
              <p className="text-sm text-green-600 dark:text-green-300">This Circles Safe is already connected to your Curia account.</p>
            </div>
          )}

          {userCirclesSafeAddress && !isAuthenticated && (
            <div className="p-3 border rounded bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700">
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">Authentication Required</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">Please authenticate with Common Ground to link this Circles Safe to your account.</p>
            </div>
          )}
        </section>
      )}

      {message && !error && (
        <div className="mt-2 p-3 border rounded bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700">
            <p className="font-semibold text-blue-700 dark:text-blue-400">Info</p>
            <p className="text-sm text-blue-600 dark:text-blue-300">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-2 p-3 border rounded bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700">
            <p className="font-semibold text-red-700 dark:text-red-400">Error</p>
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
} 