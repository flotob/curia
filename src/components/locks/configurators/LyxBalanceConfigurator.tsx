'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Coins } from 'lucide-react';

import { GatingRequirement, LyxBalanceConfig } from '@/types/locks';
import { 
  parseLyxToWei, 
  formatWeiToLyx, 
  isValidLyxAmount, 
  validatePositiveNumber 
} from '@/lib/requirements/conversions';

interface LyxBalanceConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const LyxBalanceConfigurator: React.FC<LyxBalanceConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [lyxAmount, setLyxAmount] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'lyx_balance') {
      const config = editingRequirement.config as LyxBalanceConfig;
      if (config.minAmount) {
        setLyxAmount(formatWeiToLyx(config.minAmount));
      }
    }
  }, [editingRequirement]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const numberValidation = validatePositiveNumber(lyxAmount);
    const lyxValidation = lyxAmount.trim() ? { isValid: isValidLyxAmount(lyxAmount) } : { isValid: false };
    
    if (!numberValidation.isValid) {
      setValidation(numberValidation);
    } else if (!lyxValidation.isValid) {
      setValidation({ isValid: false, error: 'Invalid LYX amount' });
    } else {
      setValidation({ isValid: true });
    }
  }, [lyxAmount]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!validation.isValid || !lyxAmount.trim()) return;

    try {
      const weiAmount = parseLyxToWei(lyxAmount);
      
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'lyx_balance',
        category: 'token',
        config: {
          minAmount: weiAmount
        } as LyxBalanceConfig,
        isValid: true,
        displayName: `LYX Balance: ≥ ${parseFloat(lyxAmount).toLocaleString()} LYX`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save LYX balance requirement:', error);
      setValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleAmountChange = (value: string) => {
    // Allow decimal numbers and empty string
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLyxAmount(value);
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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Requirements
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          {editingRequirement ? 'Edit Requirement' : 'Add Requirement'}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="max-w-md mx-auto">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-pink-50 to-purple-50 p-6 transition-all duration-300 hover:shadow-lg hover:border-pink-300">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">LYX Balance Requirement</h3>
              <p className="text-sm text-gray-600">Minimum LYX tokens required in wallet</p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Minimum LYX Amount
            </Label>
            
            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="e.g., 50"
                  value={lyxAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={disabled}
                  className={`text-lg font-medium ${
                    validation.isValid 
                      ? 'border-pink-200 focus:border-pink-400 focus:ring-pink-400' 
                      : lyxAmount.trim() 
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                  }`}
                />
              </div>
              <div className="flex items-center px-4 bg-pink-100 rounded-lg border border-pink-200">
                <span className="text-sm font-medium text-pink-800">LYX</span>
              </div>
            </div>

            {/* Validation Message */}
            {lyxAmount.trim() && !validation.isValid && validation.error && (
              <p className="text-sm text-red-600 mt-2">
                {validation.error}
              </p>
            )}

            {/* Success Preview */}
            {validation.isValid && lyxAmount.trim() && (
              <div className="mt-4 p-3 bg-pink-100 rounded-lg border border-pink-200">
                <p className="text-sm text-pink-800">
                  ✓ Users need at least <strong>{parseFloat(lyxAmount).toLocaleString()} LYX</strong> in their wallet
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
            disabled={disabled || !validation.isValid || !lyxAmount.trim()}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500">
          LYX is the native currency of LUKSO. Users must have this amount in their Universal Profile to access gated content.
        </p>
      </div>
    </div>
  );
}; 