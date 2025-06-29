import { useState, useEffect } from 'react';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { ethers } from 'ethers';

export const useUpLyxBalance = (address: string | null) => {
  const [formattedBalance, setFormattedBalance] = useState<string | null>(null);
  const [rawBalance, setRawBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getLyxBalance } = useUniversalProfile();

  useEffect(() => {
    if (!address) {
      setFormattedBalance(null);
      setRawBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rawBalanceValue = await getLyxBalance(); // This is a BigNumber or string in Wei
        const formatted = ethers.utils.formatEther(rawBalanceValue);
        
        setRawBalance(rawBalanceValue.toString());
        setFormattedBalance(parseFloat(formatted).toFixed(4));
      } catch (e) {
        console.error('Failed to fetch LYX balance:', e);
        setError('Failed to fetch LYX balance.');
        setFormattedBalance(null);
        setRawBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [address, getLyxBalance]);

  return { rawBalance, balance: formattedBalance, isLoading, error };
}; 