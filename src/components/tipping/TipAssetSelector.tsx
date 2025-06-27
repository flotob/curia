import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Send
} from 'lucide-react';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { ethers } from 'ethers';

// Types for different asset categories
interface LYXAsset {
  type: 'LYX';
  symbol: 'LYX';
  name: 'LYX';
  balance: string;
  decimals: 18;
  icon: string;
}

interface LSP7Asset {
  type: 'LSP7';
  address: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  icon?: string;
}

interface LSP8Asset {
  type: 'LSP8';
  address: string;
  name: string;
  symbol: string;
  tokenId?: string;
  icon?: string;
}

type TipAsset = LYXAsset | LSP7Asset | LSP8Asset;

interface TipAssetSelectorProps {
  upAddress: string;
  recipientAddress: string;
  onTipSent: () => void;
  onClose: () => void;
}

export const TipAssetSelector: React.FC<TipAssetSelectorProps> = ({
  upAddress,
  recipientAddress,
  onTipSent,
  onClose,
}) => {
  // State management
  const [assets, setAssets] = useState<TipAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<TipAsset | null>(null);
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { getLyxBalance } = useUniversalProfile();

  // Load user's assets (LYX + tokens)
  const loadAssets = useCallback(async () => {
    try {
      setIsLoadingAssets(true);
      setError(null);

      // 1. Get LYX balance
      const lyxBalanceWei = await getLyxBalance();
      const lyxBalance = ethers.utils.formatEther(lyxBalanceWei);

      const lyxAsset: LYXAsset = {
        type: 'LYX',
        symbol: 'LYX',
        name: 'LYX',
        balance: lyxBalance,
        decimals: 18,
        icon: '💎' // LYX icon
      };

      // TODO: Add LSP7/LSP8 token enumeration in future sprint
      // For now, just show LYX
      const allAssets: TipAsset[] = [lyxAsset];

      setAssets(allAssets);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load your assets. Please try again.');
    } finally {
      setIsLoadingAssets(false);
    }
  }, [getLyxBalance]);

  // Load assets on mount
  useEffect(() => {
    if (upAddress) {
      loadAssets();
    }
  }, [upAddress, loadAssets]);

  // Handle asset selection
  const handleAssetSelect = (asset: TipAsset) => {
    setSelectedAsset(asset);
    setAmount('');
    setError(null);
  };

  // Handle amount input
  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal points
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  // Set max amount
  const handleMaxAmount = () => {
    if (selectedAsset?.type === 'LYX') {
      // Leave some LYX for gas fees (0.01 LYX buffer)
      const maxAmount = Math.max(0, parseFloat(selectedAsset.balance) - 0.01);
      setAmount(maxAmount.toString());
    } else if (selectedAsset?.type === 'LSP7') {
      setAmount(selectedAsset.balance);
    }
  };

  // Validate amount
  const isValidAmount = (): boolean => {
    if (!amount || !selectedAsset) return false;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return false;
    
    if (selectedAsset.type === 'LYX') {
      const balanceNum = parseFloat(selectedAsset.balance);
      // Ensure enough left for gas fees
      return amountNum <= (balanceNum - 0.01) && balanceNum >= 0.01;
    } else if (selectedAsset.type === 'LSP7') {
      return amountNum <= parseFloat(selectedAsset.balance);
    }
    
    return false;
  };

  // Execute tip transaction
  const handleSendTip = async () => {
    if (!selectedAsset || !isValidAmount()) return;

    try {
      setIsSending(true);
      setError(null);

      // Get provider for transaction
      if (typeof window === 'undefined' || !window.lukso) {
        throw new Error('Universal Profile extension not available');
      }

      const provider = new ethers.providers.Web3Provider(window.lukso);
      const signer = provider.getSigner();

      let txHash: string;

      if (selectedAsset.type === 'LYX') {
        // Send LYX transfer
        const amountWei = ethers.utils.parseEther(amount);
        
        const tx = await signer.sendTransaction({
          to: recipientAddress,
          value: amountWei,
        });
        
        txHash = tx.hash;
        console.log('LYX tip transaction sent:', txHash);
        
        // Wait for confirmation
        await tx.wait();
        
      } else if (selectedAsset.type === 'LSP7') {
        // TODO: LSP7 token transfer in future sprint
        throw new Error('LSP7 token tipping not implemented yet');
      } else {
        // TODO: LSP8 NFT transfer in future sprint  
        throw new Error('LSP8 NFT tipping not implemented yet');
      }

      setTxHash(txHash);
      onTipSent();
      
    } catch (err: unknown) {
      console.error('Failed to send tip:', err);
      
      const error = err as { code?: number; message?: string };
      
      if (error.code === 4001) {
        setError('Transaction was cancelled by user.');
      } else if (error.message?.includes('insufficient funds')) {
        setError('Insufficient funds for this transaction.');
      } else {
        setError(error.message || 'Failed to send tip. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // Success state
  if (txHash) {
    return (
      <div className="text-center space-y-4">
        <div className="p-6 bg-green-50 dark:bg-green-950 rounded-lg">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Tip Sent Successfully! 🎉
          </h3>
          <p className="text-sm text-green-600 dark:text-green-400 mb-4">
            Your {amount} {selectedAsset?.symbol} tip has been sent to {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
          </p>
          <Badge variant="outline" className="text-xs font-mono">
            TX: {txHash.slice(0, 8)}...{txHash.slice(-8)}
          </Badge>
        </div>

        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoadingAssets) {
    return (
      <div className="text-center space-y-4">
        <div className="p-6">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your assets...</p>
        </div>
      </div>
    );
  }

  // No assets state
  if (assets.length === 0) {
    return (
      <div className="text-center space-y-4">
        <div className="p-6 border-2 border-dashed border-muted rounded-lg">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No Assets Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You need LYX or tokens to send a tip.
          </p>
        </div>
        <Button onClick={onClose} variant="outline" className="w-full">
          Close
        </Button>
      </div>
    );
  }

  // Asset selection state
  if (!selectedAsset) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Choose Asset to Tip</h3>
        
        <div className="space-y-2">
          {assets.map((asset, index) => (
            <Card 
              key={index}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleAssetSelect(asset)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {asset.type === 'LYX' ? '💎' : asset.type === 'LSP7' ? <Coins className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{asset.name}</h4>
                      <Badge variant="outline">{asset.symbol}</Badge>
                    </div>
                    {(asset.type === 'LYX' || asset.type === 'LSP7') && (
                      <p className="text-sm text-muted-foreground">
                        Balance: {parseFloat(asset.balance).toFixed(4)} {asset.symbol}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={onClose} variant="outline" className="w-full">
          Cancel
        </Button>
      </div>
    );
  }

  // Amount input state
  return (
    <div className="space-y-6">
      {/* Selected Asset */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <span>Sending</span>
            <Badge variant="outline">{selectedAsset.symbol}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">
                {selectedAsset.type === 'LYX' ? '💎' : <Coins className="h-6 w-6" />}
              </span>
              <span className="font-medium">{selectedAsset.name}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedAsset(null)}
            >
              Change
            </Button>
          </div>
          {(selectedAsset.type === 'LYX' || selectedAsset.type === 'LSP7') && (
            <p className="text-sm text-muted-foreground mt-2">
              Available: {parseFloat(selectedAsset.balance).toFixed(4)} {selectedAsset.symbol}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Amount Input */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Amount</label>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="text-lg"
          />
          {(selectedAsset.type === 'LYX' || selectedAsset.type === 'LSP7') && (
            <Button
              variant="outline"
              onClick={handleMaxAmount}
              disabled={selectedAsset.type === 'LYX' && parseFloat(selectedAsset.balance) <= 0.01}
            >
              Max
            </Button>
          )}
        </div>
        
        {selectedAsset.type === 'LYX' && (
          <p className="text-xs text-muted-foreground">
            * 0.01 LYX reserved for transaction fees
          </p>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Send Button */}
      <div className="space-y-3">
        <Button
          onClick={handleSendTip}
          disabled={!isValidAmount() || isSending}
          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
          size="lg"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Tip...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send {amount} {selectedAsset.symbol}
            </>
          )}
        </Button>

        <Button onClick={onClose} variant="outline" className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
}; 