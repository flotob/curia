import { useState, useEffect } from 'react';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { TokenRequirement } from '@/types/gating';
import { ethers } from 'ethers';

interface TokenVerificationStatus {
  isMet: boolean;
  currentBalance: string;
  metadata?: {
    name: string;
    symbol: string;
    decimals: number;
    iconUrl?: string;
  };
}

export const useUpTokenVerification = (
  address: string | null,
  requirements: TokenRequirement[]
) => {
  const [verificationStatus, setVerificationStatus] = useState<Record<string, TokenVerificationStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getTokenBalances } = useUniversalProfile();

  const requirementsKey = JSON.stringify(requirements);

  useEffect(() => {
    const verifyAllTokens = async () => {
      if (!address || requirements.length === 0) {
        setVerificationStatus({});
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Fetch all base metadata first
        const tokenAddresses = requirements.map(req => req.contractAddress);
        const metadataArray = await getTokenBalances(tokenAddresses);
        const metadataMap = metadataArray.reduce((acc, meta) => {
          acc[meta.contractAddress.toLowerCase()] = meta;
          return acc;
        }, {} as Record<string, typeof metadataArray[0]>);
        
        // Step 2: Dynamically build all contract calls
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = new ethers.providers.Web3Provider((window as any).lukso);
        const multicallPayload = [];
        const lsp8SpecificPayload = [];

        for (const req of requirements) {
          if (req.tokenType === 'LSP8' && req.tokenId) {
            lsp8SpecificPayload.push({
              key: `${req.contractAddress}-${req.tokenId}`,
              contractAddress: req.contractAddress,
              tokenId: req.tokenId,
            });
          } else {
            const abi = req.tokenType === 'LSP7' 
              ? ['function balanceOf(address) view returns (uint256)'] 
              : ['function balanceOf(address) view returns (uint256)']; // LSP8 collection is also balanceOf
            const contract = new ethers.Contract(req.contractAddress, abi, provider);
            multicallPayload.push(contract.balanceOf(address));
          }
        }
        
        // Step 3: Execute all calls in parallel
        const [balanceResults, lsp8Results] = await Promise.all([
            Promise.all(multicallPayload),
            Promise.all(lsp8SpecificPayload.map(async (p) => {
                const contract = new ethers.Contract(p.contractAddress, ['function tokenOwnerOf(bytes32) view returns (address)'], provider);
                const tokenIdBytes32 = ethers.utils.hexZeroPad(ethers.BigNumber.from(p.tokenId).toHexString(), 32);
                try {
                    const owner = await contract.tokenOwnerOf(tokenIdBytes32);
                    return { key: p.key, owner: owner.toLowerCase() };
                } catch {
                    return { key: p.key, owner: null }; // Handle case where token does not exist
                }
            }))
        ]);

        // Step 4: Process results
        const newStatus: Record<string, TokenVerificationStatus> = {};
        let balanceIndex = 0;
        
        for (const req of requirements) {
          const metadata = metadataMap[req.contractAddress.toLowerCase()];
          if (req.tokenType === 'LSP8' && req.tokenId) {
            const tokenKey = `${req.contractAddress}-${req.tokenId}`;
            const result = lsp8Results.find(r => r.key === tokenKey);
            const ownsToken = result?.owner === address.toLowerCase();
            newStatus[tokenKey] = {
              isMet: ownsToken,
              currentBalance: ownsToken ? '1' : '0',
              metadata: metadata ? { ...metadata, name: metadata.name || 'Unknown', symbol: metadata.symbol || '???', decimals: 0 } : undefined,
            };
          } else {
            const balance = balanceResults[balanceIndex++];
            const requiredAmount = ethers.BigNumber.from(req.minAmount || '1');
            const isMet = balance ? balance.gte(requiredAmount) : false;
            newStatus[req.contractAddress] = {
              isMet,
              currentBalance: balance ? balance.toString() : '0',
              metadata: metadata ? {
                name: metadata.name || 'Unknown',
                symbol: metadata.symbol || '???',
                decimals: metadata.decimals || 18,
                iconUrl: metadata.iconUrl
              } : undefined,
            };
          }
        }

        setVerificationStatus(newStatus);

      } catch (e) {
        console.error('Failed to verify token requirements:', e);
        setError('An error occurred during token verification.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAllTokens();
  }, [address, requirementsKey, getTokenBalances]);

  return { verificationStatus, isLoading, error };
}; 