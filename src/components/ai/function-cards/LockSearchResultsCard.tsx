import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Shield, 
  Users, 
  Clock, 
  Crown,
  Eye,
  Search
} from 'lucide-react';
import { TypedFunctionCardProps } from '../types/FunctionCardProps';
import { LockSearchResultsData } from '@/lib/ai/types/FunctionResult';

export function LockSearchResultsCard({ 
  data, 
  onAction 
}: TypedFunctionCardProps<LockSearchResultsData>) {
  
  const handleLockClick = (lock: NonNullable<LockSearchResultsData['searchResults']>[0]) => {
    onAction?.('openLockPreview', { 
      lockId: lock.id,
      lockData: lock
    });
  };

  if (!data.success || !data.searchResults?.length) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
        <Search className="w-4 h-4" />
        <span className="text-sm">No locks found matching your search</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {data.searchResults.map((lock) => (
        <button
          key={lock.id}
          onClick={() => handleLockClick(lock)}
          className="w-full p-3 bg-card border border-border hover:border-border/60 rounded-lg hover:bg-accent/50 transition-all text-left group"
        >
          <div className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium flex-shrink-0"
              style={{ backgroundColor: lock.color }}
            >
              <span className="text-sm">{lock.icon}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {lock.name}
                  </h3>
                  {lock.isTemplate && (
                    <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Avatar className="w-3 h-3">
                    <AvatarImage src={lock.creatorAvatar} alt={lock.creatorName} />
                    <AvatarFallback className="text-xs">
                      {lock.creatorName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>by {lock.creatorName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  <span>{lock.requirementCount} requirement{lock.requirementCount !== 1 ? 's' : ''}</span>
                  <Badge variant="outline" className="text-xs px-1 py-0 ml-1">
                    {lock.requirementType}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{lock.usageCount} uses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>~{lock.avgVerificationTime}min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
} 