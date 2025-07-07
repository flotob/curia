import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowUpRight, ExternalLink, Hash, Clock, User } from 'lucide-react';
import { TypedFunctionCardProps } from '../types/FunctionCardProps';
import { SearchResultsData } from '@/lib/ai/types/FunctionResult';
import { useCgLib } from '@/contexts/CgLibContext';
import { useRouter } from 'next/navigation';
import { buildPostUrl } from '@/utils/urlBuilder';
import { useTimeSince } from '@/utils/timeUtils';

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
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
        <Search className="w-4 h-4" />
        <span className="text-sm">No results found</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {data.searchResults.map((result, index) => (
        <button
          key={index}
          onClick={() => handlePostClick(result)}
          className="w-full p-3 bg-card border border-border hover:border-border/60 rounded-lg hover:bg-accent/50 transition-all text-left group"
        >
          <div className="flex items-start gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={result.authorAvatar} alt={result.author} />
              <AvatarFallback className="text-xs">
                {result.author.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {result.title}
                </h3>
                {result.navigationType === 'external' ? (
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>by {result.author}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  <span>{result.boardName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{useTimeSince(result.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
} 