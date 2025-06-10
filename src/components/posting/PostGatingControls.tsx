'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { PostSettings } from '@/types/settings';
import { GatingCategory, GatingCategoryMetadata } from '@/types/gating';
import { Shield, X, HelpCircle } from 'lucide-react';
import { getAvailableCategories } from '@/lib/gating/registerCategories';
import { categoryRegistry } from '@/lib/gating/categoryRegistry';

interface PostGatingControlsProps {
  value?: PostSettings['responsePermissions'];
  onChange: (value: PostSettings['responsePermissions']) => void;
  disabled?: boolean;
}

export const PostGatingControls: React.FC<PostGatingControlsProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Array<{ type: string; metadata: GatingCategoryMetadata }>>([]);
  
  // Multi-category state
  const currentCategories = value?.categories || [];
  const hasAnyGating = currentCategories.length > 0;
  
  // Legacy UP gating support (for backward compatibility)
  const legacyUpGating = value?.upGating;
  const hasLegacyGating = legacyUpGating?.enabled || false;
  
  // Combined gating state
  const hasGating = hasAnyGating || hasLegacyGating;

  // Helper to update gating settings
  const updateGatingSettings = useCallback((updates: Partial<PostSettings['responsePermissions']>) => {
    const newValue = {
      ...value,
      ...updates
    };
    onChange(newValue);
  }, [value, onChange]);

  // Load available categories on mount
  useEffect(() => {
    const categories = getAvailableCategories();
    setAvailableCategories(categories);
    console.log('[PostGatingControls] Available categories:', categories);
  }, []);

  // Migrate legacy format to categories if needed
  useEffect(() => {
    if (hasLegacyGating && !hasAnyGating && legacyUpGating) {
      console.log('[PostGatingControls] Migrating legacy UP gating to categories');
      const upCategory: GatingCategory = {
        type: 'universal_profile',
        enabled: legacyUpGating.enabled,
        requirements: legacyUpGating.requirements
      };
      
      updateGatingSettings({
        categories: [upCategory],
        requireAny: true,
        // Keep legacy format for backward compatibility
        upGating: legacyUpGating
      });
    }
  }, [hasLegacyGating, hasAnyGating, legacyUpGating, updateGatingSettings]);

  // Helper to get current category by type
  const getCurrentCategory = (type: string): GatingCategory | null => {
    return currentCategories.find(cat => cat.type === type) || null;
  };

  // Helper to check if category is enabled
  const isCategoryEnabled = (type: string): boolean => {
    const category = getCurrentCategory(type);
    return category?.enabled || false;
  };

  // Toggle category enabled/disabled
  const toggleCategory = (type: string, enabled: boolean) => {
    const existingCategories = currentCategories.filter(cat => cat.type !== type);
    
    if (enabled) {
      // Add category with default requirements
      const renderer = categoryRegistry.get(type);
      if (!renderer) {
        console.error(`[PostGatingControls] No renderer found for category: ${type}`);
        return;
      }

      const newCategory: GatingCategory = {
        type,
        enabled: true,
        requirements: renderer.getDefaultRequirements()
      };

      const updatedCategories = [...existingCategories, newCategory];
      updateGatingSettings({ 
        categories: updatedCategories,
        requireAny: true // Default behavior
      });
    } else {
      // Remove category
      updateGatingSettings({ 
        categories: existingCategories.length > 0 ? existingCategories : undefined
      });
    }

    // Auto-expand when enabling first category
    if (enabled && !hasGating) {
      setIsExpanded(true);
    }
  };

  // Update category requirements
  const updateCategoryRequirements = (type: string, requirements: unknown) => {
    const updatedCategories = currentCategories.map(cat => 
      cat.type === type ? { ...cat, requirements } : cat
    );
    updateGatingSettings({ categories: updatedCategories });
  };

  return (
    <Card className="border-2 border-dashed border-muted hover:border-primary/70 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Response Gating</CardTitle>
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="flex items-center space-x-2">
            {hasGating && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Gated
              </Badge>
            )}
            <input
              type="checkbox"
              checked={hasGating}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (!e.target.checked) {
                  // Disable all gating
                  updateGatingSettings({ categories: undefined, upGating: undefined });
                } else {
                  // Enable gating and show options
                  setIsExpanded(true);
                }
              }}
              disabled={disabled}
              className="h-4 w-4"
            />
          </div>
        </div>
      </CardHeader>

      {(hasGating || isExpanded) && (
        <CardContent className="pt-0 space-y-4">
          {/* Category Selection */}
          {!hasGating && isExpanded && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Gating Methods:</Label>
              {availableCategories.map((categoryInfo) => {
                const isEnabled = isCategoryEnabled(categoryInfo.type);
                const renderer = categoryRegistry.get(categoryInfo.type);
                const metadata = renderer?.getMetadata();
                
                return (
                  <div key={categoryInfo.type} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => toggleCategory(categoryInfo.type, e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-lg">{metadata?.icon || '🔒'}</span>
                      <div>
                        <div className="font-medium text-sm">{metadata?.name || categoryInfo.type}</div>
                        <div className="text-xs text-muted-foreground">{metadata?.description || 'Configure requirements'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Categories Configuration */}
          {hasGating && (
            <div className="space-y-4">
              {!isExpanded && (
                <div className="space-y-2">
                  {/* Quick summary view */}
                  <div className="text-sm text-muted-foreground">
                    Active gating: {currentCategories.map(cat => {
                      const renderer = categoryRegistry.get(cat.type);
                      const metadata = renderer?.getMetadata();
                      return metadata?.shortName || cat.type;
                    }).join(', ')}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpanded(true)}
                    className="w-full"
                  >
                    Configure Gating Requirements
                  </Button>
                </div>
              )}

              {isExpanded && (
                <div className="space-y-6">
                  {/* Category management */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Active Gating Categories:</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsExpanded(false)}>
                        Collapse
                      </Button>
                    </div>
                    
                    {/* Show active categories */}
                    {currentCategories.map((category) => {
                      const renderer = categoryRegistry.get(category.type);
                      const metadata = renderer?.getMetadata();
                      
                      return (
                        <div key={category.type} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{metadata?.icon || '🔒'}</span>
                              <div>
                                <div className="font-medium text-sm">{metadata?.name || category.type}</div>
                                <div className="text-xs text-muted-foreground">{metadata?.description}</div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleCategory(category.type, false)}
                              disabled={disabled}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {/* Category configuration */}
                          {renderer && (
                            <div className="ml-6">
                              {renderer.renderConfig({
                                requirements: category.requirements,
                                onChange: (newReqs) => updateCategoryRequirements(category.type, newReqs),
                                disabled
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add more categories */}
                    {currentCategories.length < availableCategories.length && (
                      <div className="border-2 border-dashed rounded-lg p-4">
                        <Label className="text-sm font-medium mb-3 block">Add More Gating Methods:</Label>
                        <div className="space-y-2">
                          {availableCategories
                            .filter(catInfo => !isCategoryEnabled(catInfo.type))
                            .map((categoryInfo) => {
                              const renderer = categoryRegistry.get(categoryInfo.type);
                              const metadata = renderer?.getMetadata();
                              
                              return (
                                <Button
                                  key={categoryInfo.type}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleCategory(categoryInfo.type, true)}
                                  disabled={disabled}
                                  className="w-full justify-start"
                                >
                                  <span className="mr-2">{metadata?.icon || '🔒'}</span>
                                  Add {metadata?.name || categoryInfo.type}
                                </Button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}; 