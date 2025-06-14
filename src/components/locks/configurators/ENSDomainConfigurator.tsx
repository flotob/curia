'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Globe, CheckCircle } from 'lucide-react';

import { GatingRequirement, ENSDomainConfig } from '@/types/locks';

interface ENSDomainConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const ENSDomainConfigurator: React.FC<ENSDomainConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [requiresENS, setRequiresENS] = useState(true); // Always true for this requirement type

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'ens_domain') {
      const config = editingRequirement.config as ENSDomainConfig;
      setRequiresENS(config.requiresENS ?? true);
    }
  }, [editingRequirement]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    try {
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'ens_domain',
        category: 'identity',
        config: {
          requiresENS: requiresENS
        } as ENSDomainConfig,
        isValid: true,
        displayName: 'ENS Domain Required'
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save ENS domain requirement:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ENS Domain Requirement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require ownership of any ENS domain</p>
            </div>
          </div>

          {/* Information Display */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                  ENS Domain Required
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Users must own at least one ENS domain (*.eth) to access gated content. 
                  This verifies their identity on the Ethereum ecosystem.
                </p>
              </div>
            </div>

            {/* Example domains */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Examples of valid ENS domains:
              </Label>
              <div className="flex flex-wrap gap-2">
                {['vitalik.eth', 'alice.eth', 'myname.eth'].map((domain) => (
                  <span 
                    key={domain}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>

            {/* Success Preview */}
            <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                ✓ Users must own an ENS domain (.eth) to access content
              </p>
            </div>
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
            disabled={disabled}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onKeyDown={handleKeyPress}
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ENS (Ethereum Name Service) domains provide human-readable names for Ethereum addresses. 
          Requiring ENS ownership adds identity verification to your gating.
        </p>
      </div>
    </div>
  );
}; 