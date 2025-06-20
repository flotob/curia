'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { LockWithStats } from '@/types/locks';

interface DeleteLockDialogProps {
  lock: LockWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lock: LockWithStats) => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteLockDialog: React.FC<DeleteLockDialogProps> = ({
  lock,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false
}) => {
  if (!lock) return null;

  const handleConfirm = async () => {
    await onConfirm(lock);
    onClose();
  };

  const canDelete = lock.usageCount === 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-destructive" />
            Delete Lock
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete <strong>&quot;{lock.name}&quot;</strong>? 
                This action cannot be undone.
              </p>
              
              {!canDelete && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-center text-amber-800">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">Lock is currently in use</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    This lock is currently used by <strong>{lock.usageCount}</strong> post{lock.usageCount !== 1 ? 's' : ''}. 
                    You must remove it from all posts before deleting.
                  </p>
                </div>
              )}
              
              {canDelete && lock.isPublic && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center text-blue-800">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">Public lock warning</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    This is a public lock that other community members may be using. 
                    Consider making it private instead of deleting it.
                  </p>
                </div>
              )}
              
              {canDelete && lock.isTemplate && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-center text-purple-800">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">Template lock warning</span>
                  </div>
                  <p className="text-sm text-purple-700 mt-1">
                    This is a community template that other members may rely on. 
                    Deleting it will remove it from the template gallery.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90"
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lock
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 