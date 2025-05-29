import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CommunitySettings } from '@/types/settings';
import { Save, Users, Info, Crown, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommunityRole {
  id: string;
  title: string;
  type?: string;
  permissions?: string[];
}

interface CommunityAccessFormProps {
  currentSettings: CommunitySettings;
  communityRoles: CommunityRole[];
  onSave: (settings: CommunitySettings) => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
}

export const CommunityAccessForm: React.FC<CommunityAccessFormProps> = ({
  currentSettings,
  communityRoles,
  onSave,
  isLoading,
  theme
}) => {
  const [settings, setSettings] = useState<CommunitySettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const isUnrestricted = !settings.permissions?.allowedRoles?.length;

  const handleUnrestrictedChange = (checked: boolean) => {
    if (checked) {
      // Allow all - clear role restrictions
      setSettings(prev => ({
        ...prev,
        permissions: { ...prev.permissions, allowedRoles: [] }
      }));
    } else {
      // Start with admin roles selected by default
      const adminRoles = communityRoles
        .filter(role => role.title.toLowerCase().includes('admin'))
        .map(role => role.id);
      
      setSettings(prev => ({
        ...prev,
        permissions: { ...prev.permissions, allowedRoles: adminRoles }
      }));
    }
    setHasChanges(true);
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    setSettings(prev => {
      const currentRoles = prev.permissions?.allowedRoles || [];
      const newRoles = checked
        ? [...currentRoles, roleId]
        : currentRoles.filter(id => id !== roleId);
      
      return {
        ...prev,
        permissions: { ...prev.permissions, allowedRoles: newRoles }
      };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(settings);
    setHasChanges(false);
  };

  const selectedRoleCount = settings.permissions?.allowedRoles?.length || 0;

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <Card className={cn(
        "border-l-4",
        isUnrestricted
          ? "border-l-green-500 bg-green-50 dark:bg-green-950/20"
          : "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
      )}>
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <div className={cn(
              "p-2 rounded-full",
              isUnrestricted
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-blue-100 dark:bg-blue-900/30"
            )}>
              {isUnrestricted ? (
                <Users size={16} className="text-green-600 dark:text-green-400" />
              ) : (
                <UserCheck size={16} className="text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                "font-medium",
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}>
                {isUnrestricted
                  ? "Plugin Access: Open to All Community Members"
                  : `Plugin Access: Restricted to ${selectedRoleCount} Selected Role${selectedRoleCount !== 1 ? 's' : ''}`
                }
              </p>
              <p className={cn(
                "text-sm mt-1",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                {isUnrestricted
                  ? "All community members can access the forum plugin"
                  : "Only users with selected roles can access the forum plugin"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Control Options */}
      <div className="space-y-4">
        {/* Option 1: Allow All */}
        <div className="flex items-start space-x-3 p-4 rounded-lg border">
          <Checkbox
            id="unrestricted"
            checked={isUnrestricted}
            onCheckedChange={handleUnrestrictedChange}
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor="unrestricted"
              className={cn(
                "text-base font-medium cursor-pointer",
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}
            >
              Allow all community members to access the plugin
            </Label>
            <p className={cn(
              "text-sm mt-1",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              No restrictions - any community member can use the forum
            </p>
          </div>
        </div>

        {/* Option 2: Role-Based Restrictions */}
        <div className="flex items-start space-x-3 p-4 rounded-lg border">
          <Checkbox
            id="restricted"
            checked={!isUnrestricted}
            onCheckedChange={(checked) => handleUnrestrictedChange(!checked)}
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor="restricted"
              className={cn(
                "text-base font-medium cursor-pointer",
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}
            >
              Restrict plugin access to specific roles
            </Label>
            <p className={cn(
              "text-sm mt-1 mb-4",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              Only users with selected roles will be able to access the plugin
            </p>

            {/* Role Selection */}
            {!isUnrestricted && (
              <div className="space-y-3 ml-6 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                <h4 className={cn(
                  "font-medium",
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                )}>
                  Select Roles with Plugin Access:
                </h4>
                
                {communityRoles.length > 0 ? (
                  <div className="space-y-2">
                    {communityRoles.map((role) => {
                      const isSelected = settings.permissions?.allowedRoles?.includes(role.id) || false;
                      const isAdminRole = role.title.toLowerCase().includes('admin');
                      
                      return (
                        <div key={role.id} className="flex items-center space-x-3 p-2 rounded border">
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="p-1 rounded-full bg-primary/10">
                              {isAdminRole ? (
                                <Crown size={12} className="text-primary" />
                              ) : (
                                <UserCheck size={12} className="text-slate-500" />
                              )}
                            </div>
                            <Label
                              htmlFor={`role-${role.id}`}
                              className={cn(
                                "cursor-pointer flex-1",
                                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                              )}
                            >
                              {role.title}
                            </Label>
                            <Badge variant={isAdminRole ? 'default' : 'secondary'} className="text-xs">
                              {isAdminRole ? 'Admin' : 'Member'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={cn(
                    "text-center py-4",
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  )}>
                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No roles available to configure</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className={cn(
        "flex items-start space-x-3 p-4 rounded-lg",
        theme === 'dark' ? 'bg-blue-950/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
      )}>
        <Info size={16} className={cn(
          "mt-0.5",
          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
        )} />
        <div className="text-sm">
          <p className={cn(
            "font-medium mb-1",
            theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
          )}>
            How Plugin Access Control Works
          </p>
          <ul className={cn(
            "space-y-1 text-xs",
            theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
          )}>
            <li>• Community admins always have full access regardless of settings</li>
            <li>• Access restrictions apply to the entire forum plugin</li>
            <li>• Users without access will see an access denied message</li>
            <li>• Changes take effect immediately for all users</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          className="min-w-32"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}; 