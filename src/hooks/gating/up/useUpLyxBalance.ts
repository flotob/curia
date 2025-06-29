import { useState, useEffect } from 'react';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { ethers } from 'ethers';

export const useUpLyxBalance = (address: string | null) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getLyxBalance } = useUniversalProfile();

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rawBalance = await getLyxBalance();
        const formattedBalance = ethers.utils.formatEther(rawBalance);
        setBalance(parseFloat(formattedBalance).toFixed(4));
      } catch (e) {
        console.error('Failed to fetch LYX balance:', e);
        setError('Failed to fetch LYX balance.');
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [address, getLyxBalance]);

  return { balance, isLoading, error };
}; 