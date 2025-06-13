'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Unlock, 
  Settings, 
  Sparkles, 
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Check
} from 'lucide-react';
import { LockWithStats } from '@/types/locks';
import { LockBrowser } from './LockBrowser';
import { PostSettings } from '@/types/settings';
import { cn } from '@/lib/utils';

interface PostGatingSelectorProps {
  settings: PostSettings;
  onChange: (settings: PostSettings) => void;
  disabled?: boolean;
  className?: string;
}

type SelectionMode = 'none' | 'browse_locks' | 'create_custom';

export const PostGatingSelector: React.FC<PostGatingSelectorProps> = ({
  settings,
  onChange,
  disabled = false,
  className = ''
}) => {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [selectedLock, setSelectedLock] = useState<LockWithStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine current gating state
  const hasGating = settings.responsePermissions?.categories && 
                    settings.responsePermissions.categories.length > 0;
  const currentLockId = (settings as unknown as { lockId?: number }).lockId; // From potential lock_id field
  
  useEffect(() => {
    // If we have gating but no lock ID, we're in custom mode
    if (hasGating && !currentLockId) {
      setSelectionMode('create_custom');
    } else if (currentLockId) {
      setSelectionMode('browse_locks');
    } else {
      setSelectionMode('none');
    }
  }, [hasGating, currentLockId]);
  
  // Handle lock selection
  const handleLockSelect = (lock: LockWithStats) => {
    setSelectedLock(lock);
    
    // Apply the lock's gating configuration to the post
    const newSettings: PostSettings = {
      ...settings,
      responsePermissions: lock.gatingConfig
    };
    
    // Also store lock ID if we have that capability
    (newSettings as unknown as { lockId?: number }).lockId = lock.id;
    
    onChange(newSettings);
    setSelectionMode('browse_locks');
    setIsExpanded(false);
  };
  
  // Handle removing gating
  const handleRemoveGating = () => {
    const newSettings: PostSettings = {
      ...settings,
      responsePermissions: undefined
    };
    
    // Remove lock ID
    const extendedSettings = newSettings as unknown as { lockId?: number };
    delete extendedSettings.lockId;
    
    onChange(newSettings);
    setSelectedLock(null);
    setSelectionMode('none');
    setIsExpanded(false);
  };
  
  // Handle creating custom gating
  const handleCreateCustom = () => {
    setSelectionMode('create_custom');
    setSelectedLock(null);
    
    // Remove lock ID since we're creating custom gating
    const newSettings = { ...settings };
    const extendedNewSettings = newSettings as unknown as { lockId?: number };
    delete extendedNewSettings.lockId;
    onChange(newSettings);
    
    setIsExpanded(true);
  };
  
  // Save current gating as a new lock
  const handleSaveAsLock = async () => {
    if (!hasGating || !settings.responsePermissions) return;
    
    // TODO: Implement lock creation API call
    // This would open a dialog to name and save the lock
    console.log('[PostGatingSelector] Save as lock feature coming soon...');
  };
  
  // Get current gating summary for display
  const getGatingSummary = () => {
    if (!hasGating || !settings.responsePermissions?.categories) {
      return null;
    }
    
    const categories = settings.responsePermissions.categories;
    const categoryTypes = categories.map(cat => {
      switch (cat.type) {
        case 'universal_profile':
          return 'Universal Profile';
        case 'ethereum_profile':
          return 'Ethereum';
        default:
          return 'Custom';
      }
    });
    
    return {
      count: categories.length,
      types: categoryTypes,
      isMultiple: categories.length > 1
    };
  };
  
  const gatingSummary = getGatingSummary();
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Control */}
      <Card className={cn(
        'transition-all',
        disabled && 'opacity-50 pointer-events-none',
        hasGating && 'border-primary/50 bg-primary/5'
      )}>
        <CardContent className="p-4">
          {/* No Gating State */}
          {selectionMode === 'none' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Unlock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium">Public Post</h3>
                  <p className="text-sm text-muted-foreground">
                    Anyone can reply to this post
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectionMode('browse_locks')}
                  disabled={disabled}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Choose Lock
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCreateCustom}
                  disabled={disabled}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Custom Gating
                </Button>
              </div>
            </div>
          )}
          
          {/* Lock Selected State */}
          {selectionMode === 'browse_locks' && selectedLock && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="p-2 rounded-lg text-white"
                    style={{ backgroundColor: selectedLock.color }}
                  >
                    {selectedLock.icon || <Lock className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{selectedLock.name}</h3>
                      {selectedLock.isTemplate && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-2 w-2 mr-1" />
                          Template
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedLock.description || 'Gated post using lock requirements'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectionMode('browse_locks')}
                    disabled={disabled}
                  >
                    Change
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRemoveGating}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Usage Stats */}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Used {selectedLock.usageCount} time{selectedLock.usageCount !== 1 ? 's' : ''}</span>
                </div>
                {selectedLock.successRate > 0 && (
                  <div className="flex items-center space-x-1">
                    <Check className="h-3 w-3" />
                    <span>{(selectedLock.successRate * 100).toFixed(0)}% success rate</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Custom Gating State */}
          {selectionMode === 'create_custom' && gatingSummary && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium">Custom Gating</h3>
                    <p className="text-sm text-muted-foreground">
                      {gatingSummary.count} requirement{gatingSummary.count !== 1 ? 's' : ''} 
                      ({gatingSummary.types.join(', ')})
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSaveAsLock}
                    disabled={disabled}
                  >
                    Save as Lock
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    disabled={disabled}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRemoveGating}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Expandable Custom Configuration */}
              {isExpanded && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    ⚙️ Custom gating configuration interface will be displayed here
                  </p>
                  <div className="text-xs text-muted-foreground">
                    This will integrate with the existing PostGatingControls component
                    or a simplified version for backward compatibility.
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Lock Browser (when in browse mode) */}
      {selectionMode === 'browse_locks' && !selectedLock && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Choose a Lock</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectionMode('none')}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LockBrowser
              onSelectLock={handleLockSelect}
              onCreateNew={handleCreateCustom}
              selectedLockId={currentLockId}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Quick Actions */}
      {selectionMode === 'none' && (
        <div className="flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            🔓 This post will be public - anyone can reply without restrictions
          </p>
        </div>
      )}
    </div>
  );
}; 