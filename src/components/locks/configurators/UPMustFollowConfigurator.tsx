'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserPlus } from 'lucide-react';

import { GatingRequirement, UPMustFollowConfig } from '@/types/locks';
import { validateEthereumAddress } from '@/lib/requirements/validation';

interface UPMustFollowConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const UPMustFollowConfigurator: React.FC<UPMustFollowConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [address, setAddress] = useState('');
  const [profileName, setProfileName] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'up_must_follow') {
      const config = editingRequirement.config as UPMustFollowConfig;
      setAddress(config.address || '');
      setProfileName(config.profileName || '');
    }
  }, [editingRequirement]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const validation = validateEthereumAddress(address);
    setValidation(validation);
  }, [address]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!validation.isValid || !address.trim()) return;

    try {
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'up_must_follow',
        category: 'social',
        config: {
          address: address.trim(),
          profileName: profileName.trim() || undefined
        } as UPMustFollowConfig,
        isValid: true,
        displayName: `UP Must Follow: ${profileName.trim() || address.slice(0, 8) + '...'}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save UP must follow requirement:', error);
      setValidation({ isValid: false, error: 'Failed to save requirement' });
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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">UP Must Follow</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require following a specific Universal Profile</p>
            </div>
          </div>

          {/* Address Input */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Universal Profile Address *
              </Label>
              <Input
                type="text"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={disabled}
                className={`mt-1 text-sm ${
                  validation.isValid 
                    ? 'border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400' 
                    : address.trim() 
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                }`}
              />
              
              {/* Validation Message */}
              {address.trim() && !validation.isValid && validation.error && (
                <p className="text-sm text-red-600 mt-1">
                  {validation.error}
                </p>
              )}
            </div>

            {/* Profile Name Input (Optional) */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Profile Name (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g., vitalik.up"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={disabled}
                className="mt-1 text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Display name for better readability
              </p>
            </div>

            {/* Success Preview */}
            {validation.isValid && address.trim() && (
              <div className="mt-4 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  ✓ Users must follow <strong>{profileName.trim() || `${address.slice(0, 8)}...`}</strong> on Universal Profiles
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
            disabled={disabled || !validation.isValid || !address.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Users must follow the specified Universal Profile address to access gated content. 
          This creates targeted community requirements.
        </p>
      </div>
    </div>
  );
}; 