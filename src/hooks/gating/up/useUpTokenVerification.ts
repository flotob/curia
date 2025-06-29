import { useState, useEffect, useMemo } from 'react';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { TokenRequirement } from '@/types/gating';
import { useAccount, useReadContracts } from 'wagmi';
import { erc721Abi, erc20Abi, Abi } from 'viem';
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
  const { address: connectedAddress } = useAccount();

  const stableRequirements = useMemo(() => requirements, [JSON.stringify(requirements)]);

  // Separate requirements for wagmi multicall and manual checks
  const wagmiRequirements = useMemo(() => stableRequirements.filter(req => !req.tokenId), [stableRequirements]);
  const specificLSP8Requirements = useMemo(() => stableRequirements.filter(req => req.tokenType === 'LSP8' && req.tokenId), [stableRequirements]);

  const [lsp8Ownership, setLsp8Ownership] = useState<Record<string, boolean>>({});
  const [isLoadingLsp8, setIsLoadingLsp8] = useState(false);

  // Wagmi's useReadContracts for standard balance checks (LSP7 & LSP8 collections)
  const { data: balanceResults, isLoading: isLoadingBalances, refetch } = useReadContracts({
    contracts: wagmiRequirements.flatMap(req => {
      if (!connectedAddress) return [];
      const abi = req.tokenType === 'LSP7' ? erc20Abi : erc721Abi;
      return [{
        address: req.contractAddress as `0x${string}`,
        abi: abi as Abi,
        functionName: 'balanceOf',
        args: [connectedAddress],
      }];
    }),
    query: {
      enabled: !!connectedAddress && wagmiRequirements.length > 0,
    }
  });

  // Force a refetch when the user connects to avoid stale cached data
  useEffect(() => {
    if (connectedAddress) {
      console.log('[useUpTokenVerification] Address connected, refetching token balances to avoid stale cache.');
      refetch();
    }
  }, [connectedAddress, refetch]);

  // Manual verification for specific LSP8 token IDs
  useEffect(() => {
    if (!connectedAddress || specificLSP8Requirements.length === 0) {
      setLsp8Ownership({});
      return;
    }

    const verifyLsp8TokenIds = async () => {
      setIsLoadingLsp8(true);
      const ownership: Record<string, boolean> = {};
      
      // Use window.lukso provider for LSP8 verification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new ethers.providers.Web3Provider((window as any).lukso);
      
      for (const req of specificLSP8Requirements) {
        const tokenKey = `${req.contractAddress}-${req.tokenId}`;
        try {
          const contract = new ethers.Contract(req.contractAddress, [
            'function tokenOwnerOf(bytes32) view returns (address)'
          ], provider);
          
          const tokenIdBytes32 = ethers.utils.hexZeroPad(ethers.BigNumber.from(req.tokenId).toHexString(), 32);
          const owner = await contract.tokenOwnerOf(tokenIdBytes32);
          ownership[tokenKey] = owner.toLowerCase() === connectedAddress.toLowerCase();
        } catch (e) {
          console.error(`Failed to verify ownership for token ID ${req.tokenId} on ${req.contractAddress}`, e);
          ownership[tokenKey] = false;
        }
      }
      setLsp8Ownership(ownership);
      setIsLoadingLsp8(false);
    };

    verifyLsp8TokenIds();
  }, [connectedAddress, specificLSP8Requirements]);

  useEffect(() => {
    if (!address || stableRequirements.length === 0) {
      setVerificationStatus({});
      return;
    }

    const verifyTokens = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tokenAddresses = stableRequirements.map(req => req.contractAddress);
        const metadataArray = await getTokenBalances(tokenAddresses);
        
        const metadataMap = metadataArray.reduce((acc, meta) => {
            acc[meta.contractAddress] = meta;
            return acc;
        }, {} as Record<string, typeof metadataArray[0]>);

        const newStatus: Record<string, TokenVerificationStatus> = {};
        
        // Process wagmi results first
        wagmiRequirements.forEach((req, index) => {
          const balanceResult = balanceResults?.[index];
          let isMet = false;
          let currentBalance = '0';

          if (balanceResult?.status === 'success') {
            const balance = balanceResult.result as bigint;
            currentBalance = balance.toString();
            const requiredAmount = BigInt(req.minAmount || '1');
            isMet = balance >= requiredAmount;
          }
          
          newStatus[req.contractAddress] = {
            isMet,
            currentBalance,
            metadata: metadataMap[req.contractAddress] ? {
              name: metadataMap[req.contractAddress].name || 'Unknown',
              symbol: metadataMap[req.contractAddress].symbol || '???',
              decimals: metadataMap[req.contractAddress].decimals || 18,
            } : undefined,
          };
        });

        // Process specific LSP8 results
        specificLSP8Requirements.forEach(req => {
          const tokenKey = `${req.contractAddress}-${req.tokenId}`;
          const ownsToken = lsp8Ownership[tokenKey] || false;
          
          newStatus[tokenKey] = {
            isMet: ownsToken,
            currentBalance: ownsToken ? '1' : '0',
            metadata: metadataMap[req.contractAddress] ? {
              name: metadataMap[req.contractAddress].name || 'Unknown',
              symbol: metadataMap[req.contractAddress].symbol || '???',
              decimals: 0, // NFTs don't have decimals
              iconUrl: metadataMap[req.contractAddress].iconUrl,
            } : undefined,
          };
        });

        setVerificationStatus(newStatus);

      } catch (e) {
        console.error('Failed to verify token requirements:', e);
        setError('Failed to verify token requirements.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyTokens();
  }, [address, stableRequirements, getTokenBalances, balanceResults, lsp8Ownership, wagmiRequirements, specificLSP8Requirements]);

  return { verificationStatus, isLoading: isLoading || isLoadingBalances || isLoadingLsp8, error };
}; 