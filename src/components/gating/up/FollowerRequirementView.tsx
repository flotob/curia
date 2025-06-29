import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { FollowerRequirement } from '@/types/gating';
import { getUPSocialProfile, UPSocialProfile } from '@/lib/upProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FollowerRequirementViewProps {
  requirement: FollowerRequirement;
  status?: {
    isMet: boolean;
    current?: string;
  };
  isLoading: boolean;
}

export const FollowerRequirementView: React.FC<FollowerRequirementViewProps> = ({
  requirement,
  status,
  isLoading,
}) => {
  const [profile, setProfile] = useState<UPSocialProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (requirement.type === 'minimum_followers') return;

    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const upProfile = await getUPSocialProfile(requirement.value);
        setProfile(upProfile);
      } catch (error) {
        console.error(`Failed to fetch profile for ${requirement.value}`, error);
        // Create a fallback profile
        setProfile({
            address: requirement.value,
            displayName: `${requirement.value.slice(0, 6)}...${requirement.value.slice(-4)}`,
            username: `@${requirement.value.slice(2, 6)}${requirement.value.slice(-4)}.lukso`,
            isVerified: false,
            lastFetched: new Date()
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [requirement.type, requirement.value]);

  const renderRequirementText = () => {
    if (requirement.type === 'minimum_followers') {
      return `Requires at least ${requirement.value} followers`;
    }
    if (profile) {
      return requirement.type === 'followed_by'
        ? `Must be followed by ${profile.displayName}`
        : `Must be following ${profile.displayName}`;
    }
    return 'Loading profile...';
  };
  
  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
      <div className="flex items-center space-x-2">
        {requirement.type === 'minimum_followers' ? (
            <Users className="h-4 w-4 text-purple-500" />
        ) : (
            isLoadingProfile ? <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" /> :
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.profileImage} />
              <AvatarFallback>{profile?.displayName?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
        )}
        <span className="text-sm">{renderRequirementText()}</span>
      </div>
      <div className="flex items-center space-x-2">
        {isLoading ? (
          <Badge variant="outline">Loading...</Badge>
        ) : status ? (
          <Badge variant={status.isMet ? 'default' : 'destructive'}>
            {status.isMet ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
            {status.current || (status.isMet ? 'Met' : 'Not Met')}
          </Badge>
        ) : (
          <Badge variant="secondary">Not Connected</Badge>
        )}
      </div>
    </div>
  );
}; 