'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GatingRequirementsPreview } from './GatingRequirementsPreview';
import { LockWithStats } from '@/types/locks';
import { Eye, Shield, Users, Clock, TrendingUp, Edit2, Copy, Trash2 } from 'lucide-react';
import { UniversalProfileProvider } from '@/contexts/UniversalProfileContext';

interface LockPreviewModalProps {
  lock: LockWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  // Action handlers (optional)
  onRename?: (lock: LockWithStats) => void;
  onDuplicate?: (lock: LockWithStats) => void;
  onDelete?: (lock: LockWithStats) => void;
}

export const LockPreviewModal: React.FC<LockPreviewModalProps> = ({
  lock,
  isOpen,
  onClose,
  onRename,
  onDuplicate,
  onDelete
}) => {
  if (!lock) return null;

  const requirementCount = lock.gatingConfig.categories?.filter(cat => cat.enabled).length || 0;
  const requirementType = lock.gatingConfig.requireAll ? 'ALL' : 'ANY';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center text-xl">
                <span className="text-2xl mr-3">{lock.icon || '🔒'}</span>
                {lock.name}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {lock.description || 'Preview how this access control lock will appear to users'}
              </DialogDescription>
            </div>
          </div>

          {/* Lock metadata */}
          <div className="flex items-center justify-between mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">{requirementCount} requirement{requirementCount !== 1 ? 's' : ''}</span>
                <Badge variant="outline" className="text-xs">
                  {requirementType}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{lock.usageCount} uses</span>
              </div>
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>{Math.round(lock.successRate * 100)}% success</span>
              </div>
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>~{Math.round(lock.avgVerificationTime / 60)}min avg</span>
              </div>
            </div>

            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              <Eye className="h-3 w-3 mr-1" />
              Preview Mode
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-6">
            {/* Preview explanation */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Interactive Preview
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This is how users will see and interact with the access control requirements when trying to comment on posts using this lock. 
                    You can connect your wallets to test the verification flow (frontend only - no actual verification will be saved).
                  </p>
                </div>
              </div>
            </div>

            {/* Main gating requirements panel */}
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-1">
              <UniversalProfileProvider>
                <GatingRequirementsPreview 
                  gatingConfig={lock.gatingConfig}
                  className="border-0 shadow-none bg-background"
                />
              </UniversalProfileProvider>
            </div>

            {/* Lock details */}
            {lock.tags && lock.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {lock.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Created by {lock.isOwned ? 'you' : 'community member'} • 
              {lock.isTemplate && <span className="ml-1">Community Template</span>}
              {lock.isPublic && <span className="ml-1">• Public Lock</span>}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Action buttons for locks user can edit */}
              {lock.canEdit && (onRename || onDuplicate || onDelete) && (
                <>
                  {onRename && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onRename(lock)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </Button>
                  )}
                  {onDuplicate && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onDuplicate(lock)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </Button>
                  )}
                  {onDelete && lock.canDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => onDelete(lock)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </>
              )}
              
              <Button onClick={onClose} variant="outline">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 