import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, MessageSquare, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { preserveCgParams } from '@/utils/urlBuilder';

interface UserProfile {
  id: string;
  name: string;
  profile_picture_url: string | null;
  source: 'friend' | 'user';
  friendship_status?: string;
  // Extended profile data
  communities?: Array<{
    id: string;
    name: string;
    logo_url?: string;
  }>;
  stats?: {
    posts_count: number;
    comments_count: number;
    joined_date: string;
  };
}

interface UserProfilePopoverProps {
  userId: string;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  // NEW: Community context for partner users
  userCommunityName?: string;
  isCurrentCommunity?: boolean;
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  userId,
  username,
  open,
  onOpenChange,
  children,
  userCommunityName,
  isCurrentCommunity = true,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  // Fetch user profile data when popover opens
  useEffect(() => {
    if (!open || profile) return; // Don't fetch if already loaded

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Clean the userId for direct lookup - handle backward compatibility
        let cleanUserId = userId;
        
        // Handle old hash format for backward compatibility
        if (userId.includes('#') && !userId.startsWith('{')) {
          cleanUserId = userId.split('#')[0];
        }
        
        // For JSON format, userId is already clean since MentionNode passes node.attrs.id directly
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/users/${encodeURIComponent(cleanUserId)}?detailed=true`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[UserProfilePopover] API Response:', data);
          console.log('[UserProfilePopover] Looking up user ID:', cleanUserId);
          
          if (data.user) {
            const user = data.user;
            console.log('[UserProfilePopover] Found user:', user);
            
            // Use real data from API (communities and stats are now real!)
            setProfile({
              ...user,
              communities: user.communities || [],
              stats: user.stats || {
                posts_count: 0,
                comments_count: 0,
                joined_date: new Date().toISOString(),
              },
            });
          } else {
            console.log('[UserProfilePopover] No user in response');
            setError("User not found");
          }
        } else if (response.status === 404) {
          console.log('[UserProfilePopover] User not found (404)');
          setError("User not found");
        } else {
          console.log('[UserProfilePopover] API response not ok:', response.status);
          setError("Failed to load profile");
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [open, userId, username, token, profile]);

  // Reset state when popover closes
  useEffect(() => {
    if (!open) {
      // Don't reset profile immediately to avoid flickering on quick re-opens
      const timeout = setTimeout(() => {
        setProfile(null);
        setError(null);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [open]);



  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 p-0" 
        side="left" 
        align="center"
        sideOffset={12}
      >
        {isLoading ? (
          <div className="p-0">
            {/* Header skeleton */}
            <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-start space-x-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Stats skeleton */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="h-6 w-8 bg-muted rounded animate-pulse mx-auto mb-1" />
                  <div className="h-3 w-12 bg-muted rounded animate-pulse mx-auto" />
                </div>
                <div>
                  <div className="h-6 w-8 bg-muted rounded animate-pulse mx-auto mb-1" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse mx-auto" />
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Communities skeleton */}
            <div className="p-4">
              <div className="flex items-center mb-3">
                <div className="h-4 w-4 bg-muted rounded animate-pulse mr-1" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="h-7 w-24 bg-muted rounded-full animate-pulse" />
                <div className="h-7 w-20 bg-muted rounded-full animate-pulse" />
                <div className="h-7 w-28 bg-muted rounded-full animate-pulse" />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Actions skeleton */}
            <div className="p-4">
              <div className="h-8 w-full bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="text-sm text-muted-foreground">{error}</div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                setError(null);
                setProfile(null);
                // Trigger refetch by closing and opening
                onOpenChange(false);
                setTimeout(() => onOpenChange(true), 100);
              }}
            >
              Try again
            </Button>
          </div>
        ) : profile ? (
          <div className="p-0">
            {/* Header with avatar and basic info */}
            <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-start space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={profile.profile_picture_url || undefined} 
                    alt={profile.name}
                  />
                  <AvatarFallback className="text-sm font-medium">
                    {profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="font-semibold text-base truncate">{profile.name}</h3>
                    {profile.source === 'friend' && (
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                        <Users className="h-3 w-3 mr-1" />
                        Friend
                      </Badge>
                    )}
                    {!isCurrentCommunity && userCommunityName && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        From {userCommunityName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">@{username}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats section */}
            {profile.stats && (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{profile.stats.posts_count}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Posts
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{profile.stats.comments_count}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Comments
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Communities section */}
            {profile.communities && profile.communities.length > 0 && (
              <div className="p-4">
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <Users className="h-4 w-4 mr-1" />
                  Member of {profile.communities.length} {profile.communities.length === 1 ? 'community' : 'communities'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.communities.slice(0, 4).map((community) => (
                    <div 
                      key={community.id} 
                      className="inline-flex items-center space-x-2 bg-secondary/50 hover:bg-secondary/70 transition-colors rounded-full px-3 py-1.5 text-xs"
                    >
                      {community.logo_url ? (
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={community.logo_url} alt={community.name} />
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {community.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {community.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="truncate max-w-24 font-medium">{community.name}</span>
                    </div>
                  ))}
                  {profile.communities.length > 4 && (
                    <div className="inline-flex items-center bg-muted/50 rounded-full px-3 py-1.5 text-xs text-muted-foreground font-medium">
                      +{profile.communities.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="p-4">
              <Link 
                href={preserveCgParams(`/profile/${profile.id}`)}
                onClick={() => onOpenChange(false)} // Close popover when navigating
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 