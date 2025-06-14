'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, Plus, X } from 'lucide-react';

import { GatingRequirement, ENSPatternConfig } from '@/types/locks';
import { validateENSPattern } from '@/lib/requirements/validation';

interface ENSPatternConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const ENSPatternConfigurator: React.FC<ENSPatternConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [patterns, setPatterns] = useState<string[]>(['*.eth']);
  const [newPattern, setNewPattern] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'ens_pattern') {
      const config = editingRequirement.config as ENSPatternConfig;
      if (config.patterns && config.patterns.length > 0) {
        setPatterns(config.patterns);
      }
    }
  }, [editingRequirement]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const hasValidPatterns = patterns.length > 0 && patterns.every(pattern => 
      validateENSPattern(pattern).isValid
    );
    
    setValidation({
      isValid: hasValidPatterns,
      error: !hasValidPatterns ? 'At least one valid ENS pattern is required' : undefined
    });
  }, [patterns]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!validation.isValid || patterns.length === 0) return;

    try {
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'ens_pattern',
        category: 'identity',
        config: {
          patterns: patterns
        } as ENSPatternConfig,
        isValid: true,
        displayName: `ENS Pattern: ${patterns.length === 1 ? patterns[0] : `${patterns.length} patterns`}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save ENS pattern requirement:', error);
      setValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleAddPattern = () => {
    const trimmed = newPattern.trim();
    if (!trimmed) return;
    
    const validation = validateENSPattern(trimmed);
    if (!validation.isValid) {
      setValidation({ isValid: false, error: validation.error });
      return;
    }

    if (patterns.includes(trimmed)) {
      setValidation({ isValid: false, error: 'Pattern already exists' });
      return;
    }

    setPatterns(prev => [...prev, trimmed]);
    setNewPattern('');
    setValidation({ isValid: true });
  };

  const handleRemovePattern = (index: number) => {
    setPatterns(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (newPattern.trim()) {
        handleAddPattern();
      } else if (validation.isValid) {
        handleSave();
      }
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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ENS Pattern Requirement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require specific ENS domain patterns</p>
            </div>
          </div>

          {/* Pattern Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Add ENS Pattern
            </Label>
            
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="e.g., *.eth, vitalik.eth, alice.*"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={disabled}
                  className={`text-sm ${
                    !validation.isValid && validation.error 
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                />
              </div>
              <Button 
                size="sm"
                onClick={handleAddPattern}
                disabled={disabled || !newPattern.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Validation Message */}
            {!validation.isValid && validation.error && (
              <p className="text-sm text-red-600 mt-2">
                {validation.error}
              </p>
            )}

            {/* Current Patterns */}
            {patterns.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Required Patterns ({patterns.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {patterns.map((pattern, index) => (
                    <Badge 
                      key={index}
                      variant="secondary" 
                      className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200"
                    >
                      {pattern}
                      <button
                        onClick={() => handleRemovePattern(index)}
                        disabled={disabled}
                        className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Success Preview */}
            {validation.isValid && patterns.length > 0 && (
              <div className="mt-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  ✓ Users must own ENS domains matching: <strong>{patterns.join(', ')}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Examples */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Pattern Examples:
          </Label>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div><code>*.eth</code> - Any .eth domain</div>
            <div><code>vitalik.eth</code> - Specific domain</div>
            <div><code>alice.*</code> - Any subdomain of alice</div>
            <div><code>team*.eth</code> - Domains starting with &ldquo;team&rdquo;</div>
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
            disabled={disabled || !validation.isValid || patterns.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ENS patterns allow matching specific domain names or wildcards. 
          Use * for wildcards (e.g., *.eth matches all .eth domains).
        </p>
      </div>
    </div>
  );
}; 