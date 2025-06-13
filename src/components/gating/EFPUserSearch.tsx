/**
 * EFP User Search Component
 * 
 * Provides a search interface for finding users by ENS names for EFP requirements
 * Uses the EFP API to search and display user profiles with avatars and stats
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  User, 
  Users, 
  Plus,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface EFPProfile {
  address: string;
  ensName?: string;
  displayName: string;
  avatar?: string;
  followers: number;
  following: number;
  isVerified?: boolean;
}

interface EFPUserSearchProps {
  onSelect: (profile: EFPProfile) => void;
  selectedProfiles?: EFPProfile[];
  placeholder?: string;
  className?: string;
}

export const EFPUserSearch: React.FC<EFPUserSearchProps> = ({
  onSelect,
  selectedProfiles = [],
  placeholder = "Search users by ENS name (e.g., vitalik.eth)",
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EFPProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual search function
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Try multiple search strategies
      const results: EFPProfile[] = [];

      // 1. Direct ENS lookup if it looks like an ENS name
      if (query.includes('.')) {
        try {
          // Fetch both details and stats for complete profile data
          const [detailsResponse, statsResponse] = await Promise.all([
            fetch(`https://api.ethfollow.xyz/api/v1/users/${query}/details`),
            fetch(`https://api.ethfollow.xyz/api/v1/users/${query}/stats`)
          ]);
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            let stats = { followers_count: 0, following_count: 0 };
            
            // Get stats if available
            if (statsResponse.ok) {
              stats = await statsResponse.json();
            }
            
            results.push({
              address: detailsData.address || '',
              ensName: query,
              displayName: detailsData.ens?.name || query,
              avatar: detailsData.ens?.avatar,
              followers: stats.followers_count || 0,
              following: stats.following_count || 0,
              isVerified: true // From EFP API so considered verified
            });
          }
        } catch (error) {
          console.log('Direct ENS lookup failed:', error);
        }
      }

      // 2. Search through EFP leaderboard for similar names
      try {
        const leaderboardResponse = await fetch(`https://api.ethfollow.xyz/api/v1/leaderboard/search?q=${encodeURIComponent(query)}&limit=10`);
        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json();
          
          if (leaderboardData.users) {
            const leaderboardResults = leaderboardData.users.map((user: {
              address: string;
              ens_name?: string;
              display_name?: string;
              avatar?: string;
              followers_count?: number;
              following_count?: number;
            }) => ({
              address: user.address,
              ensName: user.ens_name,
              displayName: user.display_name || user.ens_name || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`,
              avatar: user.avatar,
              followers: user.followers_count || 0,
              following: user.following_count || 0,
              isVerified: true
            }));
            results.push(...leaderboardResults);
          }
        }
      } catch (error) {
        console.log('Leaderboard search failed:', error);
      }

      // 3. Fallback: use ENS resolution service
      if (results.length === 0 && query.includes('.')) {
        try {
          const ensDataResponse = await fetch(`https://ensdata.net/${query}`);
          if (ensDataResponse.ok) {
            const ensData = await ensDataResponse.json();
            if (ensData.address) {
              results.push({
                address: ensData.address,
                ensName: ensData.name || query,
                displayName: ensData.displayName || ensData.name || query,
                avatar: ensData.avatar,
                followers: 0, // Unknown from this API
                following: 0, // Unknown from this API
                isVerified: false // From external API
              });
            }
          }
        } catch (error) {
          console.log('ENS fallback failed:', error);
        }
      }

      // Remove duplicates and already selected profiles
      const uniqueResults = results.filter((result, index, arr) => 
        arr.findIndex(r => r.address.toLowerCase() === result.address.toLowerCase()) === index &&
        !selectedProfiles.some(selected => selected.address.toLowerCase() === result.address.toLowerCase())
      );

      setSearchResults(uniqueResults);

      if (uniqueResults.length === 0 && query.trim()) {
        setError('No profiles found. Try searching with a different ENS name.');
      }

    } catch (error) {
      console.error('Search failed:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [selectedProfiles]);

  // Manual search trigger (no more autosearch)
  const handleManualSearch = () => {
    searchUsers(searchQuery);
  };

  const handleSelect = (profile: EFPProfile) => {
    onSelect(profile);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatFollowerCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input with Manual Trigger */}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && searchQuery.trim() && !isSearching) {
                handleManualSearch();
              }
            }}
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleManualSearch}
          disabled={!searchQuery.trim() || isSearching}
          className="px-3"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg">
          {searchResults.map((profile) => (
            <div
              key={profile.address}
              className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
            >
              <div className="flex items-center space-x-3 flex-1">
                {/* Avatar */}
                <div className="relative">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.displayName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  {profile.isVerified && (
                    <CheckCircle className="absolute -bottom-1 -right-1 h-4 w-4 text-green-500 bg-white rounded-full" />
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm truncate">
                      {profile.displayName}
                    </span>
                    {profile.ensName && profile.ensName !== profile.displayName && (
                      <Badge variant="outline" className="text-xs">
                        {profile.ensName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center space-x-3 mt-1">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{formatFollowerCount(profile.followers)} followers</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{formatFollowerCount(profile.following)} following</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <Button
                size="sm"
                onClick={() => handleSelect(profile)}
                className="h-8 px-3"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Search Hint */}
      {!searchQuery.trim() && (
        <div className="text-xs text-muted-foreground">
          Enter an ENS name (e.g., vitalik.eth) and click Search or press Enter
        </div>
      )}
    </div>
  );
}; 