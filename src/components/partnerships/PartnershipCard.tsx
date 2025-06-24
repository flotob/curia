'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Check, 
  X, 
  Clock, 
  Pause, 
  Play,
  Calendar,
  User,
  MapPin
} from 'lucide-react';

import { CommunityPartnership, PartnershipStatus } from '@/types/partnerships';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface PartnershipCardProps {
  partnership: CommunityPartnership;
  mode?: 'full' | 'compact';
  onUpdate: () => void;
}

export default function PartnershipCard({ 
  partnership, 
  mode = 'full', 
  onUpdate 
}: PartnershipCardProps) {
  const { token } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Status update mutation
  const updatePartnershipMutation = useMutation({
    mutationFn: async ({ status, responseMessage }: { status: PartnershipStatus; responseMessage?: string }) => {
      return authFetchJson(`/api/communities/partnerships/${partnership.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ status, responseMessage })
      });
    },
    onSuccess: () => {
      onUpdate();
      setIsUpdating(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setIsUpdating(false);
    }
  });

  const handleStatusUpdate = (status: PartnershipStatus, responseMessage?: string) => {
    setIsUpdating(true);
    updatePartnershipMutation.mutate({ status, responseMessage });
  };

  const getStatusBadge = (status: PartnershipStatus) => {
    const variants = {
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
      accepted: { variant: 'default' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      rejected: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
      cancelled: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' },
      suspended: { variant: 'outline' as const, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
      expired: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' }
    };
    
    const config = variants[status];
    return (
      <Badge className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRelationshipIcon = () => {
    return partnership.relationshipType === 'ecosystem' ? '🌐' : '🤝';
  };

  const getPartnerCommunityName = () => {
    // Show the other community (not the current user's community)
    return partnership.targetCommunityName || partnership.sourceCommunityName || 'Unknown Community';
  };

  const getPartnerCommunityLogo = () => {
    // Show the other community's logo (not the current user's community)
    return partnership.targetCommunityLogoUrl || partnership.sourceCommunityLogoUrl;
  };

  const getTimeInfo = () => {
    const timeAgo = formatDistanceToNow(new Date(partnership.createdAt), { addSuffix: true });
    
    if (partnership.status === 'accepted' && partnership.partnershipStartedAt) {
      const startedAgo = formatDistanceToNow(new Date(partnership.partnershipStartedAt), { addSuffix: true });
      return `Active since ${startedAgo}`;
    }
    
    return `Created ${timeAgo}`;
  };

  const renderActionButtons = () => {
    if (isUpdating) {
      return (
        <Button disabled size="sm">
          <Clock className="h-4 w-4 mr-2 animate-spin" />
          Updating...
        </Button>
      );
    }

    if (partnership.canRespond) {
      return (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => handleStatusUpdate('accepted')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleStatusUpdate('rejected')}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      );
    }

    if (partnership.canCancel) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleStatusUpdate('cancelled')}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      );
    }

    if (partnership.canSuspend) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleStatusUpdate('suspended')}
        >
          <Pause className="h-4 w-4 mr-1" />
          Suspend
        </Button>
      );
    }

    if (partnership.canResume) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleStatusUpdate('accepted')}
          className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
        >
          <Play className="h-4 w-4 mr-1" />
          Resume
        </Button>
      );
    }

    return null;
  };

  const renderPermissionsSummary = () => {
    const sourcePerms = partnership.sourceToTargetPermissions;
    const targetPerms = partnership.targetToSourcePermissions;
    
    const permissions = [
      { key: 'allowCrossCommunityNavigation', label: '🔗 Navigation', source: sourcePerms.allowCrossCommunityNavigation, target: targetPerms.allowCrossCommunityNavigation },
      { key: 'allowCrossCommunityNotifications', label: '🔔 Notifications', source: sourcePerms.allowCrossCommunityNotifications, target: targetPerms.allowCrossCommunityNotifications },
      { key: 'allowCrossCommunitySearch', label: '🔍 Search', source: sourcePerms.allowCrossCommunitySearch, target: targetPerms.allowCrossCommunitySearch },
      { key: 'allowPresenceSharing', label: '👥 Presence', source: sourcePerms.allowPresenceSharing, target: targetPerms.allowPresenceSharing }
    ];
    
    const enabledCount = permissions.filter(p => p.source || p.target).length;
    
    if (mode === 'compact') {
      return (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {enabledCount} of {permissions.length} permissions enabled
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {permissions.map(perm => (
          <div key={perm.key} className="flex items-center gap-1">
            <span>{perm.label}</span>
            <span className={perm.source || perm.target ? 'text-green-500' : 'text-gray-400'}>
              {perm.source || perm.target ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Compact mode for widget display
  if (mode === 'compact') {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {getPartnerCommunityLogo() && (
              <AvatarImage 
                src={getPartnerCommunityLogo()} 
                alt={getPartnerCommunityName()}
                className="object-cover"
              />
            )}
            <AvatarFallback className="text-xs">
              {getPartnerCommunityName().substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {getPartnerCommunityName()}
              </span>
              {getStatusBadge(partnership.status)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {partnership.relationshipType} • {getTimeInfo()}
            </div>
          </div>
          
          {renderActionButtons()}
        </div>
      </Card>
    );
  }

  // Full mode for main display
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {getPartnerCommunityLogo() && (
                <AvatarImage 
                  src={getPartnerCommunityLogo()} 
                  alt={getPartnerCommunityName()}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="text-lg">
                {getPartnerCommunityName().substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{getPartnerCommunityName()}</h3>
                {getStatusBadge(partnership.status)}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span>{getRelationshipIcon()}</span>
                  <span className="capitalize">{partnership.relationshipType}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Invited by {partnership.invitedByUserName || 'Unknown'}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{getTimeInfo()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {renderActionButtons()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Invite/Response Message */}
        {partnership.inviteMessage && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              &ldquo;{partnership.inviteMessage}&rdquo;
            </p>
          </div>
        )}
        
        {partnership.responseMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Response:</strong> &ldquo;{partnership.responseMessage}&rdquo;
            </p>
          </div>
        )}
        
        {/* Permissions Summary */}
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Partnership Permissions
          </h4>
          {renderPermissionsSummary()}
        </div>
        
        {/* Additional Info for Different States */}
        {partnership.status === 'accepted' && partnership.partnershipStartedAt && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span>Partnership active since {formatDistanceToNow(new Date(partnership.partnershipStartedAt), { addSuffix: true })}</span>
          </div>
        )}
        
        {partnership.status === 'suspended' && partnership.partnershipEndedAt && (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <Pause className="h-4 w-4" />
            <span>Partnership suspended {formatDistanceToNow(new Date(partnership.partnershipEndedAt), { addSuffix: true })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 