/**
 * Gating Categories Container
 * 
 * Main container component for the new multi-category gating system
 * Supports accordion-style expandable categories with unified branding
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Plus, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Settings
} from 'lucide-react';

import { 
  GatingCategory, 
  VerificationStatus, 
  CategoryRendererProps 
} from '@/types/gating';
import { PostSettings, SettingsUtils } from '@/types/settings';
import { categoryRegistry, ensureRegistered } from '@/lib/gating/categoryRegistry';
import { ensureCategoriesRegistered } from '@/lib/gating/registerCategories';

// ===== IMMEDIATE REGISTRATION =====
// Register categories immediately when this module loads
// This ensures registry is populated before any component renders
ensureCategoriesRegistered();

// ===== PROPS INTERFACES =====

/**
 * Props for the main gating categories container
 */
export interface GatingCategoriesContainerProps {
  // Settings management
  settings: PostSettings;
  onChange: (settings: PostSettings) => void;
  disabled?: boolean;
  
  // Display configuration
  mode: 'display' | 'config'; // Display for PostCard, config for post creation
  compact?: boolean; // Compact mode for smaller displays
  
  // User context (for display mode)
  userWallet?: string;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => void;
}

/**
 * Props for individual category accordion items
 */
export interface CategoryAccordionProps {
  category: GatingCategory;
  userStatus?: VerificationStatus;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  mode: 'display' | 'config';
  disabled?: boolean;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => void;
  onUpdateCategory?: (updatedCategory: GatingCategory) => void;
}

// ===== MAIN CONTAINER COMPONENT =====

export const GatingCategoriesContainer: React.FC<GatingCategoriesContainerProps> = ({
  settings,
  onChange,
  disabled = false,
  mode,
  onConnect,
  onDisconnect
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddCategoryMenu, setShowAddCategoryMenu] = useState(false);

  // Ensure categories are registered before using them
  useEffect(() => {
    ensureCategoriesRegistered();
  }, []);

  // Get categories from settings (handles both legacy and new format)
  const categories = SettingsUtils.getGatingCategories(settings);
  const hasAnyGating = SettingsUtils.hasAnyGating(settings);
  const displayMode = SettingsUtils.getGatingDisplayMode(settings);

  // Track enabled categories for badge display
  const enabledCategories = categories.filter(cat => cat.enabled);

  // Handle category expansion
  const handleToggleCategory = (categoryType: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryType)) {
      newExpanded.delete(categoryType);
    } else {
      newExpanded.add(categoryType);
    }
    setExpandedCategories(newExpanded);
  };

  // Handle category updates (for config mode)
  const handleUpdateCategory = (updatedCategory: GatingCategory) => {
    const updatedCategories = categories.map(cat => 
      cat.type === updatedCategory.type ? updatedCategory : cat
    );
    
    const newSettings: PostSettings = {
      ...settings,
      responsePermissions: {
        ...settings.responsePermissions,
        categories: updatedCategories
      }
    };

    onChange(newSettings);
  };

  // Handle adding new category (for config mode)
  const handleAddCategory = (categoryType: string) => {
    if (!categoryRegistry.isSupported(categoryType)) {
      console.error(`Category type ${categoryType} is not supported`);
      return;
    }

    const renderer = ensureRegistered(categoryType);
    const newCategory: GatingCategory = {
      type: categoryType,
      enabled: true,
      requirements: renderer.getDefaultRequirements()
    };

    const updatedCategories = [...categories, newCategory];
    const newSettings: PostSettings = {
      ...settings,
      responsePermissions: {
        ...settings.responsePermissions,
        categories: updatedCategories
      }
    };

    onChange(newSettings);
    setShowAddCategoryMenu(false);
    
    // Auto-expand the new category
    setExpandedCategories(prev => new Set(prev).add(categoryType));
  };

  // Handle removing category (for config mode)
  // const handleRemoveCategory = (categoryType: string) => {
  //   const updatedCategories = categories.filter(cat => cat.type !== categoryType);
  //   
  //   const newSettings: PostSettings = {
  //     ...settings,
  //     responsePermissions: {
  //       ...settings.responsePermissions,
  //       categories: updatedCategories
  //     }
  //   };
  //
  //   onChange(newSettings);
  // };

  // If no gating in display mode, don't render anything
  if (mode === 'display' && !hasAnyGating) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed border-muted hover:border-primary/70 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">
              {mode === 'config' ? 'Response Gating' : 'Gated Post Requirements'}
            </CardTitle>
            {mode === 'config' && <HelpCircle className="h-3 w-3 text-muted-foreground" />}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status badges */}
            {enabledCategories.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {enabledCategories.length} Active
              </Badge>
            )}
            
            {/* Legacy indicator */}
            {displayMode === 'legacy' && (
              <Badge variant="outline" className="text-xs opacity-70">
                Legacy
              </Badge>
            )}
            
            {/* Global enable/disable for config mode */}
            {mode === 'config' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (enabledCategories.length > 0) {
                    // Disable all categories
                    const updatedCategories = categories.map(cat => ({ ...cat, enabled: false }));
                    onChange({
                      ...settings,
                      responsePermissions: {
                        ...settings.responsePermissions,
                        categories: updatedCategories
                      }
                    });
                  } else {
                    // Enable all categories (or add default if none exist)
                    if (categories.length === 0) {
                      handleAddCategory('universal_profile');
                    } else {
                      const updatedCategories = categories.map(cat => ({ ...cat, enabled: true }));
                      onChange({
                        ...settings,
                        responsePermissions: {
                          ...settings.responsePermissions,
                          categories: updatedCategories
                        }
                      });
                    }
                  }
                }}
                disabled={disabled}
                className="h-auto px-2 py-1"
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {hasAnyGating && (
        <CardContent className="pt-0 space-y-3">
          {/* Category accordions */}
          {categories.map((category) => (
            <CategoryAccordion
              key={category.type}
              category={category}
              isExpanded={expandedCategories.has(category.type)}
              onToggleExpanded={() => handleToggleCategory(category.type)}
              mode={mode}
              disabled={disabled}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onUpdateCategory={mode === 'config' ? handleUpdateCategory : undefined}
            />
          ))}

          {/* Add category button (config mode only) */}
          {mode === 'config' && (
            <div className="pt-2 border-t border-border/50">
              {!showAddCategoryMenu ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCategoryMenu(true)}
                  disabled={disabled}
                  className="w-full text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Gating Category
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Add Category:</div>
                  <div className="grid grid-cols-1 gap-2">
                    {categoryRegistry.list().map(({ type, metadata }) => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddCategory(type)}
                        disabled={disabled || categories.some(cat => cat.type === type)}
                        className="justify-start text-xs"
                      >
                        <span className="mr-2">{metadata.icon}</span>
                        {metadata.name}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddCategoryMenu(false)}
                    className="w-full text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}

      {/* Empty state for config mode */}
      {mode === 'config' && !hasAnyGating && (
        <CardContent className="pt-0">
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No gating requirements configured</p>
            <p className="text-xs mt-1">Add categories to control who can comment</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCategoryMenu(true)}
              disabled={disabled}
              className="mt-3 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add First Category
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// ===== CATEGORY ACCORDION COMPONENT =====

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  category,
  userStatus,
  isExpanded,
  onToggleExpanded,
  mode,
  disabled,
  onConnect,
  onDisconnect,
  onUpdateCategory
}) => {
  // Get the renderer for this category type
  const renderer = categoryRegistry.get(category.type);
  
  if (!renderer) {
    console.error(`No renderer found for category type: ${category.type}`);
    return (
      <div className="p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          Unsupported category: {category.type}
        </p>
      </div>
    );
  }

  const metadata = renderer.getMetadata();

  // Mock user status for config mode
  const mockUserStatus: VerificationStatus = {
    connected: false,
    verified: false,
    requirements: []
  };

  const effectiveUserStatus = mode === 'display' && userStatus ? userStatus : mockUserStatus;

  // Props for the renderer
  const rendererProps: CategoryRendererProps = {
    category,
    userStatus: effectiveUserStatus,
    isExpanded,
    onToggleExpanded,
    onConnect: onConnect || (async () => {
      console.warn('[GatingCategoriesContainer] No onConnect function provided');
    }),
    onDisconnect: onDisconnect || (() => {
      console.warn('[GatingCategoriesContainer] No onDisconnect function provided');
    }),
    disabled
  };

  if (mode === 'display') {
    // Display mode: show the category status and requirements
    return renderer.renderDisplay(rendererProps);
  } else {
    // Config mode: show the category configuration interface
    return (
      <Card className="border border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>{metadata.icon}</span>
              <span className="font-medium text-sm">{metadata.name}</span>
              <Badge 
                variant={category.enabled ? "default" : "secondary"} 
                className="text-xs"
              >
                {category.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
                className="h-auto p-1"
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Enable/disable toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={category.enabled}
                  onChange={(e) => {
                    if (onUpdateCategory) {
                      onUpdateCategory({ ...category, enabled: e.target.checked });
                    }
                  }}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <span className="text-sm">Enable {metadata.name} verification</span>
              </div>

              {/* Category-specific configuration */}
              {category.enabled && renderer.renderConfig({
                requirements: category.requirements,
                onChange: (newRequirements) => {
                  if (onUpdateCategory) {
                    onUpdateCategory({ ...category, requirements: newRequirements });
                  }
                },
                disabled
              })}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }
}; 