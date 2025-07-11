/**
 * AuthenticationStep - Wallet and authentication selection
 * 
 * Beautiful custom UI cards that trigger the CORRECT wallet ecosystem:
 * - ENS: EthereumProfileProvider + RainbowKit + window.ethereum
 * - UP: UniversalProfileProvider + window.lukso + ethers.js
 * - Anonymous: Direct backend integration
 */

import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Globe, Zap, User, ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthenticationStepProps, AuthOption } from '@/types/embed';
import { UniversalProfileProvider, useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { EthereumProfileProvider, useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Separate component for Universal Profile connection
const UniversalProfileConnection: React.FC<{ onSuccess: (data: any) => void }> = ({ onSuccess }) => {
  const { upAddress, isConnecting, connect } = useUniversalProfile();
  
  React.useEffect(() => {
    if (upAddress) {
      // UP connection successful - map to embed format with basic info
      // Profile details will be fetched in the ProfilePreviewStep
      onSuccess({
        type: 'universal_profile',
        address: upAddress,
        name: 'Universal Profile User', // Will be enhanced in preview step
        avatar: null, // Will be enhanced in preview step
        balance: undefined, // Will be fetched by context
        followerCount: undefined, // Will be fetched by context
        verificationLevel: 'verified' as const
      });
    }
  }, [upAddress, onSuccess]);

  React.useEffect(() => {
    // Auto-trigger UP connection when component mounts
    if (!upAddress && !isConnecting) {
      connect().catch(console.error);
    }
  }, [upAddress, isConnecting, connect]);

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
      <p className="text-muted-foreground">
        {isConnecting ? 'Connecting to Universal Profile...' : 'Opening Universal Profile extension...'}
      </p>
    </div>
  );
};

// Separate component for Ethereum/ENS connection
const EthereumConnection: React.FC<{ onSuccess: (data: any) => void }> = ({ onSuccess }) => {
  const { isConnected, ethAddress, getENSProfile } = useEthereumProfile();
  const [ensData, setEnsData] = React.useState<{ name?: string; avatar?: string }>({});
  
  // Fetch ENS data when connected
  React.useEffect(() => {
    if (isConnected && ethAddress) {
      getENSProfile().then(setEnsData).catch(console.error);
    }
  }, [isConnected, ethAddress, getENSProfile]);
  
  React.useEffect(() => {
    if (isConnected && ethAddress) {
      // Ethereum connection successful - map to embed format
      onSuccess({
        type: 'ens',
        address: ethAddress,
        name: ensData.name || 'Ethereum User',
        avatar: ensData.avatar || null,
        domain: ensData.name,
        balance: undefined, // Will be fetched by context
        verificationLevel: ensData.name ? 'verified' as const : 'partial' as const
      });
    }
  }, [isConnected, ethAddress, ensData, onSuccess]);

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <p className="text-muted-foreground mb-4">
            Connect your Ethereum wallet to continue
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <p className="text-muted-foreground">Processing Ethereum connection...</p>
    </div>
  );
};

export const AuthenticationStep: React.FC<AuthenticationStepProps> = ({ 
  onAuthenticated, 
  config 
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<'ens' | 'universal_profile' | null>(null);

  const handleConnectionSuccess = useCallback((profileData: any) => {
    console.log('[AuthenticationStep] Connection successful:', profileData);
    setIsAuthenticating(null);
    setConnectionType(null);
    onAuthenticated(profileData);
  }, [onAuthenticated]);

  const handleAuth = useCallback(async (type: string) => {
    setIsAuthenticating(type);
    
    if (type === 'anonymous') {
      // Handle anonymous auth directly with our backend
      try {
        const response = await fetch('/api/auth/create-anonymous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: window.location.origin })
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('curia_session_token', data.token);
          
          setTimeout(() => {
            handleConnectionSuccess({
              type: 'anonymous',
              name: data.user.name,
              verificationLevel: 'unverified' as const
            });
          }, 1000);
        } else {
          throw new Error('Anonymous authentication failed');
        }
      } catch (error) {
        console.error(`[Embed] Anonymous authentication error:`, error);
        setIsAuthenticating(null);
      }
    } else {
      // For wallet connections, set the connection type to show the right provider
      setConnectionType(type as 'ens' | 'universal_profile');
    }
  }, [handleConnectionSuccess]);

  const handleBack = useCallback(() => {
    setIsAuthenticating(null);
    setConnectionType(null);
  }, []);

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

  // Show connection flow for specific wallet type
  if (connectionType === 'universal_profile') {
    return (
      <div className="embed-step">
        <Card className="embed-card embed-card--md">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl">Universal Profile Connection</CardTitle>
            <Button variant="outline" size="sm" onClick={handleBack} className="mt-2">
              ← Back to Options
            </Button>
          </CardHeader>
          <CardContent>
            <UniversalProfileProvider>
              <UniversalProfileConnection onSuccess={handleConnectionSuccess} />
            </UniversalProfileProvider>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionType === 'ens') {
    return (
      <div className="embed-step">
        <Card className="embed-card embed-card--md">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl">Ethereum Wallet Connection</CardTitle>
            <Button variant="outline" size="sm" onClick={handleBack} className="mt-2">
              ← Back to Options
            </Button>
          </CardHeader>
          <CardContent>
            <EthereumProfileProvider storageKey="embed_ethereum">
              <EthereumConnection onSuccess={handleConnectionSuccess} />
            </EthereumProfileProvider>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show beautiful wallet selection cards
  return (
    <div className="embed-step">
      <Card className="embed-card embed-card--lg">
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
          {/* Beautiful Custom Cards */}
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