import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Users, MessageSquare, Calendar, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  userId,
  username,
  open,
  onOpenChange,
  children,
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 p-0" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        {isLoading ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading profile...</span>
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
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-base truncate">{profile.name}</h3>
                    {profile.source === 'friend' && (
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                        <Users className="h-3 w-3 mr-1" />
                        Friend
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
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <Users className="h-4 w-4 mr-1" />
                  Member of {profile.communities.length} {profile.communities.length === 1 ? 'community' : 'communities'}
                </div>
                <div className="space-y-1">
                  {profile.communities.slice(0, 3).map((community) => (
                    <div key={community.id} className="flex items-center space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                      <span className="truncate">{community.name}</span>
                    </div>
                  ))}
                  {profile.communities.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-3.5">
                      +{profile.communities.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Joined date */}
            {profile.stats?.joined_date && (
              <div className="p-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  Joined {formatDate(profile.stats.joined_date)}
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="p-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  // TODO: Navigate to user profile or start conversation
                  console.log('View full profile:', profile.id);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 