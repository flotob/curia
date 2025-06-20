import React from 'react';
import { useLockUsage } from '@/hooks/useLockUsage';
import { PostUsageItem } from './PostUsageItem';
import { BoardUsageItem } from './BoardUsageItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText, Folder } from 'lucide-react';

interface LockUsageSectionProps {
  lockId: number;
}

export function LockUsageSection({ lockId }: LockUsageSectionProps) {
  const { data: usageData, isLoading, error } = useLockUsage(lockId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lock Usage</h3>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lock Usage</h3>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load usage information. Please refresh to try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!usageData) {
    return null;
  }

  const hasUsage = usageData.totalPostsUsingLock > 0 || usageData.totalBoardsUsingLock > 0;

  if (!hasUsage) {
    return null; // Don't show section if no usage
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lock Usage</h3>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
        {/* Posts Section */}
        {usageData.totalPostsUsingLock > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Posts ({usageData.posts.length} of {usageData.totalPostsUsingLock})
              </span>
            </div>
            <div className="space-y-2">
              {usageData.posts.map((post) => (
                <PostUsageItem key={post.id} post={post} />
              ))}
              {usageData.totalPostsUsingLock > usageData.posts.length && (
                <div className="text-xs text-gray-500 dark:text-gray-400 pl-3 pt-1">
                  + {usageData.totalPostsUsingLock - usageData.posts.length} more posts
                </div>
              )}
            </div>
          </div>
        )}

        {/* Boards Section */}
        {usageData.totalBoardsUsingLock > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Boards ({usageData.boards.length})
              </span>
            </div>
            <div className="space-y-2">
              {usageData.boards.map((board) => (
                <BoardUsageItem key={board.id} board={board} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 