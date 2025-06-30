'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, LucideIcon } from 'lucide-react';

import { GatingRequirement } from '@/types/locks';
import { 
  validatePositiveNumber 
} from '@/lib/requirements/conversions';

// Token configuration interface
export interface TokenConfig {
  symbol: string;
  name: string;
  icon: LucideIcon;
  brandColor: string;
  gradientFrom: string;
  gradientTo: string;
  placeholder: string;
  helpText: string;
  parseAmount: (amount: string) => string; // Convert to wei/smallest unit
  formatAmount: (wei: string) => string;   // Convert from wei/smallest unit
  isValidAmount: (amount: string) => boolean;
  requirementType: 'lyx_balance' | 'eth_balance';
}

interface TokenBalanceConfiguratorProps {
  tokenConfig: TokenConfig;
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const TokenBalanceConfigurator: React.FC<TokenBalanceConfiguratorProps> = ({
  tokenConfig,
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [amount, setAmount] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === tokenConfig.requirementType) {
      const config = editingRequirement.config as { minAmount: string };
      if (config.minAmount) {
        setAmount(tokenConfig.formatAmount(config.minAmount));
      }
    }
  }, [editingRequirement, tokenConfig]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const numberValidation = validatePositiveNumber(amount);
    const tokenValidation = amount.trim() ? { isValid: tokenConfig.isValidAmount(amount) } : { isValid: false };
    
    if (!numberValidation.isValid) {
      setValidation(numberValidation);
    } else if (!tokenValidation.isValid) {
      setValidation({ isValid: false, error: `Invalid ${tokenConfig.symbol} amount` });
    } else {
      setValidation({ isValid: true });
    }
  }, [amount, tokenConfig]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!validation.isValid || !amount.trim()) return;

    try {
      const weiAmount = tokenConfig.parseAmount(amount);
      
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: tokenConfig.requirementType,
        category: 'token',
        config: {
          minAmount: weiAmount
        },
        isValid: true,
        displayName: `${tokenConfig.symbol} Balance: ≥ ${parseFloat(amount).toLocaleString()} ${tokenConfig.symbol}`
      };

      onSave(requirement);
    } catch (error) {
      console.error(`Failed to save ${tokenConfig.symbol} balance requirement:`, error);
      setValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleAmountChange = (value: string) => {
    // Allow decimal numbers and empty string
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
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
  
  const IconComponent = tokenConfig.icon;
  
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
        <div 
          className={`group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-${tokenConfig.gradientFrom} to-${tokenConfig.gradientTo} p-6 transition-all duration-300 hover:shadow-lg`}
          style={{
            backgroundColor: `${tokenConfig.brandColor}10`,
            borderColor: `${tokenConfig.brandColor}30`
          }}
        >
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div 
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: tokenConfig.brandColor }}
            >
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {tokenConfig.symbol} Balance Requirement
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Minimum {tokenConfig.name} required in wallet
              </p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Minimum {tokenConfig.symbol} Amount
            </Label>
            
            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={tokenConfig.placeholder}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={disabled}
                  className={`text-lg font-medium ${
                    validation.isValid 
                      ? `border-${tokenConfig.brandColor.replace('#', '')} focus:border-${tokenConfig.brandColor.replace('#', '')} focus:ring-${tokenConfig.brandColor.replace('#', '')}`
                      : amount.trim() 
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                  }`}
                />
              </div>
              <div 
                className="flex items-center px-4 rounded-lg border"
                style={{ 
                  backgroundColor: `${tokenConfig.brandColor}15`,
                  borderColor: `${tokenConfig.brandColor}30`
                }}
              >
                <span 
                  className="text-sm font-medium"
                  style={{ color: tokenConfig.brandColor }}
                >
                  {tokenConfig.symbol}
                </span>
              </div>
            </div>

            {/* Validation Message */}
            {amount.trim() && !validation.isValid && validation.error && (
              <p className="text-sm text-red-600 mt-2">
                {validation.error}
              </p>
            )}

            {/* Success Preview */}
            {validation.isValid && amount.trim() && (
              <div 
                className="mt-4 p-3 rounded-lg border"
                style={{ 
                  backgroundColor: `${tokenConfig.brandColor}15`,
                  borderColor: `${tokenConfig.brandColor}30`
                }}
              >
                <p 
                  className="text-sm"
                  style={{ color: tokenConfig.brandColor }}
                >
                  ✓ Users need at least <strong>{parseFloat(amount).toLocaleString()} {tokenConfig.symbol}</strong> in their wallet
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
            disabled={disabled || !validation.isValid || !amount.trim()}
            style={{ backgroundColor: tokenConfig.brandColor }}
            className="text-white hover:opacity-90"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {tokenConfig.helpText}
        </p>
      </div>
    </div>
  );
};