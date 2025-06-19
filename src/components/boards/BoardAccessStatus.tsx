'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { BoardVerificationStatus, LockVerificationStatus } from '@/types/boardVerification';
import { BoardVerificationModal } from './BoardVerificationModal';
import { cn } from '@/lib/utils';

interface BoardAccessStatusProps {
  boardId: number;
  communityId: string;
  verificationStatus: BoardVerificationStatus;
  className?: string;
}

export const BoardAccessStatus: React.FC<BoardAccessStatusProps> = ({
  boardId,
  communityId,
  verificationStatus,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    lockId?: number;
    lockName?: string;
  }>({ isOpen: false });

  const {
    hasWriteAccess,
    fulfillmentMode,
    lockStatuses,
    verifiedCount,
    requiredCount,
    expiresAt
  } = verificationStatus;

  // Debug logging for verification status bugs
  console.log(`[BoardAccessStatus] Board ${boardId} verification status:`, {
    hasWriteAccess,
    fulfillmentMode,
    verifiedCount,
    requiredCount,
    lockStatusesCount: lockStatuses.length,
    lockStatuses: lockStatuses.map(ls => ({
      lockId: ls.lockId,
      lockName: ls.lock.name,
      verificationStatus: ls.verificationStatus,
      verifiedAt: ls.verifiedAt,
      expiresAt: ls.expiresAt
    }))
  });

  // Calculate progress percentage
  const progressPercentage = requiredCount > 0 ? (verifiedCount / requiredCount) * 100 : 0;

  // Get status color and icon - theme aware
  const getStatusInfo = () => {
    if (hasWriteAccess) {
      return {
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
        icon: CheckCircle,
        label: 'Write Access Granted'
      };
    } else if (verifiedCount > 0) {
      return {
        color: 'text-amber-600 dark:text-amber-400', 
        bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
        icon: AlertCircle,
        label: 'Verification In Progress'
      };
    } else {
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800', 
        icon: Lock,
        label: 'Verification Required'
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Format time remaining
  const formatTimeRemaining = (expiryTime?: string) => {
    if (!expiryTime) return null;
    
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''} left`;
    } else {
      return `${minutes}m left`;
    }
  };

  // Handle lock verification
  const handleVerifyLock = useCallback((lockId: number, lockName: string) => {
    setVerificationModal({
      isOpen: true,
      lockId,
      lockName
    });
  }, []);

  // Handle verification modal close
  const handleVerificationModalClose = useCallback(() => {
    setVerificationModal({ isOpen: false });
    // Note: BoardVerificationModal will handle React Query invalidation internally
  }, []);

  // Get lock status visual indicator - theme aware
  const getLockStatusIndicator = (status: LockVerificationStatus['verificationStatus']) => {
    switch (status) {
      case 'verified':
        return {
          color: 'text-emerald-700 dark:text-emerald-300',
          bgColor: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700',
          icon: CheckCircle,
          label: 'Verified',
          badgeVariant: 'default' as const
        };
      case 'in_progress':
        return {
          color: 'text-amber-700 dark:text-amber-300',
          bgColor: 'bg-amber-100 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700',
          icon: Clock,
          label: 'In Progress',
          badgeVariant: 'secondary' as const
        };
      case 'expired':
        return {
          color: 'text-red-700 dark:text-red-300',
          bgColor: 'bg-red-100 border-red-300 dark:bg-red-950/40 dark:border-red-700',
          icon: XCircle,
          label: 'Expired',
          badgeVariant: 'destructive' as const
        };
      case 'failed':
        return {
          color: 'text-red-700 dark:text-red-300',
          bgColor: 'bg-red-100 border-red-300 dark:bg-red-950/40 dark:border-red-700',
          icon: XCircle,
          label: 'Failed',
          badgeVariant: 'destructive' as const
        };
      case 'not_started':
      default:
        return {
          color: 'text-slate-700 dark:text-slate-300',
          bgColor: 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600',
          icon: Lock,
          label: 'Not Started',
          badgeVariant: 'outline' as const
        };
    }
  };

  const renderLockStatus = (lockStatus: LockVerificationStatus) => {
    const { lock, verificationStatus, expiresAt, nextAction } = lockStatus;
    const lockInfo = getLockStatusIndicator(verificationStatus);
    const LockIcon = lockInfo.icon;
    
    return (
      <div
        key={lock.id}
        className={cn(
          'p-5 rounded-lg border flex items-center transition-all hover:shadow-sm cursor-pointer',
          lockInfo.bgColor
        )}
        onClick={() => handleVerifyLock(lock.id, lock.name)}
      >
        {/* Left side: Lock info with constrained width */}
        <div className="flex items-center space-x-3 flex-1 min-w-0 mr-4">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <LockIcon className={cn('h-4 w-4', lockInfo.color)} />
            <span className="text-lg">{lock.icon || '🔒'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{lock.name}</div>
            <div className="text-sm text-muted-foreground">
              <div className="truncate">
                {lock.description || 'Lock verification required'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side: Status and actions with guaranteed space */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="text-right">
            <Badge variant={lockInfo.badgeVariant} className="text-xs whitespace-nowrap">
              {lockInfo.label}
            </Badge>
            {verificationStatus === 'verified' && expiresAt && (
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                {formatTimeRemaining(expiresAt)}
              </div>
            )}
          </div>
          
          {verificationStatus !== 'verified' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleVerifyLock(lock.id, lock.name);
              }}
              className="whitespace-nowrap"
            >
              {nextAction?.label || 'Verify'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className={cn("border-l-4", statusInfo.bgColor, className)}>
        <CardContent className="p-6">
          {/* Header - Always visible */}
          <div 
            className="flex items-center justify-between cursor-pointer" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-3">
              <StatusIcon className={cn('h-5 w-5', statusInfo.color)} />
              <div>
                <div className="font-medium text-sm">
                  Board Lock Requirements
                </div>
                <div className="text-xs text-muted-foreground">
                  {verifiedCount} of {requiredCount} verified • Need {fulfillmentMode.toUpperCase()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {hasWriteAccess && (
                <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Access Granted
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          {requiredCount > 0 && (
            <div className="mt-3">
              <Progress 
                value={progressPercentage} 
                className="h-2"
              />
            </div>
          )}

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-6 space-y-4">
              {/* Lock status cards */}
              <div className="space-y-3">
                {lockStatuses.map(renderLockStatus)}
              </div>

              {/* Additional info */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span>
                    Mode: {fulfillmentMode === 'any' ? 'Flexible' : 'Strict'} 
                    ({fulfillmentMode === 'any' ? 'any one lock' : 'all locks required'})
                  </span>
                  {hasWriteAccess && expiresAt && (
                    <span>
                      Access expires in {formatTimeRemaining(expiresAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Modal */}
      <BoardVerificationModal
        isOpen={verificationModal.isOpen}
        onClose={handleVerificationModalClose}
        communityId={communityId}
        boardId={boardId}
        lockId={verificationModal.lockId}
        lockName={verificationModal.lockName}
      />
    </>
  );
}; 