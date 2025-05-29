import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiCommunity } from '@/app/api/communities/[communityId]/route';
import { checkCommunityAccess, getUserRoles, AccessControlUtils } from '@/lib/roleService';
import { CommunityAccessDenied } from './CommunityAccessDenied';
import { useCgLib } from '@/contexts/CgLibContext';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { cn } from '@/lib/utils';

interface CommunityAccessGateProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}

export const CommunityAccessGate: React.FC<CommunityAccessGateProps> = ({ 
  children, 
  theme = 'light' 
}) => {
  const { user, token, isAuthenticated } = useAuth();
  const { cgInstance } = useCgLib();

  // Fetch community info for role names
  const { data: communityInfo } = useQuery<CommunityInfoResponsePayload | null>({
    queryKey: ['communityInfo', cgInstance?.getCommunityInfo !== undefined],
    queryFn: async () => {
      if (!cgInstance) throw new Error('CgInstance not available');
      const response = await cgInstance.getCommunityInfo();
      if (!response?.data) throw new Error('Failed to fetch community info data from CgLib.');
      return response.data;
    },
    enabled: !!cgInstance,
  });

  // Fetch community settings to check access permissions
  const { data: communityData, isLoading, error } = useQuery<ApiCommunity>({
    queryKey: ['communityAccess', user?.cid],
    queryFn: async () => {
      if (!user?.cid || !token) throw new Error('No community ID or token available');
      
      try {
        const response = await authFetchJson<ApiCommunity>(`/api/communities/${user.cid}`, { token });
        return response;
      } catch (error: any) {
        // If we get a 404, the community doesn't exist or user doesn't have basic access
        if (error.message?.includes('404')) {
          throw new Error('Community not found or no access');
        }
        throw error;
      }
    },
    enabled: !!user?.cid && !!token && isAuthenticated,
    retry: 1, // Don't retry too many times for access checks
  });

  // Check if user has community access
  const { data: userAccess, isLoading: isCheckingAccess } = useQuery({
    queryKey: ['userCommunityAccess', user?.userId, communityData?.id],
    queryFn: async () => {
      if (!communityData || !user) return false;
      
      // Admin override - admins always have access
      if (user.isAdmin) {
        AccessControlUtils.logAccessAttempt(
          user.userId, 
          'community', 
          communityData.id, 
          'granted', 
          'admin override'
        );
        return true;
      }

      // Get user roles and check access
      const userRoles = await getUserRoles(user.userId, communityData.id);
      const hasAccess = await checkCommunityAccess(communityData, userRoles, user.isAdmin);
      
      AccessControlUtils.logAccessAttempt(
        user.userId, 
        'community', 
        communityData.id, 
        hasAccess ? 'granted' : 'denied',
        hasAccess ? 'role-based access' : 'insufficient permissions'
      );
      
      return hasAccess;
    },
    enabled: !!communityData && !!user,
  });

  // Get required role names for display
  const requiredRoleNames = React.useMemo(() => {
    if (!communityData?.settings?.permissions?.allowedRoles || !communityInfo?.roles) {
      return [];
    }
    
    const allowedRoleIds = communityData.settings.permissions.allowedRoles;
    return communityInfo.roles
      .filter(role => allowedRoleIds.includes(role.id))
      .filter(role => !role.title.toLowerCase().includes('admin')) // Hide admin roles
      .map(role => role.title);
  }, [communityData?.settings?.permissions?.allowedRoles, communityInfo?.roles]);

  // Loading state
  if (!isAuthenticated || isLoading || isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className={cn(
            "text-sm",
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Checking access permissions...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.error('Community access check failed:', error);
    return (
      <CommunityAccessDenied 
        theme={theme}
        communityName={communityData?.name}
        requiredRoles={requiredRoleNames}
      />
    );
  }

  // Access denied
  if (userAccess === false) {
    return (
      <CommunityAccessDenied 
        theme={theme}
        communityName={communityData?.name}
        requiredRoles={requiredRoleNames}
      />
    );
  }

  // Access granted - show the app
  return <>{children}</>;
}; 