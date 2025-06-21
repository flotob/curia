import React from 'react';
import { PostUsageData } from '@/hooks/useLockUsage';
import { User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { buildPostUrl } from '@/utils/urlBuilder';

interface PostUsageItemProps {
  post: PostUsageData;
}

export function PostUsageItem({ post }: PostUsageItemProps) {
  const router = useRouter();
  
  const handleClick = () => {
    // Navigate to post using the board/post URL pattern while preserving theme params
    const url = buildPostUrl(post.id, post.board_id);
    router.push(url);
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300">
            {post.title}
          </h4>
        </div>
        
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span>in</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{post.board_name}</span>
          </span>
          
          {post.author_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{post.author_name}</span>
            </span>
          )}
          
          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
} 