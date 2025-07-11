/**
 * ForumStep - Loads the actual Curia forum via ClientPluginHost
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Settings, CheckCircle2 } from 'lucide-react';
import { ForumStepProps } from '@/types/embed';

export const ForumStep: React.FC<ForumStepProps> = ({ config }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePlugin = async () => {
      try {
        console.log('[Forum] Initializing ClientPluginHost...');
        
        // Mock successful initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsInitialized(true);
        console.log('[Forum] ClientPluginHost initialized successfully');
      } catch (error) {
        console.error('[Forum] Error initializing ClientPluginHost:', error);
        setError('Failed to load forum. Please try refreshing the page.');
      }
    };

    initializePlugin();
  }, []);

  if (error) {
    return (
      <div className="embed-step">
        <Card className="embed-card embed-card--sm">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <Settings className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Loading Error</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="embed-step">
        <Card className="embed-card embed-card--sm">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 mx-auto border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                <Home className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Loading Forum</h3>
                <p className="text-sm text-muted-foreground">Preparing your community experience...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="forum-container">
      {/* TODO: Integrate real ClientPluginHost here */}
      <Card className="embed-card embed-card--lg">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">🎉 Welcome to the Forum!</h3>
              <p className="text-base text-muted-foreground">
                Authentication complete. The Curia forum will load here.
              </p>
              <p className="text-sm text-muted-foreground">
                Theme: <span className="font-mono">{config.theme}</span>
                {config.community && <> • Community: <span className="font-mono">{config.community}</span></>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 