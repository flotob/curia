/**
 * Ethereum Verification Slot
 * 
 * Handles verification for ethereum_profile gating category.
 * Users connect their Ethereum wallet and sign a challenge to verify requirements.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Shield
} from 'lucide-react';

import { useAccount, useSignMessage } from 'wagmi';
import { EthereumGatingRequirements } from '@/types/gating';
import { authFetch } from '@/utils/authFetch';

interface EthereumVerificationSlotProps {
  postId: number;
  requirements: unknown;
  currentStatus: 'not_started' | 'pending' | 'verified' | 'expired';
  onVerificationComplete?: () => void;
}

export const EthereumVerificationSlot: React.FC<EthereumVerificationSlotProps> = ({
  postId,
  requirements,
  currentStatus,
  onVerificationComplete
}) => {
  
  // ===== STATE =====
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ===== HOOKS =====
  
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // ===== REQUIREMENTS PARSING =====
  
  const ethRequirements = requirements as EthereumGatingRequirements;
  
  const getRequirementsList = () => {
    const reqs: string[] = [];
    
    if (ethRequirements.minimumETHBalance) {
      const ethAmount = parseFloat(ethRequirements.minimumETHBalance) / 1e18;
      reqs.push(`${ethAmount} ETH minimum balance`);
    }
    
    if (ethRequirements.requiresENS) {
      reqs.push('ENS domain required');
    }
    
    if (ethRequirements.requiredERC20Tokens?.length) {
      reqs.push(`${ethRequirements.requiredERC20Tokens.length} ERC-20 token(s)`);
    }
    
    if (ethRequirements.requiredERC721Collections?.length) {
      reqs.push(`${ethRequirements.requiredERC721Collections.length} NFT collection(s)`);
    }
    
    if (ethRequirements.requiredERC1155Tokens?.length) {
      reqs.push(`${ethRequirements.requiredERC1155Tokens.length} ERC-1155 token(s)`);
    }
    
    return reqs;
  };
  
  // ===== HANDLERS =====
  
  const handleVerify = useCallback(async () => {
    if (!isConnected || !address) {
      setError('Please connect your Ethereum wallet first');
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      // Create challenge
      const challenge = {
        type: 'ethereum_profile' as const,
        nonce: crypto.randomUUID().replace(/-/g, ''), // Simple nonce for now
        timestamp: Date.now(),
        postId,
        ethAddress: address,
        address: address,
        chainId: 1, // Ethereum mainnet
      };
      
      // Create signing message
      const message = `Verify access to post ${postId} on Ethereum mainnet

Address: ${address}
Chain ID: 1
Timestamp: ${challenge.timestamp}
Nonce: ${challenge.nonce}

This signature proves you control this Ethereum address and grants access to comment on this gated post.`;

      // Sign the message
      const signature = await signMessageAsync({ message });
      
      // Add signature to challenge
      const signedChallenge = {
        ...challenge,
        signature
      };
      
      // Submit to pre-verification API
      const response = await authFetch(`/api/posts/${postId}/pre-verify/ethereum_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challenge: signedChallenge
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Verification successful
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        throw new Error(result.error || 'Verification failed');
      }
      
    } catch (err) {
      console.error('Ethereum verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [isConnected, address, postId, signMessageAsync, onVerificationComplete]);
  
  // ===== RENDER =====
  
  const requirements_list = getRequirementsList();
  
  return (
    <div className="space-y-4">
      {/* Requirements List */}
      <div>
        <div className="text-sm font-medium mb-2 flex items-center">
          <Shield className="h-4 w-4 mr-2" />
          Ethereum Requirements
        </div>
        <div className="space-y-1">
          {requirements_list.map((req, index) => (
            <div key={index} className="text-xs text-muted-foreground flex items-center">
              <div className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
              {req}
            </div>
          ))}
        </div>
      </div>
      
      <Separator />
      
      {/* Status Display */}
      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="text-sm">Ethereum Wallet</div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </>
            ) : (
              <Badge variant="outline">Not Connected</Badge>
            )}
          </div>
        </div>
        
        {/* Verification Status */}
        <div className="flex items-center justify-between">
          <div className="text-sm">Verification Status</div>
          <div className="flex items-center space-x-2">
            {currentStatus === 'verified' ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : currentStatus === 'pending' ? (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Pending
              </Badge>
            ) : currentStatus === 'expired' ? (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expired
              </Badge>
            ) : (
              <Badge variant="outline">Not Started</Badge>
            )}
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
      
      {/* Action Button */}
      <div className="space-y-2">
        {!isConnected ? (
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground mb-2">
              Connect your Ethereum wallet to verify requirements
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span>Connect via RainbowKit</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        ) : currentStatus === 'verified' ? (
          <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="text-sm text-green-700">
              ✓ Ethereum verification complete - you can now comment!
            </div>
          </div>
        ) : (
          <Button 
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                <span>Verify Ethereum Requirements</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}; 