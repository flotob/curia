'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users } from 'lucide-react';

import { GatingRequirement, UPFollowerCountConfig } from '@/types/locks';
import { validateFollowerCount } from '@/lib/requirements/validation';

interface UPFollowerCountConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const UPFollowerCountConfigurator: React.FC<UPFollowerCountConfiguratorProps> = ({
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
    if (editingRequirement && editingRequirement.type === 'up_follower_count') {
      const config = editingRequirement.config as UPFollowerCountConfig;
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
        type: 'up_follower_count',
        category: 'social',
        config: {
          minCount: count
        } as UPFollowerCountConfig,
        isValid: true,
        displayName: `UP Followers: ≥ ${count.toLocaleString()} followers`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save UP follower count requirement:', error);
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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 transition-all duration-300 hover:shadow-lg hover:border-green-300">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">UP Follower Requirement</h3>
              <p className="text-sm text-gray-600">Minimum Universal Profile followers required</p>
            </div>
          </div>

          {/* Count Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
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
                      ? 'border-green-200 focus:border-green-400 focus:ring-green-400' 
                      : followerCount.trim() 
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                  }`}
                />
              </div>
              <div className="flex items-center px-4 bg-green-100 rounded-lg border border-green-200">
                <span className="text-sm font-medium text-green-800">followers</span>
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
              <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  ✓ Users need at least <strong>{parseInt(followerCount).toLocaleString()} followers</strong> on their Universal Profile
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
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500">
          Universal Profiles are digital identities on LUKSO. This requirement checks the user&apos;s follower count for social validation.
        </p>
      </div>
    </div>
  );
}; 