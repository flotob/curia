'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Edit3, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

import { GatingRequirement, RequirementCategory } from '@/types/locks';
import { useLockBuilder } from './LockBuilderProvider';

// Category metadata for grouping and display
const CATEGORY_INFO = {
  token: {
    name: 'Token Requirements',
    icon: '🪙',
    color: 'text-blue-600 dark:text-blue-400'
  },
  social: {
    name: 'Social Requirements', 
    icon: '👥',
    color: 'text-green-600 dark:text-green-400'
  },
  identity: {
    name: 'Identity Requirements',
    icon: '🌐', 
    color: 'text-purple-600 dark:text-purple-400'
  }
} as const;

// Helper function to format requirement display names
const formatRequirementDisplay = (requirement: GatingRequirement): string => {
  if (requirement.displayName) {
    return requirement.displayName;
  }
  
  // Fallback formatting based on type with proper type guards
  switch (requirement.type) {
    case 'lyx_balance':
      const lyxConfig = requirement.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      return `LYX Balance: ≥ ${parseInt(lyxConfig.minAmount || '0') / 1e18} LYX`;
    case 'eth_balance':
      const ethConfig = requirement.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      return `ETH Balance: ≥ ${parseInt(ethConfig.minAmount || '0') / 1e18} ETH`;
    case 'up_follower_count':
      const upConfig = requirement.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      return `UP Followers: ≥ ${upConfig.minCount || 0} followers`;
    case 'efp_follower_count':
      const efpConfig = requirement.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      return `EFP Followers: ≥ ${efpConfig.minCount || 0} followers`;
    case 'ens_domain':
      return 'ENS Domain Required';
    default:
      return `${requirement.type.replace(/_/g, ' ')}`;
  }
};

interface RequirementsListProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export const RequirementsList: React.FC<RequirementsListProps> = ({
  searchTerm = '',
  onSearchChange
}) => {
  const { state, removeRequirement, updateFulfillmentMode, updateCategoryFulfillment, navigateToRequirementPicker, navigateToRequirementConfig } = useLockBuilder();
  const { requirements, fulfillmentMode, categoryFulfillment } = state;

  // Group requirements by category
  const groupedRequirements = requirements.reduce((groups, requirement) => {
    if (!groups[requirement.category]) {
      groups[requirement.category] = [];
    }
    groups[requirement.category].push(requirement);
    return groups;
  }, {} as Record<RequirementCategory, GatingRequirement[]>);

  // Filter requirements based on search term
  const filteredRequirements = searchTerm 
    ? requirements.filter(req => 
        formatRequirementDisplay(req).toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : requirements;

  const handleAddRequirement = () => {
    navigateToRequirementPicker();
  };

  const handleEditRequirement = (id: string) => {
    // Find the requirement to get its type
    const requirement = requirements.find(req => req.id === id);
    if (requirement) {
      navigateToRequirementConfig(requirement.type, id);
    }
  };

  const handleRemoveRequirement = (id: string) => {
    removeRequirement(id);
  };

  // Empty state
  if (requirements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 mx-auto bg-muted rounded-xl flex items-center justify-center mb-4">
          <Plus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No requirements yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Add your first gating requirement to control who can access content with this lock.
        </p>
        <Button onClick={handleAddRequirement} className="flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Requirement
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search requirements..."
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Fulfillment Mode Toggle - Only show if there are requirements */}
      {requirements.length > 0 && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Ecosystem Fulfillment Logic</h4>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => updateFulfillmentMode('any')}
              className={cn(
                'px-3 py-2 text-sm rounded-md font-medium transition-colors',
                fulfillmentMode === 'any'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Require ANY
            </button>
            <button
              onClick={() => updateFulfillmentMode('all')}
              className={cn(
                'px-3 py-2 text-sm rounded-md font-medium transition-colors',
                fulfillmentMode === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Require ALL
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {fulfillmentMode === 'any' 
              ? 'Users need to satisfy ANY ONE ecosystem (e.g., Universal Profile OR Ethereum Profile).'
              : 'Users must satisfy ALL ecosystems (e.g., Universal Profile AND Ethereum Profile).'
            }
          </p>
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Current Requirements ({requirements.length})
          </h3>
          <Button onClick={handleAddRequirement} size="sm" className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Requirement
          </Button>
        </div>

        {/* Display by category groups */}
        {Object.entries(groupedRequirements).map(([category, categoryRequirements]) => {
          const categoryInfo = CATEGORY_INFO[category as RequirementCategory];
          
          return (
            <div key={category} className="space-y-2">
              {/* Category Header */}
              <div className="space-y-3 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{categoryInfo.icon}</span>
                  <h4 className={cn('font-medium', categoryInfo.color)}>
                    {categoryInfo.name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {categoryRequirements.length}
                  </Badge>
                </div>

                {/* 🚀 NEW: Per-Category Fulfillment Controls */}
                {categoryRequirements.length > 1 && (
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-muted-foreground">Within this category:</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => updateCategoryFulfillment(category as RequirementCategory, 'any')}
                        className={cn(
                          'px-2 py-1 text-xs rounded font-medium transition-colors',
                          categoryFulfillment[category as RequirementCategory] === 'any'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'
                        )}
                      >
                        ANY
                      </button>
                      <button
                        onClick={() => updateCategoryFulfillment(category as RequirementCategory, 'all')}
                        className={cn(
                          'px-2 py-1 text-xs rounded font-medium transition-colors',
                          categoryFulfillment[category as RequirementCategory] === 'all'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'
                        )}
                      >
                        ALL
                      </button>
                    </div>
                    <span className="text-muted-foreground">
                      {categoryFulfillment[category as RequirementCategory] === 'any'
                        ? `(user needs any 1 of ${categoryRequirements.length})`
                        : `(user needs all ${categoryRequirements.length})`
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Category Requirements */}
              <div className="space-y-2 pl-6">
                {categoryRequirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm truncate">
                          {formatRequirementDisplay(requirement)}
                        </span>
                        {!requirement.isValid && (
                          <Badge variant="destructive" className="text-xs">
                            Invalid
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRequirement(requirement.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRequirement(requirement.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtered results message */}
      {searchTerm && filteredRequirements.length !== requirements.length && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Showing {filteredRequirements.length} of {requirements.length} requirements
        </div>
      )}
    </div>
  );
}; 