import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpRight, ExternalLink, MessageSquare, Sparkles } from 'lucide-react';
import { TypedFunctionCardProps } from '../types/FunctionCardProps';
import { CommentSearchResultsData } from '@/lib/ai/types/FunctionResult';
import { useCgLib } from '@/contexts/CgLibContext';
import { useRouter } from 'next/navigation';
import { buildPostUrl } from '@/utils/urlBuilder';
import { cn } from '@/lib/utils';

// Simple time formatting utility function (not a hook)
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return "now";
}

// Helper function to get similarity color
function getSimilarityColor(score: number): string {
  if (score >= 50) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (score >= 35) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}

// Helper function to truncate comment content for preview
function truncateComment(content: string, maxLength: number = 140): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

export function CommentSearchResultsCard({ 
  data, 
  onAction 
}: TypedFunctionCardProps<CommentSearchResultsData>) {
  const { cgInstance } = useCgLib();
  const router = useRouter();

  const handleCommentClick = async (result: NonNullable<CommentSearchResultsData['searchResults']>[0]) => {
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
      router.push(postUrl);
    }
    
    // Notify parent component
    onAction?.('navigateToComment', { 
      commentId: result.id,
      postId: result.postId, 
      boardId: result.boardId,
      navigationType: result.navigationType
    });
  };

  if (!data.success || !data.searchResults?.length) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
        <Search className="w-4 h-4" />
        <span className="text-sm">No comment discussions found</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {data.searchResults.map((result, index) => (
        <button
          key={index}
          onClick={() => handleCommentClick(result)}
          className="w-full p-4 bg-card border border-border hover:border-border/60 rounded-lg hover:bg-accent/30 transition-all text-left group"
        >
          {/* Header with avatar and similarity */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={result.authorAvatar} alt={result.author} />
                <AvatarFallback className="text-xs">
                  {result.author.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{result.author}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatTimeAgo(new Date(result.created_at))}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={cn("text-xs px-2 py-1", getSimilarityColor(result.similarity_score))}
              >
                <Sparkles size={10} className="mr-1" />
                {result.similarity_score}%
              </Badge>
              {result.navigationType === 'external' ? (
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Comment content - main focus */}
          <div className="mb-3">
            <p className="text-sm text-foreground leading-relaxed group-hover:text-primary/90 transition-colors">
              &ldquo;{truncateComment(result.content)}&rdquo;
            </p>
          </div>

          {/* Simple post context - one clean line */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="w-3 h-3" />
            <span className="truncate">in &ldquo;{result.postContext.title}&rdquo;</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{result.postContext.boardName}</span>
          </div>
        </button>
      ))}
    </div>
  );
} 