'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Sdk, circlesConfig, type Avatar } from '@circles-sdk/sdk';
import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';
import { Button } from '@/components/ui/button';
import { isAddress, getAddress } from 'ethers';
import { useAuth } from '@/contexts/AuthContext';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useWalletClient } from 'wagmi';

// Type alias for Ethereum address format expected by Circles SDK
type EthereumAddress = `0x${string}`;

const GNOSIS_CHAIN_ID = 100;

export default function CirclesTestsPage() {
  const { token, isAuthenticated } = useAuth();
  const { 
    address: connectedAddress, 
    isConnected, 
    availableWallets,
    connectWallet,
    disconnect,
    walletType,
    isPortoAvailable,
    isMetaMaskAvailable 
  } = useWalletConnection();
  const { data: walletClient } = useWalletClient();

  const [sdkInstance, setSdkInstance] = useState<Sdk | null>(null);
  const [userCirclesSafeAddress, setUserCirclesSafeAddress] = useState<string | null>(null);
  const [linkedCirclesSafeAddress, setLinkedCirclesSafeAddress] = useState<string | null>(null);
  const [isInitializingSdk, setIsInitializingSdk] = useState<boolean>(false);
  const [isFetchingSafe, setIsFetchingSafe] = useState<boolean>(false);
  const [isLinkingAddress, setIsLinkingAddress] = useState<boolean>(false);
  const [isCheckingLinkedAddress, setIsCheckingLinkedAddress] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [webAuthnStatus, setWebAuthnStatus] = useState<string>('Checking...');

  // Check for existing linked Circles address when component mounts
  useEffect(() => {
    if (isAuthenticated && token) {
      checkLinkedCirclesAddress();
    }
  }, [isAuthenticated, token]);

  // Auto-initialize SDK when wallet connects
  useEffect(() => {
    if (isConnected && walletClient && !sdkInstance) {
      initializeCirclesSDK();
    }
  }, [isConnected, walletClient, sdkInstance]);

  // Check WebAuthn capabilities
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasWebAuthn = 'credentials' in navigator && 'create' in navigator.credentials;
      
      if (!hasWebAuthn) {
        setWebAuthnStatus('Not supported');
        return;
      }

      // Try to check permissions
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'publickey-credentials-create' as any })
          .then(result => {
            setWebAuthnStatus(`Available (${result.state})`);
          })
          .catch(() => {
            setWebAuthnStatus('Available (permission unknown)');
          });
      } else {
        setWebAuthnStatus('Available (no permission API)');
      }
    }
  }, []);

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

  const initializeCirclesSDK = useCallback(async () => {
    if (!walletClient) {
      setError('No wallet client available');
      return;
    }

    setIsInitializingSdk(true);
    setError(null);
    setMessage(null);

    try {
      setMessage('Initializing Circles SDK...');
      
      const sdkConfig = circlesConfig[GNOSIS_CHAIN_ID];
      if (!sdkConfig) {
        throw new Error(`Circles configuration for Gnosis Chain (ID: ${GNOSIS_CHAIN_ID}) not found.`);
      }

      // Create Circles adapter and initialize it
      const adapter = new BrowserProviderContractRunner();
      await adapter.init();
      
      // Verify the adapter has the expected address
      if (!adapter.address) {
        throw new Error('Failed to initialize adapter or get address.');
      }
      
      // Create SDK with the adapter
      const sdk = new Sdk(adapter, sdkConfig);
      setSdkInstance(sdk);
      setMessage('Circles SDK initialized successfully!');
      console.log('[CirclesTestsPage] Circles SDK initialized:', sdk);

    } catch (err: unknown) {
      console.error('[CirclesTestsPage] Error initializing SDK:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during initialization.';
      setError(errorMessage);
      setMessage(null);
    } finally {
      setIsInitializingSdk(false);
    }
  }, [walletClient]);

  const handleConnectWallet = useCallback(async (type: 'metamask' | 'porto') => {
    try {
      setError(null);
      setMessage(`Connecting to ${type === 'porto' ? 'Porto' : 'MetaMask'} wallet...`);
      await connectWallet(type);
    } catch (err: unknown) {
      console.error('Wallet connection error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      
      // Provide specific guidance for different Porto iframe issues
      if (type === 'porto') {
        if (errorMessage.includes('Indexed property setter')) {
          errorMessage = 'Porto wallet creation failed due to iframe restrictions. This may be a limitation in the Common Ground environment. Try using MetaMask/Rabby instead.';
        } else if (errorMessage.includes('publickey-credentials-create') || errorMessage.includes('Failed to create credential')) {
          errorMessage = `Porto passkey creation is blocked in this iframe environment. This requires Common Ground to enable WebAuthn permissions. 

Possible solutions:
• Use MetaMask/Rabby extension wallets (they work perfectly)
• If you have an existing Porto account, try "Sign In" instead of "Sign Up"
• Contact Common Ground support to enable passkey permissions for plugins`;
        } else if (errorMessage.includes('RpcResponse.InternalError')) {
          errorMessage = 'Porto wallet operation failed. This may be due to iframe security restrictions in the Common Ground environment. Try using MetaMask/Rabby instead.';
        }
      }
      
      setError(errorMessage);
      setMessage(null);
    }
  }, [connectWallet]);

  const handleGetCirclesSafeAddress = useCallback(async () => {
    if (!sdkInstance || !connectedAddress) {
      setError('SDK not initialized or wallet address not available.');
      return;
    }

    if (!isAddress(connectedAddress)) {
      setError('Invalid Ethereum address format for connected wallet.');
      setIsFetchingSafe(false);
      return;
    }

    const checksumAddress = getAddress(connectedAddress);

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
  }, [sdkInstance, connectedAddress]);

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Circles Integration Tests - Porto Edition</h1>

      {/* Debug section for iframe context */}
      <section className="p-4 border rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-medium">Environment Debug</h2>
        <div className="text-sm space-y-1">
          <p><strong>In iframe:</strong> {window.self !== window.top ? 'Yes' : 'No'}</p>
          <p><strong>Frame depth:</strong> {window.self !== window.top ? (window.parent !== window.top ? 'Nested (2+)' : 'Single (1)') : 'None (0)'}</p>
          <p><strong>Porto available:</strong> {isPortoAvailable ? 'Yes' : 'No'}</p>
          <p><strong>Available wallets:</strong> {availableWallets.length}</p>
          {typeof document !== 'undefined' && (
            <p><strong>Document domain:</strong> {document.domain}</p>
          )}
          <p><strong>WebAuthn status:</strong> {webAuthnStatus}</p>
        </div>
      </section>

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

      {/* Wallet Connection Section */}
      <section className="p-4 border rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-medium">Wallet Connection</h2>
        
        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Choose your wallet type:</p>
            
            {isPortoAvailable && (
              <Button 
                onClick={() => handleConnectWallet('porto')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                🌐 Connect with Porto (No Extension Required)
              </Button>
            )}
            
            {isMetaMaskAvailable && (
              <Button 
                onClick={() => handleConnectWallet('metamask')}
                variant="outline"
                className="w-full"
              >
                🦊 Connect with MetaMask/Rabby
              </Button>
            )}
            
            {availableWallets.length > 0 && (
              <div className="mt-4 p-3 border rounded bg-gray-50 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Wallet Options:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {availableWallets.map((wallet, index) => (
                    <li key={index}>• {wallet.name} ({wallet.type})</li>
                  ))}
                </ul>
              </div>
            )}
            
            {availableWallets.length === 0 && (
              <div className="p-3 border rounded bg-yellow-100 dark:bg-yellow-900/30">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  No wallet options detected. Please ensure MetaMask/Rabby is installed or wait for Porto to initialize.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 border rounded bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
              <p className="font-semibold text-green-700 dark:text-green-400">
                ✓ Connected via {walletType === 'porto' ? 'Porto' : walletType === 'metamask' ? 'MetaMask/Browser Extension' : 'Unknown Wallet'}
              </p>
              <p className="text-sm text-green-600 dark:text-green-300 break-all">
                Address: {connectedAddress}
              </p>
            </div>
            
            <Button onClick={() => disconnect()} variant="outline" size="sm">
              Disconnect Wallet
            </Button>
          </div>
        )}

        {/* SDK Status */}
        {isConnected && (
          <div className="mt-4">
            {isInitializingSdk ? (
              <div className="p-3 border rounded bg-blue-100 dark:bg-blue-900/30">
                <p className="text-sm text-blue-600 dark:text-blue-300">Initializing Circles SDK...</p>
              </div>
            ) : sdkInstance ? (
              <div className="p-3 border rounded bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                <p className="font-semibold text-green-700 dark:text-green-400">✓ Circles SDK Ready</p>
                <p className="text-sm text-green-600 dark:text-green-300">Ready for Circles operations</p>
              </div>
            ) : (
              <Button onClick={initializeCirclesSDK} className="w-full">
                Initialize Circles SDK
              </Button>
            )}
          </div>
        )}
      </section>

      {sdkInstance && connectedAddress && (
        <section className="p-4 border rounded-lg shadow-sm space-y-4">
          <h2 className="text-xl font-medium">WP1.2: Get & Link Circles Identity</h2>
          <Button onClick={handleGetCirclesSafeAddress} disabled={isFetchingSafe || !sdkInstance || !connectedAddress}>
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