/**
 * AuthCompleteStep - Shows completion message after authentication
 * 
 * This step appears after the user has completed authentication and community selection.
 * It shows a brief completion message before the parent switches the iframe to the forum.
 */

import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Home, User, Building2 } from 'lucide-react';
import { AuthCompleteStepProps } from '@/types/embed';

export const AuthCompleteStep: React.FC<AuthCompleteStepProps> = ({ 
  config, 
  profileData,
  communityId 
}) => {
  // Auto-resize iframe for this step
  useEffect(() => {
    const message = {
      type: 'curia-resize',
      height: 400
    };
    
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }, []);

  return (
    <div className="embed-step">
      <Card className="embed-card embed-card--sm">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            
            {/* Success Icon */}
            <div className="relative">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <Home className="w-3 h-3 text-blue-600" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                🎉 Authentication Complete!
              </h3>
              <p className="text-sm text-muted-foreground">
                Loading your community forum...
              </p>
            </div>

            {/* User & Community Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              {profileData && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">
                      {profileData.name || profileData.address || 'Anonymous User'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profileData.type === 'anonymous' ? 'Anonymous' : 
                       profileData.type === 'ens' ? 'ENS Identity' : 
                       'Universal Profile'}
                    </div>
                  </div>
                </div>
              )}
              
              {communityId && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">
                      {communityId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Community
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Loading Indicator */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin"></div>
              <span className="text-sm">Loading forum...</span>
            </div>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>🔧 Dev Mode:</strong> Parent should switch iframe to forum URL
                </p>
              </div>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 