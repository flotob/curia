'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
// import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Loader2, Users, ArrowRight, Info } from 'lucide-react';
import { 
  CreatePartnershipRequest, 
  PartnershipType, 
  PartnershipPermissions,
  CommunityPartnership
} from '@/types/partnerships';
import { toast } from '@/hooks/use-toast';

interface Community {
  id: string;
  name: string;
  logoUrl?: string;
}

interface CreatePartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePartnershipModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreatePartnershipModalProps) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [relationshipType, setRelationshipType] = useState<PartnershipType>('partner');
  const [inviteMessage, setInviteMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Permission states
  const [sourceToTargetPermissions, setSourceToTargetPermissions] = useState<PartnershipPermissions>({
    allowCrossCommunityNavigation: true,
    allowCrossCommunityNotifications: true,
    allowCrossCommunitySearch: true,
    allowPresenceSharing: true,
    allowBoardSharing: false
  });
  
  const [targetToSourcePermissions, setTargetToSourcePermissions] = useState<PartnershipPermissions>({
    allowCrossCommunityNavigation: true,
    allowCrossCommunityNotifications: true,
    allowCrossCommunitySearch: true,
    allowPresenceSharing: true,
    allowBoardSharing: false
  });

  // Fetch communities for selection (excluding current community and existing partnerships)
  const { data: communities, isLoading: isLoadingCommunities } = useQuery({
    queryKey: ['communities-available-for-partnership'],
    queryFn: async (): Promise<Community[]> => {
      // First, get all communities
      const allCommunities = await authFetchJson<Community[]>('/api/communities', { token });
      
      // Then, get existing partnerships to filter out
      const partnershipsData = await authFetchJson<{ data: CommunityPartnership[] }>('/api/communities/partnerships', { token });
      const existingPartnershipCommunityIds = new Set<string>();
      
      // Add communities with any active partnership status (pending, accepted, suspended)
      partnershipsData.data?.forEach(partnership => {
        existingPartnershipCommunityIds.add(partnership.sourceCommunityId);
        existingPartnershipCommunityIds.add(partnership.targetCommunityId);
      });
      
      // Filter out current community and communities with existing partnerships
      return allCommunities.filter(community => 
        !existingPartnershipCommunityIds.has(community.id)
      );
    },
    enabled: isOpen && !!token
  });

  // Create partnership mutation
  const createPartnershipMutation = useMutation({
    mutationFn: async (data: CreatePartnershipRequest) => {
      return authFetchJson('/api/communities/partnerships', {
        method: 'POST',
        token,
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: 'Partnership Invitation Sent',
        description: `Invitation sent to ${selectedCommunity?.name}. They can now accept or reject your partnership request.`
      });
      onSuccess();
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleClose = () => {
    setStep(1);
    setSelectedCommunity(null);
    setRelationshipType('partner');
    setInviteMessage('');
    setSearchQuery('');
    setSourceToTargetPermissions({
      allowCrossCommunityNavigation: true,
      allowCrossCommunityNotifications: true,
      allowCrossCommunitySearch: true,
      allowPresenceSharing: true,
      allowBoardSharing: false
    });
    setTargetToSourcePermissions({
      allowCrossCommunityNavigation: true,
      allowCrossCommunityNotifications: true,
      allowCrossCommunitySearch: true,
      allowPresenceSharing: true,
      allowBoardSharing: false
    });
    onClose();
  };

  const handleCreatePartnership = () => {
    if (!selectedCommunity) return;
    
    createPartnershipMutation.mutate({
      targetCommunityId: selectedCommunity.id,
      relationshipType,
      sourceToTargetPermissions,
      targetToSourcePermissions,
      inviteMessage: inviteMessage.trim() || undefined
    });
  };

  const updatePermission = (
    direction: 'sourceToTarget' | 'targetToSource',
    permission: keyof PartnershipPermissions,
    value: boolean
  ) => {
    if (direction === 'sourceToTarget') {
      setSourceToTargetPermissions(prev => ({ ...prev, [permission]: value }));
    } else {
      setTargetToSourcePermissions(prev => ({ ...prev, [permission]: value }));
    }
  };

  const filteredCommunities = communities?.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const renderCommunitySelection = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="community-search">Select Community to Invite</Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="community-search"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {isLoadingCommunities ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No communities found' : 'No communities available'}
          </div>
        ) : (
          filteredCommunities.map((community) => (
            <Card
              key={community.id}
              className={`cursor-pointer transition-colors ${
                selectedCommunity?.id === community.id
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedCommunity(community)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {community.logoUrl && (
                      <AvatarImage 
                        src={community.logoUrl} 
                        alt={community.name}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {community.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{community.name}</p>
                    <p className="text-xs text-gray-500">Community ID: {community.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderPartnershipDetails = () => (
    <div className="space-y-8">
      {/* Selected Community */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Selected Community</Label>
        <Card className="border-2 border-blue-100 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 ring-2 ring-blue-200 dark:ring-blue-700">
                {selectedCommunity?.logoUrl && (
                  <AvatarImage 
                    src={selectedCommunity.logoUrl} 
                    alt={selectedCommunity.name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 font-semibold">
                  {selectedCommunity?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-lg">{selectedCommunity?.name}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Partnership invitation target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relationship Type */}
      <div className="space-y-3">
        <Label htmlFor="relationship-type" className="text-sm font-semibold">Partnership Type</Label>
        <Select 
          value={relationshipType} 
          onValueChange={(value: PartnershipType) => setRelationshipType(value)}
        >
          <SelectTrigger className="h-12 border-2 hover:border-blue-300 focus:border-blue-500 transition-colors">
            <SelectValue placeholder="Select partnership type" />
          </SelectTrigger>
          <SelectContent className="w-full min-w-[400px]">
            <SelectItem value="partner" className="p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <div className="flex items-center gap-3 w-full">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800">
                  <span className="text-lg">🤝</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Partner</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Equal collaboration partnership</p>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="ecosystem" className="p-4 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
              <div className="flex items-center gap-3 w-full">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800">
                  <span className="text-lg">🌐</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Ecosystem</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Part of broader ecosystem network</p>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invite Message */}
      <div className="space-y-3">
        <Label htmlFor="invite-message" className="text-sm font-semibold">Invitation Message (Optional)</Label>
        <Textarea
          id="invite-message"
          placeholder="Tell them why you'd like to partner with their community..."
          value={inviteMessage}
          onChange={(e) => setInviteMessage(e.target.value)}
          className="min-h-[100px] border-2 hover:border-blue-300 focus:border-blue-500 transition-colors resize-none"
          rows={4}
        />
        <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-md border">
          💡 This message will be visible to the target community admins and helps them understand your partnership goals.
        </p>
      </div>
    </div>
  );

  const renderPermissions = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
        <Info className="h-4 w-4" />
        <span>Configure what each community can access from the other</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source to Target Permissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>Your Community</span>
              <ArrowRight className="h-4 w-4" />
              <span>{selectedCommunity?.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'allowCrossCommunityNavigation', label: '🔗 Cross-community navigation', desc: 'Users can navigate between communities' },
              { key: 'allowCrossCommunityNotifications', label: '🔔 Cross-community notifications', desc: 'Receive notifications from other community' },
              { key: 'allowCrossCommunitySearch', label: '🔍 Cross-community search', desc: 'Search content across communities' },
              { key: 'allowPresenceSharing', label: '👥 Presence sharing', desc: 'Share user presence information' },
              { key: 'allowBoardSharing', label: '📋 Board sharing', desc: 'Allow this community to import your boards' }
            ].map(permission => (
              <div key={permission.key} className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{permission.label}</p>
                  <p className="text-xs text-gray-500">{permission.desc}</p>
                </div>
                <Checkbox
                  checked={Boolean(sourceToTargetPermissions[permission.key as keyof PartnershipPermissions])}
                  onCheckedChange={(checked: boolean) => updatePermission('sourceToTarget', permission.key as keyof PartnershipPermissions, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Target to Source Permissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>{selectedCommunity?.name}</span>
              <ArrowRight className="h-4 w-4" />
              <span>Your Community</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'allowCrossCommunityNavigation', label: '🔗 Cross-community navigation', desc: 'Users can navigate between communities' },
              { key: 'allowCrossCommunityNotifications', label: '🔔 Cross-community notifications', desc: 'Receive notifications from other community' },
              { key: 'allowCrossCommunitySearch', label: '🔍 Cross-community search', desc: 'Search content across communities' },
              { key: 'allowPresenceSharing', label: '👥 Presence sharing', desc: 'Share user presence information' },
              { key: 'allowBoardSharing', label: '📋 Board sharing', desc: 'Allow this community to import your boards' }
            ].map(permission => (
              <div key={permission.key} className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{permission.label}</p>
                  <p className="text-xs text-gray-500">{permission.desc}</p>
                </div>
                <Checkbox
                  checked={Boolean(targetToSourcePermissions[permission.key as keyof PartnershipPermissions])}
                  onCheckedChange={(checked: boolean) => updatePermission('targetToSource', permission.key as keyof PartnershipPermissions, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Select Community';
      case 2: return 'Partnership Details';
      case 3: return 'Configure Permissions';
      default: return 'Create Partnership';
    }
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1: return selectedCommunity !== null;
      case 2: return relationshipType !== undefined;
      case 3: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNumber === step
                      ? 'bg-blue-600 text-white'
                      : stepNumber < step
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-8 h-0.5 ${stepNumber < step ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="py-6">
          {step === 1 && renderCommunitySelection()}
          {step === 2 && renderPartnershipDetails()}
          {step === 3 && renderPermissions()}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={createPartnershipMutation.isPending}
                >
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceedToNextStep()}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleCreatePartnership}
                  disabled={createPartnershipMutation.isPending || !selectedCommunity}
                >
                  {createPartnershipMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 