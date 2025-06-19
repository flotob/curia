'use client';

import React, { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LockVerificationPanel } from '../verification/LockVerificationPanel';
import { useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { UniversalProfileProvider } from '@/contexts/UniversalProfileContext';
import { BoardVerificationApiResponse } from '@/types/boardVerification';

interface BoardVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  boardId: number;
  lockId?: number;
  lockName?: string;
}

export const BoardVerificationModal: React.FC<BoardVerificationModalProps> = ({
  isOpen,
  onClose,
  communityId,
  boardId,
  lockId,
  lockName
}) => {
  const queryClient = useQueryClient();

  // Handle verification completion
  const handleVerificationComplete = useCallback((canComment: boolean) => {
    console.log(`[BoardVerificationModal] Verification completed for lock ${lockId}:`, canComment);
    
    // INSTANT UPDATE: Directly update the cache with new verification data
    const currentData = queryClient.getQueryData<BoardVerificationApiResponse>(['boardVerificationStatus', boardId]);
    
    if (currentData?.data) {
      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
      
      // Update the specific lock status immediately
      const updatedLockStatuses = currentData.data.lockStatuses.map(ls => 
        ls.lockId === lockId 
          ? { 
              ...ls, 
              verificationStatus: 'verified' as const,
              verifiedAt: now.toISOString(),
              expiresAt: newExpiresAt.toISOString(),
              nextAction: undefined // Remove the "Verify" button
            }
          : ls
      );
      
      // Recalculate verification counts
      const newVerifiedCount = updatedLockStatuses.filter(ls => ls.verificationStatus === 'verified').length;
      
      // Recalculate access permissions based on fulfillment mode
      const newHasWriteAccess = currentData.data.fulfillmentMode === 'any' 
        ? newVerifiedCount >= 1 
        : newVerifiedCount >= currentData.data.requiredCount;
      
      // Calculate new expiry times
      const verifiedStatuses = updatedLockStatuses.filter(ls => ls.verificationStatus === 'verified');
      let newExpiresAtForAccess: string | undefined;
      let newNextExpiryAt: string | undefined;
      
      if (verifiedStatuses.length > 0) {
        const expiryTimes = verifiedStatuses
          .map(ls => ls.expiresAt)
          .filter(Boolean)
          .map(time => new Date(time!).getTime())
          .sort((a, b) => a - b);
        
        if (expiryTimes.length > 0) {
          newNextExpiryAt = new Date(expiryTimes[0]).toISOString();
          
          if (newHasWriteAccess) {
            if (currentData.data.fulfillmentMode === 'any') {
              // For ANY mode, access expires when the LAST verified lock expires
              newExpiresAtForAccess = new Date(expiryTimes[expiryTimes.length - 1]).toISOString();
            } else {
              // For ALL mode, access expires when the FIRST lock expires
              newExpiresAtForAccess = newNextExpiryAt;
            }
          }
        }
      }
      
      const updatedData = {
        ...currentData,
        data: {
          ...currentData.data,
          lockStatuses: updatedLockStatuses,
          verifiedCount: newVerifiedCount,
          hasWriteAccess: newHasWriteAccess,
          expiresAt: newExpiresAtForAccess,
          nextExpiryAt: newNextExpiryAt
        }
      };
      
      // ✨ INSTANT UPDATE: Set new cache data immediately
      queryClient.setQueryData(['boardVerificationStatus', boardId], updatedData);
      
      console.log(`[BoardVerificationModal] ✨ Instant cache update applied:`, {
        lockId,
        newVerifiedCount,
        newHasWriteAccess,
        fulfillmentMode: currentData.data.fulfillmentMode
      });
    }
    
    // Background refresh to ensure consistency with backend
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['boardVerificationStatus', boardId] 
      });
    }, 1000);
    
    // Don't auto-close modal - let user see success state and close manually
    // This allows them to verify additional locks if needed
  }, [queryClient, boardId, lockId]);

  if (!isOpen || !lockId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-start">
            <div className="flex-1">
              <DialogTitle className="flex items-center text-xl">
                <Shield className="h-6 w-6 mr-3 text-primary" />
                Verify Board Access Lock
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                Complete the requirements for{' '}
                <span className="font-medium">{lockName}</span> to unlock posting and commenting on this board.
              </DialogDescription>
            </div>
          </div>

          {/* Info Badge */}
          <div className="mt-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Shield className="h-3 w-3 mr-1" />
              Board-Level Verification
            </Badge>
          </div>
        </DialogHeader>

        {/* Verification Panel */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-4">
            {/* Explanation */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Board access verification</strong> lasts longer than post comments 
                  (typically 4 hours vs 30 minutes) and grants you posting privileges across the entire board.
                </p>
                <p>
                  Connect your wallet and complete the verification requirements below.
                </p>
              </div>
            </div>

            {/* Main Verification Panel */}
            <UniversalProfileProvider>
              <LockVerificationPanel
                lockId={lockId}
                verificationContext={{
                  type: 'board',
                  communityId,
                  boardId
                }}
                onVerificationComplete={handleVerificationComplete}
                className="border-0 shadow-none"
              />
            </UniversalProfileProvider>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Verification applies to the entire board • Longer duration than post-level verification
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 