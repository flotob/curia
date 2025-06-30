import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
// Select components not currently used
import { 
  Lock, 
  Unlock, 
  Plus, 
  X, 
  Clock, 
  Zap,
  Settings,
  Info,
  AlertTriangle 
} from 'lucide-react';
import { BoardSettings, BoardLockGating, SettingsUtils } from '@/types/settings';
import { LockWithStats } from '@/types/locks';
import { LockBrowser } from '@/components/locks/LockBrowser';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { authFetch } from '@/utils/authFetch';

interface BoardLockGatingFormProps {
  currentSettings: BoardSettings;
  onSave: (settings: BoardSettings) => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  showSaveButton?: boolean;
  autoSave?: boolean;
  className?: string;
}

type ViewMode = 'summary' | 'configure' | 'browse_locks';

export const BoardLockGatingForm: React.FC<BoardLockGatingFormProps> = ({
  currentSettings,
  onSave,
  isLoading,
  theme,
  showSaveButton = true,
  autoSave = false,
  className = ''
}) => {
  // Authentication
  const { token } = useAuth();
  
  // State Management
  const [settings, setSettings] = useState<BoardSettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [selectedLocks, setSelectedLocks] = useState<LockWithStats[]>([]);
  const [isLoadingLocks, setIsLoadingLocks] = useState(false);

  // Current lock gating configuration - memoized to prevent infinite loops
  const lockGating = useMemo(() => {
    return SettingsUtils.getBoardLockGating(settings) || SettingsUtils.getDefaultBoardLockGating();
  }, [settings]);
  
  const hasLockGating = SettingsUtils.hasBoardLockGating(settings);

  // Sync internal state with currentSettings prop
  useEffect(() => {
    setSettings(currentSettings);
    setHasChanges(false);
  }, [currentSettings]);

  // Auto-save when settings change (debounced to prevent rapid-fire API calls)
  useEffect(() => {
    if (autoSave && hasChanges) {
      const timeoutId = setTimeout(() => {
        console.log('[BoardLockGatingForm] Auto-saving settings...');
        onSave(settings);
        setHasChanges(false); // Reset changes flag after save
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, hasChanges, autoSave]); // onSave intentionally excluded to prevent infinite loops

  const loadSelectedLockDetails = useCallback(async () => {
    if (lockGating.lockIds.length === 0) return;
    
    if (!token) {
      console.warn('[BoardLockGatingForm] No auth token available for loading lock details');
      return;
    }
    
    setIsLoadingLocks(true);
    try {
      console.log('[BoardLockGatingForm] Loading details for locks:', lockGating.lockIds);
      
      // Load details for each selected lock
      const lockPromises = lockGating.lockIds.map(async (lockId) => {
        try {
          const response = await authFetch(`/api/locks/${lockId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              console.log(`[BoardLockGatingForm] Successfully loaded lock ${lockId}:`, data.data);
              return data.data;
            } else {
              console.warn(`[BoardLockGatingForm] Lock ${lockId} API returned success=false:`, data);
              return null;
            }
          } else {
            console.error(`[BoardLockGatingForm] Failed to load lock ${lockId}:`, response.status, response.statusText);
            const errorData = await response.text();
            console.error(`[BoardLockGatingForm] Error response for lock ${lockId}:`, errorData);
            return null;
          }
        } catch (error) {
          console.error(`[BoardLockGatingForm] Error loading lock ${lockId}:`, error);
          return null;
        }
      });

      const locks = (await Promise.all(lockPromises)).filter(Boolean) as LockWithStats[];
      console.log('[BoardLockGatingForm] Successfully loaded locks:', locks.length, 'out of', lockGating.lockIds.length);
      setSelectedLocks(locks);
    } catch (error) {
      console.error('[BoardLockGatingForm] Error loading lock details:', error);
    } finally {
      setIsLoadingLocks(false);
    }
  }, [lockGating.lockIds, token]);

  // Load lock details for currently selected lock IDs
  useEffect(() => {
    if (lockGating.lockIds.length > 0) {
      loadSelectedLockDetails();
    } else {
      setSelectedLocks([]);
    }
  }, [lockGating.lockIds, loadSelectedLockDetails]);

  const updateLockGating = useCallback((updatedGating: Partial<BoardLockGating>) => {
    const newLockGating = { ...lockGating, ...updatedGating };
    
    const newSettings: BoardSettings = {
      ...settings,
      permissions: {
        ...settings.permissions,
        locks: newLockGating.lockIds.length > 0 ? newLockGating : undefined
      }
    };

    setSettings(newSettings);
    setHasChanges(true);
  }, [settings, lockGating]);

  const handleAddLock = useCallback((lock: LockWithStats) => {
    if (!lockGating.lockIds.includes(lock.id)) {
      updateLockGating({
        lockIds: [...lockGating.lockIds, lock.id]
      });
    }
    setViewMode('summary');
  }, [lockGating.lockIds, updateLockGating]);

  const handleRemoveLock = useCallback((lockId: number) => {
    updateLockGating({
      lockIds: lockGating.lockIds.filter(id => id !== lockId)
    });
  }, [lockGating.lockIds, updateLockGating]);

  const handleFulfillmentChange = useCallback((fulfillment: 'any' | 'all') => {
    updateLockGating({ fulfillment });
  }, [updateLockGating]);

  const handleDurationChange = useCallback((duration: number) => {
    updateLockGating({ verificationDuration: duration });
  }, [updateLockGating]);

  const handleSave = () => {
    try {
      onSave(settings);
      setHasChanges(false);
    } catch (error) {
      console.error('[BoardLockGatingForm] Error saving settings:', error);
    }
  };

  const handleEnableLockGating = () => {
    if (!hasLockGating) {
      setViewMode('browse_locks');
    }
  };

  const handleDisableLockGating = () => {
    updateLockGating({ lockIds: [] });
    setViewMode('summary');
  };

  // Render functions
  const renderSummaryView = () => (
    <div className="space-y-4">
      {!hasLockGating ? (
        // No lock gating configured
        <div className={cn(
          "text-center py-8 border-2 border-dashed rounded-lg",
          theme === 'dark' 
            ? 'border-slate-600 bg-slate-800/20' 
            : 'border-slate-300 bg-slate-50'
        )}>
          <Unlock className={cn(
            'mx-auto h-12 w-12 mb-4',
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          )} />
          <h3 className={cn(
            'text-lg font-semibold mb-2',
            theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
          )}>
            No Write Access Requirements
          </h3>
          <p className={cn(
            'text-sm mb-4 max-w-md mx-auto',
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Anyone with board visibility can post and comment. Add lock-based requirements to control who can write to this board.
          </p>
          <Button onClick={handleEnableLockGating} className="mt-2">
            <Lock className="h-4 w-4 mr-2" />
            Add Write Requirements
          </Button>
        </div>
      ) : (
        // Lock gating configured
        <div className="space-y-4">
          {/* Configuration Summary */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-emerald-950/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Lock className={cn(
                  'h-5 w-5',
                  theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                )} />
                <h4 className={cn(
                  'font-semibold',
                  theme === 'dark' ? 'text-emerald-200' : 'text-emerald-800'
                )}>
                  Write Access Requirements Active
                </h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('configure')}
                className={cn(
                  theme === 'dark' 
                    ? 'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/50' 
                    : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100'
                )}
              >
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className={cn(
                  'font-medium',
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
                )}>
                  Locks Required:
                </span>
                <div className="mt-1">
                  <Badge variant="secondary">
                    {lockGating.lockIds.length} lock{lockGating.lockIds.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
              
              <div>
                <span className={cn(
                  'font-medium',
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
                )}>
                  Fulfillment:
                </span>
                <div className="mt-1">
                  <Badge variant={lockGating.fulfillment === 'all' ? 'destructive' : 'default'}>
                    {lockGating.fulfillment === 'any' ? 'ANY lock' : 'ALL locks'}
                  </Badge>
                </div>
              </div>

              <div>
                <span className={cn(
                  'font-medium',
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
                )}>
                  Verification Duration:
                </span>
                <div className="mt-1 flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{lockGating.verificationDuration || 4} hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Locks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className={cn(
                'font-medium',
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              )}>
                Required Locks ({lockGating.lockIds.length})
              </h5>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('browse_locks')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Lock
              </Button>
            </div>

            {isLoadingLocks ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm text-muted-foreground">Loading locks...</span>
              </div>
            ) : selectedLocks.length > 0 ? (
              <div className="space-y-2">
                {selectedLocks.map((lock) => (
                  <div
                    key={lock.id}
                    className={cn(
                      'p-3 rounded-lg border flex items-center justify-between',
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">{lock.icon || '🔒'}</div>
                      <div>
                        <div className="font-medium">{lock.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {lock.description || 'No description'}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLock(lock.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : lockGating.lockIds.length > 0 ? (
              // Fallback: Show lock IDs when details failed to load
              <div className="space-y-2">
                {lockGating.lockIds.map((lockId) => (
                  <div
                    key={lockId}
                    className={cn(
                      'p-3 rounded-lg border flex items-center justify-between',
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">🔒</div>
                      <div>
                        <div className="font-medium">Lock #{lockId}</div>
                        <div className="text-sm text-muted-foreground">
                          Unable to load lock details
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLock(lockId)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              // No locks selected
              <div className={cn(
                'text-center py-4 text-sm',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                No locks selected. Click &quot;Add Lock&quot; to get started.
              </div>
            )}
          </div>

          {/* Remove Lock Gating */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleDisableLockGating}
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Unlock className="h-4 w-4 mr-2" />
              Remove All Requirements
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderConfigureView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className={cn(
          'text-lg font-semibold',
          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
        )}>
          Configure Lock Requirements
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('summary')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Fulfillment Mode */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Lock Fulfillment Mode</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            className={cn(
              'cursor-pointer transition-all',
              lockGating.fulfillment === 'any'
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
            )}
            onClick={() => handleFulfillmentChange('any')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">ANY Lock (Recommended)</div>
                  <div className="text-sm text-muted-foreground">
                    Users need to pass only one of the selected locks
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              'cursor-pointer transition-all',
              lockGating.fulfillment === 'all'
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
            )}
            onClick={() => handleFulfillmentChange('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="font-medium">ALL Locks (Strict)</div>
                  <div className="text-sm text-muted-foreground">
                    Users must pass every selected lock
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verification Duration */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Verification Duration</Label>
        <div className="flex items-center space-x-3">
          <Input
            type="number"
            min="1"
            max="168"
            value={lockGating.verificationDuration || 4}
            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 4)}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">
            hours (how long verification lasts)
          </span>
        </div>
        <div className={cn(
          'text-xs p-3 rounded-lg',
          theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
        )}>
          <Info className="h-3 w-3 inline mr-1" />
          Users who pass verification can post/comment for this duration without re-verification.
          Longer durations improve UX but may reduce security.
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setViewMode('browse_locks')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add More Locks
        </Button>
        <Button onClick={() => setViewMode('summary')}>
          Done Configuring
        </Button>
      </div>
    </div>
  );

  const renderBrowseLocksView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className={cn(
          'text-lg font-semibold',
          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
        )}>
          Add Board Locks
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('summary')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Lock Browser */}
      <LockBrowser
        onSelectLock={handleAddLock}
        selectedLockId={undefined}
      />
    </div>
  );

  return (
    <div className={className}>
      {/* View Content */}
      {viewMode === 'summary' && renderSummaryView()}
      {viewMode === 'configure' && renderConfigureView()}
      {viewMode === 'browse_locks' && renderBrowseLocksView()}

      {/* Save Button */}
      {showSaveButton && (
        <div className="flex justify-end pt-6 mt-6 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Save Lock Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}; 