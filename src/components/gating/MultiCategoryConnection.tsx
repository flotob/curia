/**
 * Multi-Category Connection Component
 * 
 * Generic component for handling verification UI across multiple gating categories
 * Replaces hardcoded InlineUPConnection with extensible category-based system
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { PostSettings, SettingsUtils } from '@/types/settings';
import { VerificationResult } from '@/types/gating';
import { categoryRegistry } from '@/lib/gating/categoryRegistry';
import { ensureCategoriesRegistered } from '@/lib/gating/registerCategories';

// ===== IMMEDIATE REGISTRATION =====
// Register categories immediately when this module loads
ensureCategoriesRegistered();

// ===== INTERFACES =====

export interface MultiCategoryConnectionProps {
  postSettings: PostSettings;
  onVerificationComplete?: (results: Map<string, VerificationResult>) => void;
  disabled?: boolean;
  className?: string;
}

interface CategoryConnectionState {
  connected: boolean;
  connecting: boolean;
  verified: boolean;
  verifying: boolean;
  address?: string;
  error?: string;
  verificationResult?: VerificationResult;
}

// ===== MAIN COMPONENT =====

export const MultiCategoryConnection: React.FC<MultiCategoryConnectionProps> = ({
  postSettings,
  onVerificationComplete,
  disabled = false,
  className = ''
}) => {
  
  // ===== STATE MANAGEMENT =====
  
  const [categoryStates, setCategoryStates] = useState<Map<string, CategoryConnectionState>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [overallStatus, setOverallStatus] = useState<'idle' | 'connecting' | 'verifying' | 'ready' | 'failed'>('idle');
  
  // ===== DERIVED STATE =====
  
  // Get all enabled categories from post settings
  const activeCategories = SettingsUtils.getGatingCategories(postSettings);
  const requireAll = postSettings.responsePermissions?.requireAll || false;
  const hasAnyGating = activeCategories.length > 0;
  
  // Calculate overall verification status
  const verifiedCount = Array.from(categoryStates.values()).filter(state => state.verified).length;
  const errorCount = Array.from(categoryStates.values()).filter(state => state.error).length;
  
  const allVerified = verifiedCount === activeCategories.length;
  const anyVerified = verifiedCount > 0;
  
  const meetsRequirements = requireAll ? allVerified : anyVerified;
  
  // ===== CATEGORY HELPERS =====
  
  const getCategoryState = useCallback((categoryType: string): CategoryConnectionState => {
    return categoryStates.get(categoryType) || {
      connected: false,
      connecting: false,
      verified: false,
      verifying: false
    };
  }, [categoryStates]);
  
  const updateCategoryState = useCallback((categoryType: string, updates: Partial<CategoryConnectionState>) => {
    setCategoryStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(categoryType) || {
        connected: false,
        connecting: false,
        verified: false,
        verifying: false
      };
      newMap.set(categoryType, { ...currentState, ...updates });
      return newMap;
    });
  }, []);
  
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
    const renderer = categoryRegistry.get(categoryType);
    if (!renderer) {
      console.error(`[MultiCategoryConnection] No renderer found for category: ${categoryType}`);
      return;
    }
    
    updateCategoryState(categoryType, { connecting: true, error: undefined });
    
    try {
      // TODO: Implement actual connection logic based on category type
      // For now, simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful connection
      const mockAddress = categoryType === 'universal_profile' 
        ? '0x1234...5678' 
        : '0xabcd...efgh';
      
            updateCategoryState(categoryType, {
        connecting: false,
        connected: true,
        address: mockAddress
      });
      
      // Auto-expand the category when connected
      setExpandedCategories(prev => new Set(prev).add(categoryType));
      
      // Start verification immediately with the connected address (no need to wait for state)
      handleCategoryVerify(categoryType, mockAddress);
      
         } catch (error) {
       console.error(`[MultiCategoryConnection] Connection failed for ${categoryType}:`, error);
       updateCategoryState(categoryType, {
         connecting: false,
         error: error instanceof Error ? error.message : 'Connection failed'
       });
     }
   }, [updateCategoryState]);
  
  const handleCategoryDisconnect = useCallback((categoryType: string) => {
    updateCategoryState(categoryType, {
      connected: false,
      connecting: false,
      verified: false,
      verifying: false,
      address: undefined,
      error: undefined,
      verificationResult: undefined
    });
    
    // Collapse the category when disconnected
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(categoryType);
      return newSet;
    });
  }, [updateCategoryState]);
  
  const handleCategoryVerify = useCallback(async (categoryType: string, connectedAddress?: string) => {
    const renderer = categoryRegistry.get(categoryType);
    const category = activeCategories.find(cat => cat.type === categoryType);
    const state = getCategoryState(categoryType);
    
    // Use passed address or fall back to state address
    const addressToUse = connectedAddress || state.address;
    
    if (!renderer || !category || !addressToUse) {
      console.error(`[MultiCategoryConnection] Cannot verify ${categoryType}: missing renderer, category, or address`);
      return;
    }
    
    updateCategoryState(categoryType, { verifying: true, error: undefined });
    
    try {
      // TODO: Implement actual verification logic
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock verification result
      const mockResult: VerificationResult = {
        isValid: Math.random() > 0.3, // 70% success rate for testing
        missingRequirements: [],
        errors: []
      };
      
      if (!mockResult.isValid) {
        mockResult.missingRequirements = ['Insufficient balance', 'Missing token'];
      }
      
      updateCategoryState(categoryType, {
        verifying: false,
        verified: mockResult.isValid,
        verificationResult: mockResult,
        error: mockResult.isValid ? undefined : mockResult.missingRequirements.join(', ')
      });
      
    } catch (error) {
      console.error(`[MultiCategoryConnection] Verification failed for ${categoryType}:`, error);
      updateCategoryState(categoryType, {
        verifying: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      });
    }
  }, [activeCategories, getCategoryState, updateCategoryState]);
  
  // ===== EFFECTS =====
  
  // Notify parent when verification status changes
  useEffect(() => {
    if (onVerificationComplete) {
      const results = new Map<string, VerificationResult>();
      
      categoryStates.forEach((state, categoryType) => {
        if (state.verificationResult) {
          results.set(categoryType, state.verificationResult);
        }
      });
      
      onVerificationComplete(results);
    }
  }, [categoryStates, onVerificationComplete]);
  
  // Update overall status based on category states
  useEffect(() => {
    const isConnecting = Array.from(categoryStates.values()).some(state => state.connecting);
    const isVerifying = Array.from(categoryStates.values()).some(state => state.verifying);
    const hasErrors = errorCount > 0;
    
    if (isConnecting) {
      setOverallStatus('connecting');
    } else if (isVerifying) {
      setOverallStatus('verifying');
    } else if (hasErrors && !anyVerified) {
      setOverallStatus('failed');
    } else if (meetsRequirements) {
      setOverallStatus('ready');
    } else {
      setOverallStatus('idle');
    }
  }, [categoryStates, errorCount, anyVerified, meetsRequirements]);
  
  // ===== RENDER HELPERS =====
  
  const getOverallStatusInfo = () => {
    switch (overallStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Connecting wallets...',
          color: 'text-blue-600'
        };
      case 'verifying':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Verifying requirements...',
          color: 'text-blue-600'
        };
      case 'ready':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: meetsRequirements ? 'Ready to comment!' : 'Verification complete',
          color: 'text-green-600'
        };
      case 'failed':
        return {
          icon: <XCircle className="h-4 w-4" />,
          text: 'Verification failed',
          color: 'text-red-600'
        };
      default:
        return {
          icon: <Shield className="h-4 w-4" />,
          text: 'Verification required',
          color: 'text-muted-foreground'
        };
    }
  };
  
  // ===== RENDER =====
  
  // Don't render if no gating is enabled
  if (!hasAnyGating) {
    return null;
  }
  
  const statusInfo = getOverallStatusInfo();
  
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
            <div className={`flex items-center space-x-1 text-xs ${statusInfo.color}`}>
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Category List */}
        {activeCategories.map((category) => {
          const renderer = categoryRegistry.get(category.type);
          const state = getCategoryState(category.type);
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
                  {/* Connection Status Badge */}
                  {state.connecting ? (
                    <Badge variant="secondary" className="text-xs">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Connecting
                    </Badge>
                  ) : state.connected ? (
                    state.verifying ? (
                      <Badge variant="secondary" className="text-xs">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Verifying
                      </Badge>
                    ) : state.verified ? (
                      <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : state.error ? (
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Not Verified
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Not Connected
                    </Badge>
                  )}
                  
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
                    userStatus: state.connected ? {
                      connected: state.connected,
                      verified: state.verified,
                      requirements: [],
                      error: state.error
                    } : undefined,
                    disabled: disabled || state.connecting || state.verifying
                  })}
                  
                  {/* Error Display */}
                  {state.error && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      {state.error}
                    </div>
                  )}
                  
                  {/* Connected Address Display */}
                  {state.address && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Connected: {state.address}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Overall Action Button */}
        <div className="pt-4 border-t">
          {meetsRequirements ? (
            <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Ready to comment!</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">
                {requireAll 
                  ? `Connect and verify all ${activeCategories.length} categories above`
                  : `Connect and verify any one of the categories above`
                }
              </div>
              <div className="text-xs text-muted-foreground">
                Progress: {verifiedCount}/{activeCategories.length} verified
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 