/**
 * Multi-Category Connection Component
 * 
 * Generic component for handling verification UI across multiple gating categories
 * Individual renderers now handle their own connection and verification logic
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { PostSettings, SettingsUtils } from '@/types/settings';
import { categoryRegistry } from '@/lib/gating/categoryRegistry';
import { ensureCategoriesRegistered } from '@/lib/gating/registerCategories';

// ===== IMMEDIATE REGISTRATION =====
// Register categories immediately when this module loads
ensureCategoriesRegistered();

// ===== INTERFACES =====

export interface MultiCategoryConnectionProps {
  postSettings: PostSettings;
  disabled?: boolean;
  className?: string;
}

// ===== MAIN COMPONENT =====

export const MultiCategoryConnection: React.FC<MultiCategoryConnectionProps> = ({
  postSettings,
  disabled = false,
  className = ''
}) => {
  
  // ===== STATE MANAGEMENT =====
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // ===== DERIVED STATE =====
  
  // Get all enabled categories from post settings
  const activeCategories = SettingsUtils.getGatingCategories(postSettings);
  const requireAll = postSettings.responsePermissions?.requireAll || false;
  const hasAnyGating = activeCategories.length > 0;
  
  // ===== CATEGORY HELPERS =====
  
  const toggleCategoryExpanded = useCallback((categoryType: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryType)) {
        newSet.delete(categoryType);
      } else {
        newSet.add(categoryType);
      }
      return newSet;
    });
  }, []);
  
  // ===== CONNECTION HANDLERS =====
  
  const handleCategoryConnect = useCallback(async (categoryType: string) => {
    console.log(`[MultiCategoryConnection] Connect requested for ${categoryType}`);
    
    // The actual connection logic is now handled by the individual renderers
    // For UP: InlineUPConnection handles the real UP connection
    // For Ethereum: EthereumConnectionWidget handles the real wallet connection
    
    // Just expand the category so users can see the connection interface
    setExpandedCategories(prev => new Set(prev).add(categoryType));
  }, []);
  
  const handleCategoryDisconnect = useCallback((categoryType: string) => {
    console.log(`[MultiCategoryConnection] Disconnect requested for ${categoryType}`);
    
    // The actual disconnection logic is handled by the individual renderers
    // For UP: InlineUPConnection handles UP disconnection
    // For Ethereum: EthereumConnectionWidget handles wallet disconnection
    
    // Just collapse the category for UI coordination
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(categoryType);
      return newSet;
    });
  }, []);
  
  // ===== RENDER =====
  
  // Don't render if no gating is enabled
  if (!hasAnyGating) {
    return null;
  }
  
  return (
    <Card className={`border-2 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-sm">
              <Shield className="h-4 w-4 mr-2" />
              Verification Required
            </CardTitle>
            <CardDescription className="text-xs">
              {requireAll 
                ? `You must satisfy ALL ${activeCategories.length} requirements to comment`
                : `You must satisfy ANY of ${activeCategories.length} requirements to comment`
              }
            </CardDescription>
          </div>
          
          {/* Overall Status */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Expand categories below</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Category List */}
        {activeCategories.map((category) => {
          const renderer = categoryRegistry.get(category.type);
          const isExpanded = expandedCategories.has(category.type);
          
          if (!renderer) {
            return (
              <div key={category.type} className="p-3 border rounded-lg bg-red-50 border-red-200">
                <div className="text-sm text-red-800">Error: No renderer for {category.type}</div>
              </div>
            );
          }
          
          const metadata = renderer.getMetadata();
          
          return (
            <div key={category.type} className="border rounded-lg">
              {/* Category Header */}
              <div 
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                onClick={() => toggleCategoryExpanded(category.type)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{metadata.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{metadata.name}</div>
                    <div className="text-xs text-muted-foreground">{metadata.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Connection Status Badge - Simplified since renderers manage their own state */}
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    {metadata.name}
                  </Badge>
                  
                  {/* Expand/Collapse Icon */}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {/* Category Content (Expanded) */}
              {isExpanded && (
                <div className="border-t p-4 bg-muted/20">
                  {renderer.renderConnection({
                    requirements: category.requirements,
                    onConnect: () => handleCategoryConnect(category.type),
                    onDisconnect: () => handleCategoryDisconnect(category.type),
                    userStatus: undefined, // Renderers manage their own status
                    disabled: disabled
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Overall Action Button */}
        <div className="pt-4 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-2">
              {requireAll 
                ? `Connect and verify all ${activeCategories.length} categories above`
                : `Connect and verify any one of the categories above`
              }
            </div>
            <div className="text-xs text-muted-foreground">
              Individual components handle verification status
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 