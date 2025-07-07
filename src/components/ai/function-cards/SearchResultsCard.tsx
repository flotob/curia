import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowUpRight, ExternalLink, TrendingUp } from 'lucide-react';
import { TypedFunctionCardProps } from '../types/FunctionCardProps';
import { SearchResultsData } from '@/lib/ai/types/FunctionResult';
import { useCgLib } from '@/contexts/CgLibContext';
import { useRouter } from 'next/navigation';
import { buildPostUrl } from '@/utils/urlBuilder';

export function SearchResultsCard({ 
  data, 
  onAction 
}: TypedFunctionCardProps<SearchResultsData>) {
  const { cgInstance } = useCgLib();
  const router = useRouter();

  const handlePostClick = async (result: NonNullable<SearchResultsData['searchResults']>[0]) => {
    if (result.navigationType === 'external' && result.communityShortId && result.pluginId) {
      // 🌐 EXTERNAL NAVIGATION (to other communities)
      try {
        const externalUrl = `https://app.commonground.wtf/c/${result.communityShortId}/plugin/${result.pluginId}`;
        
        if (cgInstance) {
          await cgInstance.navigate(externalUrl);
        } else {
          window.open(externalUrl, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        console.error('External navigation failed:', error);
      }
    } else {
      // 🏠 INTERNAL NAVIGATION (within current community)
      const postUrl = buildPostUrl(result.postId, result.boardId);
      router.push(postUrl); // Uses Next.js navigation
    }
    
    // Notify parent component
    onAction?.('navigateToPost', { 
      postId: result.postId, 
      boardId: result.boardId,
      navigationType: result.navigationType
    });
  };

  if (!data.success || !data.searchResults?.length) {
    return (
      <div className="mt-2 p-3 bg-orange-50/80 dark:bg-orange-950/30 rounded-md border border-orange-200/60 dark:border-orange-800/60">
        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-200">
          <Search className="w-4 h-4" />
          <span className="text-sm">No results found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 rounded-md border border-green-200/60 dark:border-green-800/60">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
          <Search className="w-3 h-3 text-green-600 dark:text-green-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2 text-sm">
            Found {data.searchResults.length} result{data.searchResults.length !== 1 ? 's' : ''}
          </h4>
          
          <div className="space-y-2">
            {data.searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handlePostClick(result)}
                className="w-full p-2 bg-white/60 dark:bg-gray-800/60 rounded border border-green-200/40 dark:border-green-700/40 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors text-left group"
              >
                <div className="flex items-start gap-2">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage src={result.authorAvatar} alt={result.author} />
                    <AvatarFallback className="text-xs">
                      {result.author.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                        {result.title}
                      </h5>
                      {result.navigationType === 'external' ? (
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>by {result.author}</span>
                      <span>•</span>
                      <span>#{result.boardName}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {result.upvotes}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                      {result.snippet}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 