import React, { useState, useCallback } from 'react';
import { Search, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ENSUtils } from '@/lib/ensResolution';

// Types
interface SearchProfile {
  address: string;
  displayName: string;
  avatar?: string;
  description?: string;
  isVerified?: boolean;
  source: 'ens' | 'efp' | 'up';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

interface NameFirstSearchProps {
  placeholder?: string;
  onSelect: (profile: SearchProfile) => void;
  searchTypes?: ('ens' | 'efp' | 'up')[];
  className?: string;
  disabled?: boolean;
}

/**
 * Universal name-first search component
 * Supports ENS names, EFP profiles, and Universal Profiles
 */
export function NameFirstSearch({
  placeholder = "Search by name or address...",
  onSelect,
  searchTypes = ['ens', 'efp', 'up'],
  className = "",
  disabled = false
}: NameFirstSearchProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search ENS profiles
   */
  const searchENS = async (searchQuery: string): Promise<SearchProfile[]> => {
    if (!searchTypes.includes('ens')) {
      return [];
    }

    try {
      const ensProfile = await ENSUtils.smartENSSearch(searchQuery);
      
      if (ensProfile) {
        return [{
          address: ensProfile.address,
          displayName: ensProfile.name || `${ensProfile.address.slice(0, 6)}...${ensProfile.address.slice(-4)}`,
          avatar: ensProfile.avatar,
          description: ensProfile.description,
          isVerified: ensProfile.isValidENS,
          source: 'ens',
          metadata: ensProfile
        }];
      }
    } catch (error) {
      console.warn('[NameFirstSearch] ENS search failed:', error);
    }
    
    return [];
  };

  /**
   * Search EFP profiles
   */
  const searchEFP = async (searchQuery: string): Promise<SearchProfile[]> => {
    if (!searchTypes.includes('efp')) {
      return [];
    }

    try {
      // Try ENS first for EFP (most EFP users have ENS)
      const ensResult = await searchENS(searchQuery);
      if (ensResult.length > 0) {
        // Enhance with EFP data if available
        const efpEnhanced = await enhanceWithEFPData(ensResult[0]);
        return efpEnhanced ? [efpEnhanced] : ensResult;
      }

      // If no ENS, try direct address search with EFP
      if (ENSUtils.isValidEthereumAddress(searchQuery)) {
        const efpProfile = await fetchEFPProfile(searchQuery);
        if (efpProfile) {
          return [efpProfile];
        }
      }
    } catch (error) {
      console.warn('[NameFirstSearch] EFP search failed:', error);
    }
    
    return [];
  };

  /**
   * Search Universal Profiles
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const searchUP = async (_searchQuery: string): Promise<SearchProfile[]> => {
    if (!searchTypes.includes('up')) {
      return [];
    }

    // UP search is more complex - would need LSP26 follower system
    // For now, return empty array (could be enhanced later)
    console.log('[NameFirstSearch] UP search not yet implemented');
    return [];
  };

  /**
   * Enhance ENS profile with EFP data
   */
  const enhanceWithEFPData = async (ensProfile: SearchProfile): Promise<SearchProfile | null> => {
    try {
      const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${ensProfile.address}/stats`);
      if (response.ok) {
        const efpStats = await response.json();
        return {
          ...ensProfile,
          source: 'efp',
          description: `${efpStats.followers_count} followers • ${efpStats.following_count} following`,
          metadata: {
            ...ensProfile.metadata,
            efpStats
          }
        };
      }
    } catch (error) {
      console.warn('[NameFirstSearch] EFP enhancement failed:', error);
    }
    return null;
  };

  /**
   * Fetch EFP profile for address
   */
  const fetchEFPProfile = async (address: string): Promise<SearchProfile | null> => {
    try {
      const [detailsResponse, statsResponse] = await Promise.all([
        fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/details`),
        fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/stats`)
      ]);

      if (detailsResponse.ok && statsResponse.ok) {
        const details = await detailsResponse.json();
        const stats = await statsResponse.json();

        return {
          address,
          displayName: details.ens?.name || `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: details.ens?.avatar,
          description: `${stats.followers_count} followers • ${stats.following_count} following`,
          isVerified: !!details.ens?.name,
          source: 'efp',
          metadata: { details, stats }
        };
      }
    } catch (error) {
      console.warn('[NameFirstSearch] EFP profile fetch failed:', error);
    }
    return null;
  };

  /**
   * Perform comprehensive search across all enabled types
   */
  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchPromises = [];

      if (searchTypes.includes('ens')) {
        searchPromises.push(searchENS(query.trim()));
      }
      if (searchTypes.includes('efp')) {
        searchPromises.push(searchEFP(query.trim()));
      }
      if (searchTypes.includes('up')) {
        searchPromises.push(searchUP(query.trim()));
      }

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();
      
      // Deduplicate by address
      const uniqueResults = allResults.filter((result, index, array) => 
        index === array.findIndex(r => r.address === result.address)
      );

      setResults(uniqueResults);

      if (uniqueResults.length === 0) {
        setError('No profiles found for this search query');
      }

    } catch (error) {
      console.error('[NameFirstSearch] Search failed:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [query, searchTypes]);

  /**
   * Handle search trigger
   */
  const handleSearch = () => {
    performSearch();
  };

  /**
   * Handle Enter key
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  /**
   * Handle profile selection
   */
  const handleSelect = (profile: SearchProfile) => {
    onSelect(profile);
    setQuery('');
    setResults([]);
    setError(null);
  };

  /**
   * Get source badge color
   */
  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'ens': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'efp': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'up': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || isLoading}
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          disabled={disabled || isLoading || !query.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Search Results</h4>
          <div className="space-y-2">
            {results.map((profile, index) => (
              <div
                key={`${profile.address}-${index}`}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors"
                onClick={() => handleSelect(profile)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar} alt={profile.displayName} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {profile.displayName}
                    </p>
                    {profile.isVerified && (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    <Badge className={`text-xs ${getSourceBadgeColor(profile.source)}`}>
                      {profile.source.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {profile.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {profile.description}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Searching profiles...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Export types for use in other components
export type { SearchProfile, NameFirstSearchProps }; 