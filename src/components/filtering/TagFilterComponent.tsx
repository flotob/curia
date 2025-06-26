'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Filter, ChevronDown, ChevronUp, Hash, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';

interface TagSuggestion {
  tag: string;
  usage_count: number;
  board_count?: number;
}

interface TagFilterComponentProps {
  boardId?: string | null;
  theme?: 'light' | 'dark';
  className?: string;
}

export const TagFilterComponent: React.FC<TagFilterComponentProps> = ({
  boardId,
  theme = 'light',
  className = ''
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevBoardIdRef = useRef(boardId);

  // Read initial tags from URL
  useEffect(() => {
    const tagsParam = searchParams?.get('tags');
    if (tagsParam) {
      const tags = tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      setSelectedTags(tags);
      if (tags.length > 0) {
        setIsExpanded(true);
      }
    }
  }, [searchParams]);

  // Fetch tag suggestions
  const { data: suggestions = [], isLoading } = useQuery<TagSuggestion[]>({
    queryKey: ['tagSuggestions', boardId, searchQuery],
    queryFn: async () => {
      if (!token) return [];
      
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (boardId) params.set('boardId', boardId);
      params.set('limit', '15');
      
      try {
        const response = await authFetchJson<TagSuggestion[]>(
          `/api/tags/suggestions?${params.toString()}`,
          { token }
        );
        return response || [];
      } catch (error) {
        console.error('[TagFilterComponent] Failed to fetch suggestions:', error);
        return [];
      }
    },
    enabled: !!token && isExpanded,
    staleTime: 2 * 60 * 1000,
  });

  // Update URL when tags change
  const updateTagsInUrl = useCallback((newTags: string[]) => {
    const currentParams = new URLSearchParams();
    
    if (searchParams) {
      searchParams.forEach((value, key) => {
        currentParams.set(key, value);
      });
    }
    
    if (newTags.length > 0) {
      currentParams.set('tags', newTags.join(','));
    } else {
      currentParams.delete('tags');
    }
    
    const newUrl = `/?${currentParams.toString()}`;
    router.push(newUrl);
  }, [searchParams, router]);

  const addTag = useCallback((tag: string) => {
    if (!selectedTags.includes(tag)) {
      const newTags = [...selectedTags, tag];
      setSelectedTags(newTags);
      updateTagsInUrl(newTags);
    }
    setSearchQuery('');
  }, [selectedTags, updateTagsInUrl]);

  const removeTag = useCallback((tag: string) => {
    const newTags = selectedTags.filter(t => t !== tag);
    setSelectedTags(newTags);
    updateTagsInUrl(newTags);
    
    if (newTags.length === 0) {
      setIsExpanded(false);
    }
  }, [selectedTags, updateTagsInUrl]);

  const clearAllTags = useCallback(() => {
    setSelectedTags([]);
    updateTagsInUrl([]);
    setIsExpanded(false);
    setSearchQuery('');
  }, [updateTagsInUrl]);

  // 🚀 Clear tags when switching between boards
  useEffect(() => {
    // If boardId has changed from previous value, clear tags (but not on initial mount)
    if (prevBoardIdRef.current !== boardId && prevBoardIdRef.current !== undefined) {
      console.log(`[TagFilterComponent] Board changed from ${prevBoardIdRef.current} to ${boardId}, clearing tag filters`);
      clearAllTags();
    }
    prevBoardIdRef.current = boardId;
  }, [boardId, clearAllTags]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
    
    if (!isExpanded) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isExpanded]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTagSelect = useCallback((tag: string) => {
    addTag(tag);
    scrollToTop();
  }, [addTag, scrollToTop]);

  const filteredSuggestions = suggestions.filter(
    suggestion => !selectedTags.includes(suggestion.tag)
  );

  return (
    <div className={cn('w-full', className)}>
      {!isExpanded && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpanded}
            className={cn(
              'h-8 px-3 text-xs transition-all duration-200 hover:shadow-sm',
              selectedTags.length > 0 
                ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10' 
                : 'border-muted hover:bg-muted/50',
              theme === 'dark' 
                ? 'hover:bg-slate-800' 
                : 'hover:bg-slate-50'
            )}
          >
            <Filter size={12} className="mr-1.5" />
            {selectedTags.length > 0 ? (
              <>
                <span className="font-medium">{selectedTags.length}</span>
                <span className="mx-1">tag{selectedTags.length !== 1 ? 's' : ''}</span>
                <ChevronDown size={12} className="ml-1" />
              </>
            ) : (
              <>
                <span>Filter by tags</span>
                <ChevronDown size={12} className="ml-1" />
              </>
            )}
          </Button>
          
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllTags}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </Button>
          )}
        </div>
      )}

      {isExpanded && (
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-primary" />
                <h3 className="font-medium text-sm">Filter by Tags</h3>
                {boardId && (
                  <Badge variant="outline" className="text-xs">
                    <Hash size={10} className="mr-1" />
                    Board-specific
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllTags}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpanded}
                  className="h-7 w-7 p-0"
                >
                  <ChevronUp size={14} />
                </Button>
              </div>
            </div>

            {selectedTags.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Active filters ({selectedTags.length}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <Badge 
                      key={tag}
                      variant="default"
                      className="text-xs pl-2 pr-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                    >
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTag(tag)}
                        className="h-auto w-auto p-0 ml-1.5 hover:bg-primary/20 rounded-full"
                      >
                        <X size={10} />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search for tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted rounded-full"
                >
                  <X size={12} />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {isLoading && (
                <div className="text-xs text-muted-foreground py-2">
                  Loading suggestions...
                </div>
              )}
              
              {!isLoading && filteredSuggestions.length > 0 && (
                <>
                  <div className="flex items-center text-xs font-medium text-muted-foreground">
                    <TrendingUp size={12} className="mr-1" />
                    {searchQuery ? `Results for &ldquo;${searchQuery}&rdquo;` : 'Popular tags'}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion.tag}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTagSelect(suggestion.tag)}
                        className="h-7 px-2 text-xs hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                      >
                        {suggestion.tag}
                        <Badge variant="secondary" className="ml-1.5 text-xs px-1 h-4">
                          {suggestion.usage_count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </>
              )}
              
              {!isLoading && filteredSuggestions.length === 0 && searchQuery && (
                <div className="text-xs text-muted-foreground py-2">
                  No tags found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}
              
              {!isLoading && filteredSuggestions.length === 0 && !searchQuery && (
                <div className="text-xs text-muted-foreground py-2">
                  No tags available in this board
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 