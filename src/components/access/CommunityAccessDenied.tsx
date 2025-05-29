import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ArrowLeft, Shield, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CommunityAccessDeniedProps {
  theme?: 'light' | 'dark';
  communityName?: string;
  requiredRoles?: string[];
}

export const CommunityAccessDenied: React.FC<CommunityAccessDeniedProps> = ({ 
  theme = 'light',
  communityName,
  requiredRoles = []
}) => {
  const { user } = useAuth();
  
  const hasSpecificRoles = requiredRoles.length > 0;
  
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-red-50 dark:bg-red-950/20">
            <Lock size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-semibold">Community Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-3">
            <p className={cn(
              "text-sm",
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            )}>
              {communityName 
                ? `Access to the ${communityName} forum plugin is restricted to specific community roles.`
                : "Access to this community's forum plugin is restricted to specific community roles."
              }
            </p>
            
            {hasSpecificRoles && (
              <div className={cn(
                "p-3 rounded-lg border",
                theme === 'dark' ? 'bg-amber-950/20 border-amber-800' : 'bg-amber-50 border-amber-200'
              )}>
                <p className={cn(
                  "font-medium text-sm mb-2",
                  theme === 'dark' ? 'text-amber-200' : 'text-amber-800'
                )}>
                  Required Roles for Access:
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {requiredRoles.map((roleName, index) => (
                    <span
                      key={index}
                      className={cn(
                        "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                        theme === 'dark' 
                          ? 'bg-amber-900/30 text-amber-300 border border-amber-700' 
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      )}
                    >
                      {roleName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={cn(
            "p-4 rounded-lg border-l-4 border-l-blue-500",
            theme === 'dark' ? 'bg-blue-950/20' : 'bg-blue-50'
          )}>
            <div className="flex items-start space-x-3">
              <Info size={16} className={cn(
                "mt-0.5",
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              )} />
              <div className="text-left">
                <p className={cn(
                  "font-medium text-sm",
                  theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
                )}>
                  Your Current Status:
                </p>
                <div className={cn(
                  "text-xs mt-1 space-y-1",
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                )}>
                  <p>• Community Member: Yes</p>
                  <p>• Plugin Access: Denied</p>
                  <p>• Required: {hasSpecificRoles ? `One of the roles above` : 'Specific community role'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className={cn(
              "text-xs",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              {hasSpecificRoles 
                ? "Please contact a community administrator to request one of the required roles listed above."
                : "Please contact a community administrator if you believe you should have access to this plugin."
              }
            </p>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="w-full"
              >
                <ArrowLeft size={16} className="mr-2" />
                Refresh Page
              </Button>
              
              <Button 
                onClick={() => window.close()} 
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                Close Plugin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 