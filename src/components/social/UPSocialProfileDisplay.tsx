/**
 * Universal Profile Social Display Component
 * 
 * Beautiful, branded display of UP social profile data
 * Used in gating UI, comment forms, and profile cards
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shield, 
  ExternalLink, 
  Twitter,
  Github,
  Globe,
  MessageCircle,
  Send,
  Verified,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

import { UPSocialProfile, getUPSocialProfile } from '@/lib/upProfile';

// ===== COMPONENT INTERFACES =====

export interface UPSocialProfileDisplayProps {
  address: string;
  variant?: 'card' | 'inline' | 'compact' | 'detailed';
  showConnectionButton?: boolean;
  showSocialLinks?: boolean;
  showBio?: boolean;
  showTags?: boolean;
  showVerificationBadge?: boolean;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => void;
  className?: string;
  profileOverride?: UPSocialProfile; // For when profile is already loaded
}

export interface UPProfileConnectionStatusProps {
  address: string;
  isConnected: boolean;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => void;
  showDisconnectOption?: boolean;
  variant?: 'button' | 'badge' | 'inline';
}

// ===== MAIN SOCIAL PROFILE DISPLAY =====

export const UPSocialProfileDisplay: React.FC<UPSocialProfileDisplayProps> = ({
  address,
  variant = 'card',
  showConnectionButton = false,
  showSocialLinks = true,
  showBio = true,
  showTags = true,
  showVerificationBadge = true,
  onConnect,
  className = '',
  profileOverride
}) => {
  const [profile, setProfile] = useState<UPSocialProfile | null>(profileOverride || null);
  const [isLoading, setIsLoading] = useState(!profileOverride);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch profile data if not provided as override
  useEffect(() => {
    if (profileOverride) {
      setProfile(profileOverride);
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const profileData = await getUPSocialProfile(address);
        setProfile(profileData);
      } catch (err) {
        console.error(`[UPSocialProfileDisplay] Error fetching profile for ${address}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (address && !profileOverride) {
      fetchProfile();
    }
  }, [address, profileOverride]);

  // Manual refresh functionality
  const handleRefresh = async () => {
    if (!address || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const profileData = await getUPSocialProfile(address);
      setProfile(profileData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <UPProfileSkeleton variant={variant} className={className} />;
  }

  // Error state
  if (error || !profile) {
    return (
      <UPProfileError 
        address={address}
        error={error || 'Profile not found'}
        onRetry={handleRefresh}
        variant={variant}
        className={className}
      />
    );
  }

  // Render based on variant
  switch (variant) {
    case 'compact':
      return (
        <UPProfileCompact 
          profile={profile}
          showVerificationBadge={showVerificationBadge}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          className={className}
        />
      );
      
          case 'inline':
        return (
          <UPProfileInline 
            profile={profile}
            showConnectionButton={showConnectionButton}
            onConnect={onConnect}
            className={className}
          />
        );
      
          case 'detailed':
        return (
          <UPProfileDetailed 
            profile={profile}
            showConnectionButton={showConnectionButton}
            showSocialLinks={showSocialLinks}
            showBio={showBio}
            showTags={showTags}
            showVerificationBadge={showVerificationBadge}
            onConnect={onConnect}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            className={className}
          />
        );
      
          default: // 'card'
        return (
          <UPProfileCard 
            profile={profile}
            showConnectionButton={showConnectionButton}
            showSocialLinks={showSocialLinks}
            showBio={showBio}
            showTags={showTags}
            showVerificationBadge={showVerificationBadge}
            onConnect={onConnect}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            className={className}
          />
        );
  }
};

// ===== VARIANT COMPONENTS =====

const UPProfileCard: React.FC<{
  profile: UPSocialProfile;
  showConnectionButton: boolean;
  showSocialLinks: boolean;
  showBio: boolean;
  showTags: boolean;
  showVerificationBadge: boolean;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  className: string;
}> = ({ 
  profile, 
  showConnectionButton, 
  showSocialLinks, 
  showBio, 
  showTags, 
  showVerificationBadge,
  onConnect,
  onRefresh,
  isRefreshing,
  className 
}) => {
  return (
    <Card className={`border-l-4 border-l-pink-500 bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with avatar and basic info */}
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12 border-2 border-pink-200">
              <AvatarImage src={profile.profileImage} alt={`${profile.displayName}'s avatar`} />
              <AvatarFallback className="bg-pink-100 text-pink-800 font-medium">
                {profile.displayName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-sm text-foreground truncate">
                  {profile.displayName}
                </h3>
                {showVerificationBadge && profile.isVerified && (
                  <Verified size={14} className="text-pink-500 flex-shrink-0" />
                )}
              </div>
              
              <p className="text-xs text-muted-foreground font-mono">
                {profile.username}
              </p>
              
              {showBio && profile.bio && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-auto p-1 opacity-60 hover:opacity-100"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            </Button>
          </div>

          {/* Tags */}
          {showTags && profile.tags && profile.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {profile.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-pink-50 border-pink-200 text-pink-800">
                  {tag}
                </Badge>
              ))}
              {profile.tags.length > 3 && (
                <Badge variant="outline" className="text-xs opacity-60">
                  +{profile.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Social Links */}
          {showSocialLinks && profile.socialLinks && profile.socialLinks.length > 0 && (
            <div className="flex items-center space-x-2">
              {profile.socialLinks.slice(0, 4).map((link, index) => (
                <SocialLinkIcon key={index} link={link} />
              ))}
              {profile.socialLinks.length > 4 && (
                <span className="text-xs text-muted-foreground">+{profile.socialLinks.length - 4}</span>
              )}
            </div>
          )}

          {/* Connection Button */}
          {showConnectionButton && (
            <UPProfileConnectionButton
              profile={profile}
              onConnect={onConnect}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const UPProfileCompact: React.FC<{
  profile: UPSocialProfile;
  showVerificationBadge: boolean;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  className: string;
}> = ({ profile, showVerificationBadge, className }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Avatar className="h-6 w-6">
        <AvatarImage src={profile.profileImage} />
        <AvatarFallback className="text-xs">
          {profile.displayName.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex items-center space-x-1 min-w-0">
        <span className="text-sm font-medium truncate">{profile.displayName}</span>
        {showVerificationBadge && profile.isVerified && (
          <Verified size={12} className="text-pink-500 flex-shrink-0" />
        )}
      </div>
      
      <span className="text-xs text-muted-foreground font-mono">
        {profile.username}
      </span>
    </div>
  );
};

const UPProfileInline: React.FC<{
  profile: UPSocialProfile;
  showConnectionButton: boolean;
  onConnect?: () => Promise<void>;
  className: string;
}> = ({ profile, showConnectionButton, onConnect, className }) => {
  return (
    <div className={`flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800 ${className}`}>
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile.profileImage} />
          <AvatarFallback>{profile.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div>
          <div className="font-medium text-sm">{profile.displayName}</div>
          <div className="text-xs text-muted-foreground font-mono">{profile.username}</div>
        </div>
      </div>

              {showConnectionButton && (
          <UPProfileConnectionButton
            profile={profile}
            onConnect={onConnect}
            variant="compact"
          />
        )}
    </div>
  );
};

const UPProfileDetailed: React.FC<{
  profile: UPSocialProfile;
  showConnectionButton: boolean;
  showSocialLinks: boolean;
  showBio: boolean;
  showTags: boolean;
  showVerificationBadge: boolean;
  onConnect?: () => Promise<void>;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  className: string;
}> = ({ 
  profile, 
  showConnectionButton, 
  showSocialLinks, 
  showBio, 
  showTags, 
  showVerificationBadge,
  onConnect,
  className 
}) => {
  return (
    <Card className={`border-l-4 border-l-pink-500 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Hero section with background */}
          {profile.backgroundImage && (
            <div 
              className="h-24 rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.backgroundImage})` }}
            />
          )}
          
          {/* Profile header */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16 border-4 border-white dark:border-gray-800 shadow-lg">
              <AvatarImage src={profile.profileImage} />
              <AvatarFallback className="text-lg font-bold">
                {profile.displayName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-lg font-bold">{profile.displayName}</h2>
                {showVerificationBadge && profile.isVerified && (
                  <Verified size={18} className="text-pink-500" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground font-mono mb-2">
                {profile.username}
              </p>
              
              {showBio && profile.bio && (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Tags section */}
          {showTags && profile.tags && profile.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {profile.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="bg-pink-50 border-pink-200 text-pink-800">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Social links section */}
          {showSocialLinks && profile.socialLinks && profile.socialLinks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Social Links</h4>
              <div className="space-y-2">
                {profile.socialLinks.map((link, index) => (
                  <SocialLinkRow key={index} link={link} />
                ))}
              </div>
            </div>
          )}

          {/* Connection section */}
          {showConnectionButton && (
            <UPProfileConnectionButton
              profile={profile}
              onConnect={onConnect}
              variant="full"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ===== HELPER COMPONENTS =====

const UPProfileConnectionButton: React.FC<{
  profile: UPSocialProfile;
  onConnect?: () => Promise<void>;
  variant?: 'compact' | 'full';
}> = ({ profile, onConnect, variant = 'full' }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!onConnect || isConnecting) return;
    
    setIsConnecting(true);
    try {
      await onConnect();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <Button
        size="sm"
        onClick={handleConnect}
        disabled={isConnecting}
        className="bg-pink-500 hover:bg-pink-600 text-white text-xs"
      >
        {isConnecting ? (
          <RefreshCw size={12} className="animate-spin mr-1" />
        ) : (
          <Shield size={12} className="mr-1" />
        )}
        Connect
      </Button>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="w-full bg-pink-500 hover:bg-pink-600 text-white"
    >
      {isConnecting ? (
        <>
          <RefreshCw size={16} className="animate-spin mr-2" />
          Connecting to {profile.displayName}...
        </>
      ) : (
        <>
          <Shield size={16} className="mr-2" />
          Connect {profile.displayName}
        </>
      )}
    </Button>
  );
};

const SocialLinkIcon: React.FC<{ link: { title?: string; url: string; type?: string } }> = ({ link }) => {
  const IconComponent = getSocialIcon(link.type);
  
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="p-1 rounded hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
      title={link.title}
    >
      <IconComponent size={14} className="text-muted-foreground hover:text-pink-500" />
    </a>
  );
};

const SocialLinkRow: React.FC<{ link: { title?: string; url: string; type?: string } }> = ({ link }) => {
  const IconComponent = getSocialIcon(link.type);
  
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors group"
    >
      <IconComponent size={16} className="text-muted-foreground group-hover:text-pink-500" />
      <span className="text-sm">{link.title || link.url}</span>
      <ExternalLink size={12} className="text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};

// ===== UTILITY FUNCTIONS =====

function getSocialIcon(type?: string) {
  switch (type) {
    case 'twitter': return Twitter;
    case 'github': return Github;
    case 'discord': return MessageCircle;
    case 'telegram': return Send;
    default: return Globe;
  }
}

// ===== LOADING AND ERROR STATES =====

const UPProfileSkeleton: React.FC<{ variant: string; className: string }> = ({ variant, className }) => {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <Card className={`border-l-4 border-l-gray-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const UPProfileError: React.FC<{ 
  address: string; 
  error: string; 
  onRetry: () => void; 
  variant: string; 
  className: string;
}> = ({ address, error, onRetry, variant, className }) => {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 text-red-500 ${className}`}>
        <AlertCircle size={14} />
        <span className="text-xs">Failed to load profile</span>
      </div>
    );
  }

  return (
    <Card className={`border-l-4 border-l-red-500 ${className}`}>
      <CardContent className="p-4 text-center">
        <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-2">
          Failed to load profile for {address.slice(0, 6)}...{address.slice(-4)}
        </p>
        <p className="text-xs text-red-500 mb-3">{error}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw size={12} className="mr-1" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}; 