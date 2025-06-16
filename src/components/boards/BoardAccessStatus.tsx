'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Shield
} from 'lucide-react';
import { BoardVerificationStatus, LockVerificationStatus } from '@/types/boardVerification';
import { cn } from '@/lib/utils';

interface BoardAccessStatusProps {
  boardId: number;
  verificationStatus: BoardVerificationStatus;
  onVerifyLock?: (lockId: number) => void;
  className?: string;
}

export const BoardAccessStatus: React.FC<BoardAccessStatusProps> = ({
  verificationStatus,
  onVerifyLock,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    hasWriteAccess,
    fulfillmentMode,
    lockStatuses,
    verifiedCount,
    requiredCount,
    expiresAt,
    nextExpiryAt
  } = verificationStatus;

  // Calculate progress percentage
  const progressPercentage = requiredCount > 0 ? (verifiedCount / requiredCount) * 100 : 0;

  // Get status color and icon
  const getStatusInfo = () => {
    if (hasWriteAccess) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        icon: CheckCircle,
        label: 'Write Access Granted'
      };
    } else if (verifiedCount > 0) {
      return {
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50 border-yellow-200',
        icon: AlertCircle,
        label: 'Verification In Progress'
      };
    } else {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200', 
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
  const handleVerifyLock = useCallback((lockId: number) => {
    onVerifyLock?.(lockId);
  }, [onVerifyLock]);

  // Render individual lock status
  const renderLockStatus = (lockStatus: LockVerificationStatus) => {
    const { lock, verificationStatus: status, expiresAt, nextAction } = lockStatus;
    
    const getLockStatusInfo = () => {
      switch (status) {
        case 'verified':
          return {
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            label: 'Verified',
            timeInfo: formatTimeRemaining(expiresAt)
          };
        case 'in_progress':
          return {
            icon: Clock,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            label: 'In Progress',
            timeInfo: null
          };
        case 'expired':
          return {
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            label: 'Expired',
            timeInfo: 'Re-verification required'
          };
        case 'failed':
          return {
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            label: 'Failed',
            timeInfo: 'Requirements not met'
          };
        default:
          return {
            icon: Lock,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
            label: 'Not Started',
            timeInfo: null
          };
      }
    };

    const lockInfo = getLockStatusInfo();
    const LockIcon = lockInfo.icon;

    return (
      <div
        key={lock.id}
        className={cn(
          'p-4 rounded-lg border flex items-center justify-between',
          lockInfo.bgColor
        )}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <LockIcon className={cn('h-4 w-4', lockInfo.color)} />
            <span className="text-lg">{lock.icon || '🔒'}</span>
          </div>
          <div>
            <div className="font-medium">{lock.name}</div>
            <div className="text-sm text-muted-foreground">
              {lock.description || 'Lock verification required'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className={cn('text-sm font-medium', lockInfo.color)}>
              {lockInfo.label}
            </div>
            {lockInfo.timeInfo && (
              <div className="text-xs text-muted-foreground">
                {lockInfo.timeInfo}
              </div>
            )}
          </div>
          
          {nextAction && status !== 'verified' && (
            <Button
              size="sm"
              onClick={() => handleVerifyLock(lock.id)}
              className="ml-2"
            >
              {nextAction.label}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn('overflow-hidden', statusInfo.bgColor, className)}>
      {/* Collapsed Header */}
      <div
        className="p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIcon className={cn('h-5 w-5', statusInfo.color)} />
            <div>
              <div className="font-medium text-sm">
                {statusInfo.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {hasWriteAccess ? (
                  <>
                    Access granted • {formatTimeRemaining(expiresAt) || 'Active'}
                  </>
                ) : (
                  <>
                    {verifiedCount} of {requiredCount} verified • 
                    {fulfillmentMode === 'any' ? ' Need ANY 1' : ' Need ALL'}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!hasWriteAccess && requiredCount > 1 && (
              <div className="text-xs text-muted-foreground">
                {Math.round(progressPercentage)}%
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {/* Progress bar for multi-lock setups */}
        {!hasWriteAccess && requiredCount > 1 && (
          <div className="mt-2">
            <Progress value={progressPercentage} className="h-1" />
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0 border-t border-opacity-20">
          <div className="space-y-4">
            {/* Requirements Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">Write Access Requirements</h4>
                <p className="text-xs text-muted-foreground">
                  Complete{' '}
                  <span className="font-medium">
                    {fulfillmentMode === 'any' ? 'ANY 1' : 'ALL'} 
                  </span>{' '}
                  of {requiredCount} lock{requiredCount !== 1 ? 's' : ''} to post and comment
                </p>
              </div>
              
              {fulfillmentMode === 'all' ? (
                <Badge variant="destructive" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Strict Mode
                </Badge>
              ) : (
                <Badge variant="default" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Flexible Mode
                </Badge>
              )}
            </div>

            {/* Lock Status List */}
            <div className="space-y-3">
              {lockStatuses.map(lockStatus => renderLockStatus(lockStatus))}
            </div>

            {/* Summary Actions */}
            <div className="pt-4 border-t">
              {hasWriteAccess ? (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-green-600">
                    <Unlock className="h-4 w-4" />
                    <span className="font-medium">You can post and comment on this board</span>
                  </div>
                  {nextExpiryAt && (
                    <div className="text-xs text-muted-foreground">
                      Access expires {formatTimeRemaining(nextExpiryAt)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Progress: {verifiedCount}/{requiredCount} requirements met
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Find first unverified lock and trigger verification
                      const nextLock = lockStatuses.find(ls => 
                        ls.verificationStatus === 'not_started' || 
                        ls.verificationStatus === 'failed' || 
                        ls.verificationStatus === 'expired'
                      );
                      if (nextLock) {
                        handleVerifyLock(nextLock.lockId);
                      }
                    }}
                  >
                    Continue Verification
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}; 