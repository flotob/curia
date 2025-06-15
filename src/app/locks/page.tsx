'use client';

import React, { useState, useCallback } from 'react';
import { LockBrowser } from '@/components/locks/LockBrowser';
import { LockCreationModal } from '@/components/locks/LockCreationModal';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function LocksPage() {
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleCreateNewLock = useCallback(() => {
    setIsCreationModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsCreationModalOpen(false);
  }, []);

  const handleLockSaved = useCallback((lockId: number) => {
    console.log(`[LocksPage] New lock created with ID: ${lockId}`);
    
    // Invalidate locks query to refresh the browser
    queryClient.invalidateQueries({ queryKey: ['locks'] });
    
    // TODO: Could show a success toast notification here
    // TODO: Could highlight the newly created lock in the browser
  }, [queryClient]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Access Control Locks
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Browse and manage reusable access control configurations for your community.
          </p>
        </div>
        <Button onClick={handleCreateNewLock} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create New Lock</span>
        </Button>
      </div>
      
      <LockBrowser />
      
      <LockCreationModal
        isOpen={isCreationModalOpen}
        onClose={handleModalClose}
        onSave={handleLockSaved}
      />
    </div>
  );
} 