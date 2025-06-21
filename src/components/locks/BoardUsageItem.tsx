import React from 'react';
import { BoardUsageData } from '@/hooks/useLockUsage';
import { Folder } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { buildBoardUrl } from '@/utils/urlBuilder';

interface BoardUsageItemProps {
  board: BoardUsageData;
}

export function BoardUsageItem({ board }: BoardUsageItemProps) {
  const router = useRouter();
  
  const handleClick = () => {
    // Navigate to board using the boardId URL pattern while preserving theme params
    const url = buildBoardUrl(board.id);
    router.push(url);
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300">
            {board.name}
          </h4>
        </div>
        
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
          {board.description && (
            <span className="truncate">{board.description}</span>
          )}
          <span>Created {formatDistanceToNow(new Date(board.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
} 