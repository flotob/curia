/**
 * AuthenticationStep - Wallet and authentication selection
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Globe, Zap, User, ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthenticationStepProps, AuthOption } from '@/types/embed';
import { createMockProfileData, createAnonymousProfileData } from '@/lib/embed/mockData';

export const AuthenticationStep: React.FC<AuthenticationStepProps> = ({ 
  onAuthenticated, 
  config 
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);

  const handleAuth = useCallback(async (type: string) => {
    setIsAuthenticating(type);
    
    try {
      if (type === 'anonymous') {
        const response = await fetch('/api/auth/create-anonymous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: window.location.origin })
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('curia_session_token', data.token);
          
          // For anonymous, skip profile preview and go to community
          setTimeout(() => {
            onAuthenticated(createAnonymousProfileData(data.user.name));
          }, 1000);
        } else {
          throw new Error('Anonymous authentication failed');
        }
      } else {
        // TODO: For ENS/UP, we'll show profile preview after connection
        console.log(`[Embed] ${type} authentication - will show profile preview`);
        
        // Simulate wallet connection and profile data
        setTimeout(() => {
          const mockProfileData = createMockProfileData(type as 'ens' | 'universal_profile');
          onAuthenticated(mockProfileData);
        }, 2000);
      }
    } catch (error) {
      console.error(`[Embed] ${type} authentication error:`, error);
      setIsAuthenticating(null);
    }
  }, [onAuthenticated]);

  const authOptions: AuthOption[] = [
    {
      id: 'ens',
      title: 'ENS Domain',
      description: 'Connect with your Ethereum Name Service domain',
      icon: <Globe className="w-6 h-6" />,
      gradientClass: 'gradient-blue-cyan',
      buttonClass: 'btn-gradient-blue-cyan',
      action: () => handleAuth('ens')
    },
    {
      id: 'universal_profile',
      title: 'Universal Profile',
      description: 'Connect with your LUKSO Universal Profile',
      icon: <Zap className="w-6 h-6" />,
      gradientClass: 'gradient-emerald-teal',
      buttonClass: 'btn-gradient-emerald-teal',
      action: () => handleAuth('universal_profile')
    },
    {
      id: 'anonymous',
      title: 'Continue as Guest',
      description: 'Browse without connecting a wallet',
      icon: <User className="w-6 h-6" />,
      gradientClass: 'gradient-gray-slate',
      buttonClass: 'btn-gradient-gray-slate',
      action: () => handleAuth('anonymous')
    }
  ];

  return (
    <div className="embed-step">
      <Card className="embed-card embed-card--md">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="embed-header-icon gradient-blue-purple">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl embed-gradient-text">
            Welcome to Curia
          </CardTitle>
          <CardDescription className="text-base">
            Choose your preferred way to join the conversation
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6 pb-8">
          {authOptions.map((option) => (
            <Card key={option.id} className="auth-option-card">
              <CardContent className="p-5">
                <div className="flex items-center space-x-4">
                  <div className={cn("auth-option-icon", option.gradientClass)}>
                    {option.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-lg">
                      {option.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>

                  <Button
                    onClick={option.action}
                    disabled={!!isAuthenticating}
                    className={cn(
                      "auth-option-button",
                      option.buttonClass,
                      isAuthenticating === option.id && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isAuthenticating === option.id ? (
                      <div className="loading-spinner border-white" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="text-center mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Lock className="w-3 h-3" />
              Powered by Curia • Secure & Private
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 