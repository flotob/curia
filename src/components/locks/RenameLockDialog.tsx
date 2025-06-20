'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2 } from 'lucide-react';
import { LockWithStats } from '@/types/locks';

interface RenameLockDialogProps {
  lock: LockWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lock: LockWithStats, newName: string) => Promise<void>;
  isRenaming?: boolean;
}

export const RenameLockDialog: React.FC<RenameLockDialogProps> = ({
  lock,
  isOpen,
  onClose,
  onConfirm,
  isRenaming = false
}) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen && lock) {
      setNewName(lock.name);
      setError('');
    } else {
      setNewName('');
      setError('');
    }
  }, [isOpen, lock]);

  if (!lock) return null;

  const handleConfirm = async () => {
    const trimmedName = newName.trim();
    
    // Validation
    if (!trimmedName) {
      setError('Lock name is required');
      return;
    }
    
    if (trimmedName === lock.name) {
      setError('Please enter a different name');
      return;
    }
    
    if (trimmedName.length > 255) {
      setError('Lock name must be less than 255 characters');
      return;
    }

    try {
      await onConfirm(lock, trimmedName);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to rename lock');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRenaming) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const isValid = newName.trim() && newName.trim() !== lock.name && newName.trim().length <= 255;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit2 className="h-5 w-5 mr-2" />
            Rename Lock
          </DialogTitle>
          <DialogDescription>
            Enter a new name for <strong>&quot;{lock.name}&quot;</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lockName">Lock Name</Label>
            <Input
              id="lockName"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(''); // Clear error when user types
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter lock name..."
              disabled={isRenaming}
              className={error ? 'border-destructive' : ''}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {newName.length}/255 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isRenaming}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isValid || isRenaming}
          >
            {isRenaming ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Renaming...
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename Lock
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 