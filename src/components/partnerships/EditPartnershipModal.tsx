'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Settings, Check, X } from 'lucide-react';
import { CommunityPartnership, PartnershipPermissions, UpdatePartnershipRequest } from '@/types/partnerships';
import { toast } from '@/hooks/use-toast';

interface EditPartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnership: CommunityPartnership;
  onSuccess: () => void;
}

export default function EditPartnershipModal({
  isOpen,
  onClose,
  partnership,
  onSuccess
}: EditPartnershipModalProps) {
  const { token, user } = useAuth();
  
  // Permission states
  const [sourceToTargetPermissions, setSourceToTargetPermissions] = useState<PartnershipPermissions>(
    partnership.sourceToTargetPermissions
  );
  const [targetToSourcePermissions, setTargetToSourcePermissions] = useState<PartnershipPermissions>(
    partnership.targetToSourcePermissions
  );

  // Reset state when partnership changes
  useEffect(() => {
    setSourceToTargetPermissions(partnership.sourceToTargetPermissions);
    setTargetToSourcePermissions(partnership.targetToSourcePermissions);
  }, [partnership]);

  // Update mutation
  const updatePartnershipMutation = useMutation({
    mutationFn: async (data: UpdatePartnershipRequest) => {
      return authFetchJson(`/api/communities/partnerships/${partnership.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: 'Partnership Updated',
        description: 'Partnership permissions have been updated successfully.'
      });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleClose = () => {
    // Reset to original values
    setSourceToTargetPermissions(partnership.sourceToTargetPermissions);
    setTargetToSourcePermissions(partnership.targetToSourcePermissions);
    onClose();
  };

  const handleUpdatePartnership = () => {
    updatePartnershipMutation.mutate({
      sourceToTargetPermissions,
      targetToSourcePermissions
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

  // Check if any changes were made
  const hasChanges = () => {
    const original = partnership.sourceToTargetPermissions;
    const originalTarget = partnership.targetToSourcePermissions;
    
    return (
      JSON.stringify(sourceToTargetPermissions) !== JSON.stringify(original) ||
      JSON.stringify(targetToSourcePermissions) !== JSON.stringify(originalTarget)
    );
  };

  const getPartnerCommunityName = () => {
    const currentCommunityId = user?.cid;
    if (currentCommunityId === partnership.sourceCommunityId) {
      // Current user is from source community, show target community
      return partnership.targetCommunityName || 'Partner Community';
    } else {
      // Current user is from target community, show source community
      return partnership.sourceCommunityName || 'Partner Community';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Partnership Permissions
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage permissions for your partnership with {getPartnerCommunityName()}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Check className="h-4 w-4" />
              <span className="font-medium">Active Partnership</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              Changes to permissions will take effect immediately for both communities.
            </p>
          </div>

          {/* Permissions Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source to Target Permissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>Your Community</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>{getPartnerCommunityName()}</span>
                </CardTitle>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  What you allow this partner to access from your community
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { 
                    key: 'allowCrossCommunityNavigation', 
                    label: '🔗 Cross-community navigation', 
                    desc: 'Users can navigate between communities' 
                  },
                  { 
                    key: 'allowCrossCommunityNotifications', 
                    label: '🔔 Cross-community notifications', 
                    desc: 'Receive notifications from other community' 
                  },
                  { 
                    key: 'allowCrossCommunitySearch', 
                    label: '🔍 Cross-community search', 
                    desc: 'Search content across communities' 
                  },
                  { 
                    key: 'allowPresenceSharing', 
                    label: '👥 Presence sharing', 
                    desc: 'Share user presence information' 
                  },
                  { 
                    key: 'allowBoardSharing', 
                    label: '📋 Board sharing', 
                    desc: 'Allow this community to import your boards' 
                  }
                ].map(permission => (
                  <div key={permission.key} className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{permission.label}</p>
                      <p className="text-xs text-gray-500">{permission.desc}</p>
                    </div>
                    <Checkbox
                      checked={Boolean(sourceToTargetPermissions[permission.key as keyof PartnershipPermissions])}
                      onCheckedChange={(checked: boolean) => 
                        updatePermission('sourceToTarget', permission.key as keyof PartnershipPermissions, checked)
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Target to Source Permissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{getPartnerCommunityName()}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>Your Community</span>
                </CardTitle>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  What this partner allows you to access from their community
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { 
                    key: 'allowCrossCommunityNavigation', 
                    label: '🔗 Cross-community navigation', 
                    desc: 'Users can navigate between communities' 
                  },
                  { 
                    key: 'allowCrossCommunityNotifications', 
                    label: '🔔 Cross-community notifications', 
                    desc: 'Receive notifications from other community' 
                  },
                  { 
                    key: 'allowCrossCommunitySearch', 
                    label: '🔍 Cross-community search', 
                    desc: 'Search content across communities' 
                  },
                  { 
                    key: 'allowPresenceSharing', 
                    label: '👥 Presence sharing', 
                    desc: 'Share user presence information' 
                  },
                  { 
                    key: 'allowBoardSharing', 
                    label: '📋 Board sharing', 
                    desc: 'Allow your community to import their boards' 
                  }
                ].map(permission => (
                  <div key={permission.key} className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{permission.label}</p>
                      <p className="text-xs text-gray-500">{permission.desc}</p>
                    </div>
                    <Checkbox
                      checked={Boolean(targetToSourcePermissions[permission.key as keyof PartnershipPermissions])}
                      onCheckedChange={(checked: boolean) => 
                        updatePermission('targetToSource', permission.key as keyof PartnershipPermissions, checked)
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Board Sharing Notice */}
          {(sourceToTargetPermissions.allowBoardSharing || targetToSourcePermissions.allowBoardSharing) && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                <span>📋</span>
                <span className="font-medium">Board Sharing Enabled</span>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-300 mt-1">
                With board sharing enabled, community members can import boards from partner communities 
                to their sidebar for easy access.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleUpdatePartnership}
              disabled={!hasChanges() || updatePartnershipMutation.isPending}
            >
              {updatePartnershipMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Update Permissions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 