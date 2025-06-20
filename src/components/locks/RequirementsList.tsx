'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit3, Plus, ChevronDown, ChevronRight } from 'lucide-react';
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequirementsListProps {
  // No props needed - component manages its own state
}

export const RequirementsList: React.FC<RequirementsListProps> = () => {
  const { state, removeRequirement, updateFulfillmentMode, updateEcosystemFulfillment, navigateToRequirementPicker, navigateToRequirementConfig } = useLockBuilder();
  const { requirements, fulfillmentMode, ecosystemFulfillment } = state;
  const [isAdvancedExpanded, setIsAdvancedExpanded] = React.useState(false);

  // Helper function to determine which ecosystem a requirement belongs to
  const getRequirementEcosystem = (requirementType: string): 'universal_profile' | 'ethereum_profile' => {
    const upTypes = ['lyx_balance', 'lsp7_token', 'lsp8_nft', 'up_follower_count', 'up_must_follow', 'up_must_be_followed_by'];
    const ethTypes = ['eth_balance', 'erc20_token', 'erc721_nft', 'erc1155_token', 'ens_domain', 'ens_pattern', 'efp_follower_count', 'efp_must_follow', 'efp_must_be_followed_by'];
    
    if (upTypes.includes(requirementType)) {
      return 'universal_profile';
    } else if (ethTypes.includes(requirementType)) {
      return 'ethereum_profile';
    } else {
      // Default to ethereum_profile for unknown types
      return 'ethereum_profile';
    }
  };

  // Check what ecosystems are represented for the explanation text
  const representedEcosystems = new Set(requirements.map(req => getRequirementEcosystem(req.type)));

  // Group requirements by category
  const groupedRequirements = requirements.reduce((groups, requirement) => {
    if (!groups[requirement.category]) {
      groups[requirement.category] = [];
    }
    groups[requirement.category].push(requirement);
    return groups;
  }, {} as Record<RequirementCategory, GatingRequirement[]>);

  // No filtering needed since search is removed

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
      {/* Advanced Gating Logic - Collapsible */}
      {requirements.length > 0 && (
        <div className="bg-muted/50 border border-border rounded-lg">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/70 transition-colors rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-foreground">Advanced Gating Logic</span>
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            </div>
            {isAdvancedExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Collapsible Content */}
          {isAdvancedExpanded && (
            <div className="px-4 pb-4 space-y-4 border-t border-border">
              {/* Global Ecosystem Fulfillment */}
              <div className="pt-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Between Ecosystems</h4>
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
                  {(() => {
                    const ecosystemNames = Array.from(representedEcosystems).map(e => 
                      e === 'universal_profile' ? 'Lukso' : 'Ethereum'
                    );
                    if (ecosystemNames.length > 1) {
                      return fulfillmentMode === 'any' 
                        ? `Users need to satisfy ANY ONE ecosystem (${ecosystemNames.join(' OR ')}).`
                        : `Users must satisfy ALL ecosystems (${ecosystemNames.join(' AND ')}).`;
                    } else if (ecosystemNames.length === 1) {
                      return `Users must satisfy ${ecosystemNames[0]} ecosystem requirements.`;
                    } else {
                      return fulfillmentMode === 'any' 
                        ? 'Users need to satisfy ANY ONE ecosystem (Lukso OR Ethereum).'
                        : 'Users must satisfy ALL ecosystems (Lukso AND Ethereum).';
                    }
                  })()}
                </p>
              </div>

              {/* Per-Ecosystem Fulfillment Controls */}
              {representedEcosystems.size > 0 && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Within Each Ecosystem</h4>
                  <div className="space-y-3">
                    {/* Lukso Ecosystem Controls */}
                    {representedEcosystems.has('universal_profile') && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground font-medium">Within Lukso ecosystem:</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => updateEcosystemFulfillment('universal_profile', 'any')}
                            className={cn(
                              'px-2 py-1 text-xs rounded font-medium transition-colors',
                              ecosystemFulfillment.universal_profile === 'any'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'
                            )}
                          >
                            ANY
                          </button>
                          <button
                            onClick={() => updateEcosystemFulfillment('universal_profile', 'all')}
                            className={cn(
                              'px-2 py-1 text-xs rounded font-medium transition-colors',
                              ecosystemFulfillment.universal_profile === 'all'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'
                            )}
                          >
                            ALL
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Ethereum Ecosystem Controls */}
                    {representedEcosystems.has('ethereum_profile') && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground font-medium">Within Ethereum ecosystem:</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => updateEcosystemFulfillment('ethereum_profile', 'any')}
                            className={cn(
                              'px-2 py-1 text-xs rounded font-medium transition-colors',
                              ecosystemFulfillment.ethereum_profile === 'any'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'
                            )}
                          >
                            ANY
                          </button>
                          <button
                            onClick={() => updateEcosystemFulfillment('ethereum_profile', 'all')}
                            className={cn(
                              'px-2 py-1 text-xs rounded font-medium transition-colors',
                              ecosystemFulfillment.ethereum_profile === 'all'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'
                            )}
                          >
                            ALL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-3">
                    Fine-tune how requirements within each ecosystem are fulfilled.
                  </p>
                </div>
              )}
            </div>
          )}
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

                {/* Removed per-category switchers - now using per-ecosystem switchers at top */}
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

      {/* No filtered results message needed since search is removed */}
    </div>
  );
}; 