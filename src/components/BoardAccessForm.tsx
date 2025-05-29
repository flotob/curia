import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BoardSettings, CommunitySettings } from '@/types/settings';
import { Save, Users, Info, Crown, UserCheck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommunityRole {
  id: string;
  title: string;
  type?: string;
  permissions?: string[];
}

interface BoardAccessFormProps {
  currentSettings: BoardSettings;
  communitySettings: CommunitySettings;
  communityRoles: CommunityRole[];
  onSave: (settings: BoardSettings) => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  showSaveButton?: boolean;
  autoSave?: boolean;
}

export const BoardAccessForm: React.FC<BoardAccessFormProps> = ({
  currentSettings,
  communitySettings,
  communityRoles,
  onSave,
  isLoading,
  theme,
  showSaveButton = true,
  autoSave = false
}) => {
  const [settings, setSettings] = useState<BoardSettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const isUnrestricted = !settings.permissions?.allowedRoles?.length;

  // Auto-save when settings change in create mode
  React.useEffect(() => {
    if (autoSave && hasChanges) {
      onSave(settings);
    }
  }, [settings, hasChanges, autoSave, onSave]);

  // Available roles are limited by community-level restrictions
  const availableRoles = useMemo(() => {
    if (!communityRoles) return [];
    
    const communityAllowedRoles = communitySettings?.permissions?.allowedRoles;
    if (!communityAllowedRoles || communityAllowedRoles.length === 0) {
      // Community allows all roles, but filter out admin roles for board selection
      return communityRoles.filter(role => !role.title.toLowerCase().includes('admin'));
    }
    
    // Only show non-admin roles that are allowed at community level
    return communityRoles.filter(role => 
      communityAllowedRoles.includes(role.id) && 
      !role.title.toLowerCase().includes('admin')
    );
  }, [communityRoles, communitySettings]);

  const hasCommunityRestrictions = !!(communitySettings?.permissions?.allowedRoles?.length);

  const handleUnrestrictedChange = (checked: boolean) => {
    if (checked) {
      // Allow all - clear role restrictions
      setSettings(prev => ({
        ...prev,
        permissions: { ...prev.permissions, allowedRoles: [] }
      }));
    } else {
      // Start with available roles selected by default
      const defaultRoles = availableRoles.map(role => role.id);
      
      setSettings(prev => ({
        ...prev,
        permissions: { ...prev.permissions, allowedRoles: defaultRoles }
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
                <Lock size={16} className="text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                "font-medium",
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}>
                {isUnrestricted
                  ? "Board Access: Open to All Community Members"
                  : `Board Access: Restricted to ${selectedRoleCount} Selected Role${selectedRoleCount !== 1 ? 's' : ''}`
                }
              </p>
              <p className={cn(
                "text-sm mt-1",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                {isUnrestricted
                  ? "All users with community access can view this board"
                  : "Only users with selected roles can view this board"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Restriction Notice */}
      {hasCommunityRestrictions && (
        <div className={cn(
          "p-4 rounded-lg border-l-4 border-l-amber-500",
          theme === 'dark' ? 'bg-amber-950/20' : 'bg-amber-50'
        )}>
          <div className="flex items-start space-x-3">
            <Info size={16} className={cn(
              "mt-0.5",
              theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
            )} />
            <div className="text-sm">
              <p className={cn(
                "font-medium mb-1",
                theme === 'dark' ? 'text-amber-200' : 'text-amber-800'
              )}>
                Community Access Restriction Active
              </p>
              <p className={cn(
                theme === 'dark' ? 'text-amber-300' : 'text-amber-700'
              )}>
                This community restricts plugin access to specific roles. Board permissions can only further restrict access within those roles.
              </p>
            </div>
          </div>
        </div>
      )}

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
              Allow all users with community access
            </Label>
            <p className={cn(
              "text-sm mt-1",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              No additional restrictions - any user who can access the plugin can view this board
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
              Restrict board access to specific roles
            </Label>
            <p className={cn(
              "text-sm mt-1 mb-4",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              Only users with selected roles will be able to view this board
            </p>

            {/* Role Selection */}
            {!isUnrestricted && (
              <div className="space-y-3 ml-6 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                <h4 className={cn(
                  "font-medium",
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                )}>
                  Select Roles with Board Access:
                </h4>
                
                {availableRoles.length > 0 ? (
                  <div className="space-y-2">
                    {availableRoles.map((role) => {
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
                    <p className="text-sm">
                      {hasCommunityRestrictions 
                        ? "No additional role restrictions available due to community settings"
                        : "No roles available to configure"
                      }
                    </p>
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
            How Board Access Control Works
          </p>
          <ul className={cn(
            "space-y-1 text-xs",
            theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
          )}>
            <li>• Community admins always have full access to all boards</li>
            <li>• Community access is checked first, then board access</li>
            <li>• Users without board access won't see the board in lists</li>
            <li>• Changes take effect immediately for all users</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      {showSaveButton && (
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
      )}
    </div>
  );
}; 