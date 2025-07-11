/**
 * LoadingStep - Initial loading state for embed
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export const LoadingStep: React.FC = () => (
  <div className="embed-step">
    <Card className="embed-card embed-card--sm">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Initializing Curia</h3>
            <p className="text-sm text-muted-foreground">Setting up your forum experience...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
); 