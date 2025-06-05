'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, ArrowUp, MessageSquare, Plus, TrendingUp, X, Edit3, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoteButton } from '@/components/voting/VoteButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTimeSince } from '@/utils/timeUtils';
import { ExpandedNewPostForm } from '@/components/voting/ExpandedNewPostForm';



interface SearchResult extends ApiPost {
  [key: string]: unknown;
}

export function GlobalSearchModal() {
  const { isSearchOpen, closeSearch, searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery } = useGlobalSearch();
  const { token, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentInput, setCurrentInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0); // For keyboard navigation
  
  // Refs for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Get current board context from URL
  const urlBoardId = searchParams?.get('boardId') || null;
  
  // State for managing current search scope (independent of URL)
  const [currentSearchScope, setCurrentSearchScope] = useState<string | null>(urlBoardId);

  // Sync search scope with URL when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setCurrentSearchScope(urlBoardId);
    }
  }, [isSearchOpen, urlBoardId]);

  // Fetch board information when we have a current search scope
  const { data: currentBoard } = useQuery<ApiBoard | null>({
    queryKey: ['board', currentSearchScope, user?.cid],
    queryFn: async () => {
      if (!currentSearchScope || !user?.cid || !token) return null;
      
      // Get all boards and find the current one
      const boards = await authFetchJson<ApiBoard[]>(`/api/communities/${user.cid}/boards`, { token });
      return boards.find(board => board.id.toString() === currentSearchScope) || null;
    },
    enabled: !!currentSearchScope && !!user?.cid && !!token && isSearchOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle scope toggle
  const handleScopeToggle = useCallback((newScope: string | null) => {
    setCurrentSearchScope(newScope);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Sync with global search query when modal opens
  useEffect(() => {
    if (isSearchOpen && globalSearchQuery !== currentInput) {
      setCurrentInput(globalSearchQuery);
      setSearchQuery(globalSearchQuery);
    }
  }, [isSearchOpen, globalSearchQuery, currentInput]);

  // Debounced search query update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(currentInput);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [currentInput]);

  // Search for similar posts
  const { 
    data: searchResults, 
    isLoading: isSearching,
    error: searchError
  } = useQuery<SearchResult[]>({
    queryKey: ['globalSearchPosts', searchQuery, currentSearchScope],
    queryFn: async () => {
      if (searchQuery.trim().length < 3) return [];
      
      const queryParams = new URLSearchParams({
        q: searchQuery.trim(),
        ...(currentSearchScope && { boardId: currentSearchScope })
      });
      
      return authFetchJson<SearchResult[]>(`/api/search/posts?${queryParams.toString()}`, { token });
    },
    enabled: !!token && searchQuery.trim().length >= 3 && isSearchOpen,
    staleTime: 30000,
  });

  // Handler for modal search input
  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentInput(value);
    setGlobalSearchQuery(value);
  };

  // Helper function to build URLs while preserving current parameters
  const buildInternalUrl = useCallback((path: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Add/override with new params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    return `${path}?${params.toString()}`;
  }, [searchParams]);

  const handlePostClick = useCallback((post: SearchResult) => {
    if (post.board_id) {
      const url = buildInternalUrl(`/board/${post.board_id}/post/${post.id}`);
      router.push(url);
      closeSearch();
    }
  }, [buildInternalUrl, router, closeSearch]);

  const hasResults = searchResults && searchResults.length > 0;
  const showCreateButton = (currentInput.length >= 3 || searchQuery.length >= 3) && !isSearching && (!hasResults || searchResults?.length === 0);
  
  // Calculate total navigable items (Create post + actual results)
  const totalNavigableItems = hasResults ? 1 + searchResults.length : (showCreateButton ? 1 : 0);
  
  // Reset selection when search results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults, showCreateButton]);

  // Auto-scroll to keep selected item visible
  useEffect(() => {
    if (selectedItemRef.current && scrollContainerRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Enhanced close function
  const handleClose = useCallback(() => {
    setShowInlineForm(false);
    setCurrentInput('');
    setSearchQuery('');
    setGlobalSearchQuery('');
    closeSearch();
  }, [closeSearch, setGlobalSearchQuery]);

  // Mobile-responsive create post handler
  const handleCreatePostClick = useCallback(() => {
    if (isMobile) {
      // Mobile: Close modal and navigate to home to show main form
      handleClose();
      const params: Record<string, string> = {
        createPost: 'true',
        title: (currentInput || searchQuery).trim()
      };
      if (currentSearchScope) {
        params.boardId = currentSearchScope;
      }
      const homeUrl = buildInternalUrl('/', params);
      router.push(homeUrl);
    } else {
      // Desktop: Show inline form in modal
      setShowInlineForm(true);
    }
  }, [isMobile, handleClose, currentSearchScope, currentInput, searchQuery, buildInternalUrl, router]);

  // Handle selection of current item
  const handleSelection = useCallback(() => {
    if (totalNavigableItems === 0) return;
    
    if (selectedIndex === 0) {
      // First item is always "Create post"
      handleCreatePostClick();
    } else if (hasResults && searchResults) {
      // Selected a search result
      const resultIndex = selectedIndex - 1;
      const selectedPost = searchResults[resultIndex];
      if (selectedPost) {
        handlePostClick(selectedPost);
      }
    }
  }, [selectedIndex, totalNavigableItems, hasResults, searchResults, handleCreatePostClick, handlePostClick]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
      return;
    }
    
    // Only handle navigation if we have navigable items
    if (totalNavigableItems === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalNavigableItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev === 0 ? totalNavigableItems - 1 : prev - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelection();
    }
  }, [totalNavigableItems, handleClose, handleSelection]);

  // Don't render if not authenticated or modal not open
  if (!isAuthenticated || !isSearchOpen) {
    return null;
  }

  // Portal the modal to document body for global accessibility
  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={handleClose}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
      />
      
      {/* Results Container */}
      <div className="fixed left-0 right-0 top-4 bottom-0 z-50 flex justify-center px-4 animate-in slide-in-from-top-4 duration-300">
        <div className="w-full max-w-4xl">
          <Card className={cn(
            "shadow-2xl border-2 border-primary/20 rounded-2xl overflow-hidden backdrop-blur-md",
            "bg-background/95 max-h-[calc(100vh-2rem)] overscroll-contain"
          )}>
            <CardContent className="p-0">
              {/* Modal Search Input - Sticky at top */}
              <div className="sticky top-0 z-20 p-4 bg-background/95 backdrop-blur-md border-b border-primary/10">
                <div className="relative">
                  <Search 
                    size={20} 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary pointer-events-none"
                  />
                  <Input
                    placeholder={currentInput ? "Continue typing to refine your search..." : "Search posts or start typing to create..."}
                    value={currentInput}
                    className={cn(
                      "pl-12 pr-12 py-4 text-lg transition-all duration-200 font-medium",
                      "bg-background border-2 border-primary/40 rounded-xl shadow-md",
                      "focus:border-primary focus:shadow-lg",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                    onChange={handleModalInputChange}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                  {/* Clear button */}
                  {currentInput && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentInput('');
                        setSearchQuery('');
                        setGlobalSearchQuery('');
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted rounded-full"
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
                
                {/* Search Scope Indicator */}
                {(currentSearchScope || searchQuery.length >= 1) && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-muted-foreground">Searching in:</span>
                    <div className="flex items-center gap-2">
                      {currentSearchScope && currentBoard ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleScopeToggle(null)}
                          className="h-6 px-2 py-1 text-xs hover:bg-muted/80 transition-colors"
                        >
                          <span className="mr-1">📋</span>
                          <span>{currentBoard.name}</span>
                          <X size={12} className="ml-1 opacity-60" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded border border-primary/20">
                          <Globe size={12} />
                          <span>All Boards</span>
                        </div>
                      )}
                      
                      {/* Toggle to board scope if currently global and we have a URL board context */}
                      {!currentSearchScope && urlBoardId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleScopeToggle(urlBoardId)}
                          className="h-6 px-2 py-1 text-xs hover:bg-muted/50 transition-colors"
                        >
                          <span className="mr-1">📋</span>
                          <span>Search this board only</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Keyboard shortcut hints */}
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{currentSearchScope ? `Searching in ${currentBoard?.name || 'current board'}` : 'Search across all posts and boards'}</span>
                  <div className="flex items-center space-x-3">
                    {totalNavigableItems > 0 && (
                      <span className="flex items-center space-x-1">
                        <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">↑</kbd>
                        <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">↓</kbd>
                        <span>navigate</span>
                      </span>
                    )}
                    {totalNavigableItems > 0 && (
                      <span className="flex items-center space-x-1">
                        <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Enter</kbd>
                        <span>select</span>
                      </span>
                    )}
                    <span className="flex items-center space-x-1">
                      <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">ESC</kbd>
                      <span>close</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isSearching && (
                <div className="p-8 flex flex-col items-center justify-center text-muted-foreground min-h-[200px]">
                  <div className="relative">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <div className="absolute inset-0 animate-ping">
                      <Loader2 size={32} className="text-primary/20" />
                    </div>
                  </div>
                  <p className="mt-4 text-lg font-medium">Searching for similar posts...</p>
                  <p className="text-sm text-muted-foreground/70">Finding the best matches for your query</p>
                </div>
              )}

              {/* Error State */}
              {searchError && (
                <div className="p-8 text-center min-h-[200px] flex flex-col justify-center">
                  <div className="text-red-400 mb-4">
                    <Search size={48} className="mx-auto opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-red-500 mb-2">Search temporarily unavailable</h3>
                  <p className="text-sm text-muted-foreground mb-4">Don&apos;t worry, you can still create a new post.</p>
                  <Button 
                    onClick={() => handleCreatePostClick()}
                    className="mx-auto"
                  >
                    <Plus size={16} className="mr-2" />
                    Create new post
                  </Button>
                </div>
              )}

              {/* Empty Input State */}
              {!isSearching && !searchError && !currentInput && !searchQuery && (
                <div className="p-8 text-center min-h-[200px] flex flex-col justify-center">
                  <div className="text-primary/40 mb-4">
                    <Search size={48} className="mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Global Search</h3>
                  <p className="text-muted-foreground mb-4">
                    Start typing above to find existing discussions or create a new post.
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground/70">
                    <div className="flex items-center space-x-1">
                      <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘</kbd>
                      <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">K</kbd>
                      <span>to search</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">↑</kbd>
                      <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">↓</kbd>
                      <span>navigate</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">ESC</kbd>
                      <span>to close</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {hasResults && !showInlineForm && (
                <div 
                  ref={scrollContainerRef}
                  className="overflow-y-auto max-h-[calc(100vh-12rem)] overscroll-contain"
                  onTouchMove={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-6 border-b bg-background/90 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                          <TrendingUp size={20} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">Similar discussions found</h3>
                          <p className="text-sm text-muted-foreground">
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{currentInput || searchQuery}&quot;
                            {currentSearchScope && currentBoard && (
                              <span className="ml-1 text-primary/70">in {currentBoard.name}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Close Button */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleClose}
                        className="rounded-full h-8 w-8 p-0 hover:bg-muted"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Results Grid */}
                  <div className="p-6 grid gap-4">
                    {/* Create New Post Option - Always First */}
                    <div 
                      className="animate-in slide-in-from-bottom-2 duration-300"
                      ref={selectedIndex === 0 ? selectedItemRef : null}
                    >
                      <CreateNewPostItem 
                        searchQuery={(currentInput || searchQuery).trim()} 
                        onClick={() => handleCreatePostClick()}
                        isSelected={selectedIndex === 0}
                      />
                    </div>
                    
                    {/* Actual Search Results */}
                    {searchResults.map((post, index) => (
                      <div 
                        key={post.id}
                        className="animate-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${(index + 1) * 50}ms` }}
                        ref={selectedIndex === index + 1 ? selectedItemRef : null}
                      >
                        <SearchResultItem 
                          post={post} 
                          onClick={() => handlePostClick(post)}
                          isSelected={selectedIndex === index + 1}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Form for Desktop when there are results */}
              {hasResults && showInlineForm && (
                <div className="relative">
                  {/* Close Button for Inline Form State */}
                  <div className="absolute top-4 right-4 z-10">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleClose}
                      className="rounded-full h-8 w-8 p-0 hover:bg-muted"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  
                  {/* Scrollable container for the form */}
                  <div 
                    className="overflow-y-auto max-h-[calc(100vh-12rem)] overscroll-contain"
                    onTouchMove={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div className="p-6">
                      <div className="mb-4 text-center">
                        <h3 className="text-lg font-semibold text-muted-foreground">
                          Creating new post for: &quot;{currentInput || searchQuery}&quot;
                          {currentSearchScope && currentBoard && (
                            <span className="block text-sm font-normal text-muted-foreground/70 mt-1">
                              in {currentBoard.name}
                            </span>
                          )}
                        </h3>
                      </div>
                      <ExpandedNewPostForm 
                        boardId={currentSearchScope}
                        initialTitle={(currentInput || searchQuery).trim()}
                        onCancel={() => setShowInlineForm(false)}
                        onPostCreated={(newPost) => {
                          const postUrl = buildInternalUrl(`/board/${newPost.board_id}/post/${newPost.id}`);
                          router.push(postUrl);
                          handleClose();
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* No Results + Inline Create Post Form */}
              {showCreateButton && (
                <div className="relative">
                  {/* Close Button for No Results State */}
                  <div className="absolute top-4 right-4 z-10">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleClose}
                      className="rounded-full h-8 w-8 p-0 hover:bg-muted"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  
                  {showInlineForm ? (
                    // Show the actual form inline with proper scrolling
                    <div 
                      ref={scrollContainerRef}
                      className="overflow-y-auto max-h-[calc(100vh-12rem)] overscroll-contain"
                      onTouchMove={(e) => e.stopPropagation()}
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <div className="p-6">
                        <div className="mb-4 text-center">
                          <h3 className="text-lg font-semibold text-muted-foreground">
                            Creating new post for: &quot;{currentInput || searchQuery}&quot;
                            {currentSearchScope && currentBoard && (
                              <span className="block text-sm font-normal text-muted-foreground/70 mt-1">
                                in {currentBoard.name}
                              </span>
                            )}
                          </h3>
                        </div>
                        <ExpandedNewPostForm 
                          boardId={currentSearchScope}
                          initialTitle={(currentInput || searchQuery).trim()}
                          onCancel={() => setShowInlineForm(false)}
                          onPostCreated={(newPost) => {
                            const postUrl = buildInternalUrl(`/board/${newPost.board_id}/post/${newPost.id}`);
                            router.push(postUrl);
                            handleClose();
                          }}
                        />
                      </div>
                    </div>
                                        ) : (
                        // Show the button to reveal the form
                        <div 
                          className="p-8 text-center min-h-[300px] flex flex-col justify-center"
                          ref={selectedIndex === 0 ? selectedItemRef : null}
                        >
                          <div className="mb-6">
                            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                              <Search size={32} className="text-primary/60" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No similar posts found</h3>
                            <p className="text-muted-foreground">
                              We couldn&apos;t find any existing discussions about <br />
                              <span className="font-medium text-foreground">&quot;{currentInput || searchQuery}&quot;</span>
                            </p>
                          </div>
                          
                          <div className="space-y-3">
                            <Button 
                              onClick={() => handleCreatePostClick()}
                              size="lg"
                              className={cn(
                                "px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200",
                                selectedIndex === 0 && "ring-2 ring-primary/20 ring-offset-2"
                              )}
                            >
                              <Plus size={20} className="mr-3" />
                              Create new post
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Be the first to start this conversation
                            </p>
                          </div>
                        </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>,
    document.body
  );
}

// Create New Post Item Component
interface CreateNewPostItemProps {
  searchQuery: string;
  onClick: () => void;
  isSelected?: boolean;
}

const CreateNewPostItem: React.FC<CreateNewPostItemProps> = ({ searchQuery, onClick, isSelected }) => {
  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg border-2 relative overflow-hidden",
        "bg-gradient-to-br from-primary/5 to-primary/10",
        isSelected 
          ? "border-primary/80 shadow-lg scale-[1.02] -translate-y-1 ring-2 ring-primary/20" 
          : "border-primary/30 hover:border-primary/60 hover:scale-[1.01] hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Create Post Header */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Edit3 size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary text-base">
                  Create: &quot;{searchQuery}&quot;
                </h3>
                <p className="text-xs text-muted-foreground">
                  Start a new discussion about this topic
                </p>
              </div>
            </div>
          </div>
          
          {/* Action Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-primary/80">
              <Plus size={14} />
              <span className="font-medium">New post</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Be the first to discuss this</span>
            </div>
            
            <div className="text-xs text-primary/60 font-medium">
              Click to create →
            </div>
          </div>
        </div>
        
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[200%] duration-1000" />
      </CardContent>
    </Card>
  );
};

// Search Result Item Component
interface SearchResultItemProps {
  post: SearchResult;
  onClick: () => void;
  isSelected?: boolean;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ post, onClick, isSelected }) => {
  const timeSinceText = useTimeSince(post.created_at);
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg",
        "bg-gradient-to-br from-background to-background/80",
        isSelected 
          ? "border-2 border-primary/80 shadow-lg scale-[1.02] -translate-y-1 ring-2 ring-primary/20" 
          : "border border-border/50 hover:border-primary/30 hover:scale-[1.01] hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Post Title */}
          <div className="space-y-2">
            <h3 className={cn(
              "font-semibold text-foreground line-clamp-2 text-base leading-snug",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {post.title}
            </h3>
            
            {/* Board Context Badge */}
            {post.board_name && (
              <div className="inline-flex items-center">
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded-full",
                  "bg-primary/10 text-primary border border-primary/20"
                )}>
                  📋 {post.board_name}
                </span>
              </div>
            )}
          </div>
          
          {/* Engagement Metrics */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded-lg",
                "bg-muted/50 text-muted-foreground text-sm transition-colors",
                "group-hover:bg-primary/10 group-hover:text-primary"
              )}>
                <ArrowUp size={14} />
                <span className="font-medium">{post.upvote_count}</span>
              </div>
              
              <div className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded-lg",
                "bg-muted/50 text-muted-foreground text-sm transition-colors",
                "group-hover:bg-primary/10 group-hover:text-primary"
              )}>
                <MessageSquare size={14} />
                <span className="font-medium">{post.comment_count}</span>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {timeSinceText}
              </div>
            </div>
            
            {/* Quick Vote Button */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <VoteButton 
                postId={post.id} 
                initialUpvoteCount={post.upvote_count}
                initialUserHasUpvoted={post.user_has_upvoted}
                disabled={false}
                size="sm"
              />
            </div>
          </div>
          
          {/* Subtle engagement indicator */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors duration-200",
                post.upvote_count > 5 ? "bg-green-400" : 
                post.upvote_count > 0 ? "bg-yellow-400" : "bg-muted-foreground/30"
              )} />
              <span>
                {post.upvote_count > 10 ? "Hot discussion" :
                 post.upvote_count > 5 ? "Active discussion" :
                 post.upvote_count > 0 ? "Some activity" : "New discussion"}
              </span>
            </div>
            
            <div className="text-muted-foreground/60">
              Click to view →
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 