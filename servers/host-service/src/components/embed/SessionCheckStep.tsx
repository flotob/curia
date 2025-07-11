/**
 * SessionCheckStep - Validates existing authentication sessions
 */

import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { SessionCheckStepProps } from '@/types/embed';

export const SessionCheckStep: React.FC<SessionCheckStepProps> = ({ 
  onSessionResult 
}) => {
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionToken = localStorage.getItem('curia_session_token');
        
        if (!sessionToken) {
          onSessionResult(false);
          return;
        }

        const response = await fetch('/api/auth/validate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.isValid && data.user) {
            localStorage.setItem('curia_session_token', data.token);
            // Pass both session validity AND user data
            onSessionResult(true, data.user);
            return;
          }
        }
        
        localStorage.removeItem('curia_session_token');
        onSessionResult(false);
      } catch (error) {
        console.error('[Session Check] Error:', error);
        onSessionResult(false);
      }
    };

    const timer = setTimeout(checkSession, 500);
    return () => clearTimeout(timer);
  }, [onSessionResult]);

  return (
    <div className="embed-step">
      <Card className="embed-card embed-card--sm">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="relative">
              <Shield className="w-16 h-16 mx-auto text-blue-600 animate-pulse" />
              <div className="pulse-ring w-16 h-16 mx-auto border-blue-300"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Checking Authentication</h3>
              <p className="text-sm text-muted-foreground">Verifying your session...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 