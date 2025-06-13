'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Grid3X3, 
  List, 
  Users, 
  Star,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { LockWithStats } from '@/types/locks';
import { LockCard } from './LockCard';
import { LockPreviewModal } from './LockPreviewModal';
import { useAuth } from '@/contexts/AuthContext';

interface LockBrowserProps {
  onSelectLock?: (lock: LockWithStats) => void; // Optional - if provided, uses callback mode
  onCreateNew?: () => void;
  selectedLockId?: number; // For highlighting selected lock in callback mode
  className?: string;
}

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'mine' | 'public' | 'templates';
type SortMode = 'recent' | 'popular' | 'name' | 'usage';

interface LockFilters {
  search: string;
  filter: FilterMode;
  sort: SortMode;
  tags: string[];
}

export const LockBrowser: React.FC<LockBrowserProps> = ({
  onSelectLock,
  onCreateNew,
  selectedLockId,
  className = ''
}) => {
  const { user, token } = useAuth();
  const currentUserId = user?.userId;
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State (only used when no onSelectLock callback provided)
  const [selectedLock, setSelectedLock] = useState<LockWithStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Determine if we're in callback mode or modal mode
  const useCallbackMode = Boolean(onSelectLock);
  
  // Filter State
  const [filters, setFilters] = useState<LockFilters>({
    search: '',
    filter: 'all',
    sort: 'recent',
    tags: []
  });
  
  // Data State
  const [locks, setLocks] = useState<LockWithStats[]>([]);
  
  // Handle lock selection (either callback or modal mode)
  const handleLockSelect = (lock: LockWithStats) => {
    if (useCallbackMode && onSelectLock) {
      // Callback mode - call the provided callback
      onSelectLock(lock);
    } else {
      // Modal mode - open preview modal
      setSelectedLock(lock);
      setIsModalOpen(true);
    }
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLock(null);
  };
  
  // Load locks from API
  const loadLocks = useCallback(async () => {
    if (!user?.cid) {
      setError('Community context required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.search.trim()) {
        params.append('search', filters.search.trim());
      }
      
      if (filters.filter === 'mine' && currentUserId) {
        params.append('createdBy', currentUserId);
      }
      
      if (filters.filter === 'templates') {
        params.append('includePublic', 'false');
        params.append('includeTemplates', 'true');
      }
      
      if (filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }

      
      const response = await fetch(`/api/locks?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load locks: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLocks(data.data || []);
        
        // Extract unique tags for filter UI (for future use)
        // const tags = new Set<string>();
        // data.data?.forEach((lock: LockWithStats) => {
        //   lock.tags?.forEach(tag => {
        //     if (tag && !['migrated', 'auto-generated'].includes(tag)) {
        //       tags.add(tag);
        //     }
        //   });
        // });
        
        console.log(`[LockBrowser] Loaded ${data.data?.length || 0} locks`);
      } else {
        throw new Error(data.error || 'Failed to load locks');
      }
    } catch (error) {
      console.error('[LockBrowser] Error loading locks:', error);
      setError(error instanceof Error ? error.message : 'Failed to load locks');
    } finally {
      setIsLoading(false);
    }
  }, [user?.cid, token, filters]);
  
  // Load locks on mount and filter changes
  useEffect(() => {
    loadLocks();
  }, [loadLocks]);
  
  // Filter and sort locks client-side for immediate UI feedback
  const processedLocks = useMemo(() => {
    const result = [...locks];
    
    // Apply client-side sorting for immediate feedback
    result.sort((a, b) => {
      switch (filters.sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popular':
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    return result;
  }, [locks, filters.sort]);
  
  // Update filters
  const updateFilter = (key: keyof LockFilters, value: string | FilterMode | SortMode | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Get filter count for UI
  const getFilterCounts = () => {
    const total = locks.length;
    const mine = locks.filter(lock => lock.creatorUserId === currentUserId).length;
    const templates = locks.filter(lock => lock.isTemplate).length;
    const publicLocks = locks.filter(lock => lock.isPublic && !lock.isTemplate).length;
    
    return { total, mine, templates, public: publicLocks };
  };
  
  const filterCounts = getFilterCounts();
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Browse Locks</h2>
          <p className="text-sm text-muted-foreground">
            Choose an existing lock or create a new one
          </p>
        </div>
        
        {onCreateNew && (
          <Button onClick={onCreateNew} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create New Lock</span>
          </Button>
        )}
      </div>
      
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locks by name or description..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Filter Tabs */}
        <div className="flex border rounded-md">
          {[
            { key: 'all' as FilterMode, label: 'All', count: filterCounts.total, icon: null },
            { key: 'mine' as FilterMode, label: 'Mine', count: filterCounts.mine, icon: Users },
            { key: 'templates' as FilterMode, label: 'Templates', count: filterCounts.templates, icon: Star },
            { key: 'public' as FilterMode, label: 'Public', count: filterCounts.public, icon: null }
          ].map((tab, index) => (
            <Button
              key={tab.key}
              variant={filters.filter === tab.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('filter', tab.key)}
              className={`
                ${index === 0 ? '' : 'border-l rounded-l-none'}
                ${index === 3 ? '' : 'rounded-r-none'}
                flex items-center space-x-1
              `}
            >
              {tab.icon && <tab.icon className="h-3 w-3" />}
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tab.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        
        {/* Sort */}
        <div className="flex border rounded-md">
          {[
            { key: 'recent' as SortMode, label: 'Recent', icon: Clock },
            { key: 'popular' as SortMode, label: 'Popular', icon: TrendingUp },
            { key: 'name' as SortMode, label: 'Name', icon: null }
          ].map((sort, index) => (
            <Button
              key={sort.key}
              variant={filters.sort === sort.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('sort', sort.key)}
              className={`
                ${index === 0 ? '' : 'border-l rounded-l-none'}
                ${index === 2 ? '' : 'rounded-r-none'}
                flex items-center space-x-1
              `}
            >
              {sort.icon && <sort.icon className="h-3 w-3" />}
              <span>{sort.label}</span>
            </Button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600 text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadLocks}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
      
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading locks...</span>
        </div>
      )}
      
      {!isLoading && !error && processedLocks.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="font-medium mb-2">No locks found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {filters.search.trim() || filters.filter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Create your first lock to get started'}
            </p>
            {onCreateNew && (
              <Button onClick={onCreateNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create New Lock
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {!isLoading && !error && processedLocks.length > 0 && (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        }>
          {processedLocks.map((lock) => (
            <LockCard
              key={lock.id}
              lock={lock}
              isSelected={useCallbackMode ? selectedLockId === lock.id : selectedLock?.id === lock.id}
              onSelect={() => handleLockSelect(lock)}
              variant={viewMode}
              showCreator={filters.filter !== 'mine'}
            />
          ))}
        </div>
      )}
      
      {/* Results Count */}
      {!isLoading && !error && processedLocks.length > 0 && (
        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          Showing {processedLocks.length} lock{processedLocks.length !== 1 ? 's' : ''}
          {filters.search.trim() && ` matching "${filters.search}"`}
        </div>
      )}
      
      {/* Lock Preview Modal - only shown in modal mode */}
      {!useCallbackMode && (
        <LockPreviewModal
          lock={selectedLock}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}; 