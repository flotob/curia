'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users } from 'lucide-react';

import { GatingRequirement, EFPFollowerCountConfig } from '@/types/locks';
import { validateFollowerCount } from '@/lib/requirements/validation';

interface EFPFollowerCountConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const EFPFollowerCountConfigurator: React.FC<EFPFollowerCountConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [followerCount, setFollowerCount] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'efp_follower_count') {
      const config = editingRequirement.config as EFPFollowerCountConfig;
      if (config.minCount !== undefined) {
        setFollowerCount(config.minCount.toString());
      }
    }
  }, [editingRequirement]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const validation = validateFollowerCount(followerCount);
    setValidation(validation);
  }, [followerCount]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!validation.isValid || !followerCount.trim()) return;

    try {
      const count = parseInt(followerCount, 10);
      
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'efp_follower_count',
        category: 'social',
        config: {
          minCount: count
        } as EFPFollowerCountConfig,
        isValid: true,
        displayName: `EFP Followers: ≥ ${count.toLocaleString()} followers`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save EFP follower count requirement:', error);
      setValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleCountChange = (value: string) => {
    // Allow only positive integers
    if (value === '' || /^\d+$/.test(value)) {
      setFollowerCount(value);
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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">EFP Follower Requirement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Minimum EFP followers required</p>
            </div>
          </div>

          {/* Count Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Minimum Follower Count
            </Label>
            
            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="e.g., 100"
                  value={followerCount}
                  onChange={(e) => handleCountChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={disabled}
                  className={`text-lg font-medium ${
                    validation.isValid 
                      ? 'border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400' 
                      : followerCount.trim() 
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                  }`}
                />
              </div>
              <div className="flex items-center px-4 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <span className="text-sm font-medium text-cyan-800 dark:text-cyan-200">followers</span>
              </div>
            </div>

            {/* Validation Message */}
            {followerCount.trim() && !validation.isValid && validation.error && (
              <p className="text-sm text-red-600 mt-2">
                {validation.error}
              </p>
            )}

            {/* Success Preview */}
            {validation.isValid && followerCount.trim() && (
              <div className="mt-4 p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <p className="text-sm text-cyan-800 dark:text-cyan-200">
                  ✓ Users need at least <strong>{parseInt(followerCount).toLocaleString()} followers</strong> on EFP
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
            disabled={disabled || !validation.isValid || !followerCount.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          EFP (Ethereum Follow Protocol) is a decentralized social graph on Ethereum. 
          This requirement checks the user&apos;s follower count for social validation.
        </p>
      </div>
    </div>
  );
}; 