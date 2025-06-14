'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Zap } from 'lucide-react';

import { GatingRequirement, EthBalanceConfig } from '@/types/locks';
import { 
  parseEthToWei, 
  formatWeiToEth, 
  isValidEthAmount, 
  validatePositiveNumber 
} from '@/lib/requirements/conversions';

interface EthBalanceConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const EthBalanceConfigurator: React.FC<EthBalanceConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [ethAmount, setEthAmount] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'eth_balance') {
      const config = editingRequirement.config as EthBalanceConfig;
      if (config.minAmount) {
        setEthAmount(formatWeiToEth(config.minAmount));
      }
    }
  }, [editingRequirement]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const numberValidation = validatePositiveNumber(ethAmount);
    const ethValidation = ethAmount.trim() ? { isValid: isValidEthAmount(ethAmount) } : { isValid: false };
    
    if (!numberValidation.isValid) {
      setValidation(numberValidation);
    } else if (!ethValidation.isValid) {
      setValidation({ isValid: false, error: 'Invalid ETH amount' });
    } else {
      setValidation({ isValid: true });
    }
  }, [ethAmount]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!validation.isValid || !ethAmount.trim()) return;

    try {
      const weiAmount = parseEthToWei(ethAmount);
      
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'eth_balance',
        category: 'token',
        config: {
          minAmount: weiAmount
        } as EthBalanceConfig,
        isValid: true,
        displayName: `ETH Balance: ≥ ${parseFloat(ethAmount).toLocaleString()} ETH`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save ETH balance requirement:', error);
      setValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleAmountChange = (value: string) => {
    // Allow decimal numbers and empty string
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEthAmount(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validation.isValid) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  // ===== RENDER =====
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Requirements
          </button>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {editingRequirement ? 'Edit Requirement' : 'Add Requirement'}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="max-w-md mx-auto">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ETH Balance Requirement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Minimum Ethereum required in wallet</p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Minimum ETH Amount
            </Label>
            
            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="e.g., 0.1"
                  value={ethAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={disabled}
                  className={`text-lg font-medium ${
                    validation.isValid 
                      ? 'border-blue-200 focus:border-blue-400 focus:ring-blue-400' 
                      : ethAmount.trim() 
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                  }`}
                />
              </div>
              <div className="flex items-center px-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">ETH</span>
              </div>
            </div>

            {/* Validation Message */}
            {ethAmount.trim() && !validation.isValid && validation.error && (
              <p className="text-sm text-red-600 mt-2">
                {validation.error}
              </p>
            )}

            {/* Success Preview */}
            {validation.isValid && ethAmount.trim() && (
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ✓ Users need at least <strong>{parseFloat(ethAmount).toLocaleString()} ETH</strong> in their wallet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={disabled || !validation.isValid || !ethAmount.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ETH is the native currency of Ethereum. Users must have this amount in their connected wallet to access gated content.
        </p>
      </div>
    </div>
  );
}; 