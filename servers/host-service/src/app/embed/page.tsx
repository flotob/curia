/**
 * Embed Page - Progressive Authentication Experience
 * 
 * This is what loads inside the iframe on customer sites.
 * Progressive stages: Session Check → Authentication → Community Selection → Forum Content
 * Uses proper theme system and loads real Curia forum via ClientPluginHost.
 */

'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ThemeProvider, ThemeToggle, useTheme } from '@/contexts/ThemeContext';
import { ClientPluginHost } from '@/lib/ClientPluginHost';
import { 
  Wallet, 
  Shield, 
  CheckCircle2, 
  Users, 
  Sparkles,
  ArrowRight,
  User,
  Globe,
  Zap,
  Lock,
  Home,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== TYPES =====

interface EmbedConfig {
  community?: string;
  theme: 'light' | 'dark';
}

type EmbedStep = 'loading' | 'session-check' | 'authentication' | 'community-selection' | 'forum';

interface AuthOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradientClass: string;
  buttonClass: string;
  action: () => void;
}

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPublic: boolean;
  gradientClass: string;
  icon: string;
}

// ===== IFRAME COMMUNICATION =====

const useIframeResize = () => {
  const sendHeightToParent = useCallback((height?: number) => {
    if (typeof window === 'undefined') return;
    
    const actualHeight = height || Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );

    try {
      window.parent.postMessage({
        type: 'curia-resize',
        height: actualHeight
      }, '*');
    } catch (error) {
      console.warn('[Curia Embed] Could not send height to parent:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => sendHeightToParent(), 100);
    
    const resizeObserver = new ResizeObserver(() => {
      sendHeightToParent();
    });

    if (document.body) {
      resizeObserver.observe(document.body);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [sendHeightToParent]);

  return sendHeightToParent;
};

// ===== STEP COMPONENTS =====

const LoadingStep: React.FC = () => (
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

const SessionCheckStep: React.FC<{ onSessionResult: (hasSession: boolean) => void }> = ({ 
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
          if (data.isValid) {
            localStorage.setItem('curia_session_token', data.token);
            onSessionResult(true);
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

const AuthenticationStep: React.FC<{ 
  onAuthenticated: () => void; 
  config: EmbedConfig 
}> = ({ onAuthenticated, config }) => {
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);

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
          localStorage.setItem('curia_session_token', data.session.session_token);
          setTimeout(onAuthenticated, 1000);
        } else {
          throw new Error('Anonymous authentication failed');
        }
      } else {
        // TODO: Implement wallet authentication
        console.log(`[Embed] ${type} authentication not yet implemented`);
        setTimeout(onAuthenticated, 2000);
      }
    } catch (error) {
      console.error(`[Embed] ${type} authentication error:`, error);
      setIsAuthenticating(null);
    }
  }, [onAuthenticated]);

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

const CommunitySelectionStep: React.FC<{ 
  onCommunitySelected: () => void; 
  config: EmbedConfig 
}> = ({ onCommunitySelected, config }) => {
  const communities: Community[] = [
    {
      id: 'demo',
      name: 'Demo Community',
      description: 'A welcoming space for testing and exploration',
      memberCount: 42,
      isPublic: true,
      gradientClass: 'gradient-blue-indigo',
      icon: '🚀'
    },
    {
      id: 'test',
      name: 'Test Forum',
      description: 'Community-driven discussions and feedback',
      memberCount: 128,
      isPublic: true,
      gradientClass: 'gradient-green-emerald',
      icon: '🧪'
    }
  ];

  return (
    <div className="embed-step">
      <Card className="embed-card embed-card--lg">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="embed-header-icon gradient-green-blue">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl embed-gradient-text">
            Choose Your Community
          </CardTitle>
          <CardDescription className="text-base">
            Join an existing community or create your own space
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6 pb-8">
          <div className="grid gap-4">
            {communities.map((community) => (
              <Card 
                key={community.id} 
                className="community-card"
                onClick={onCommunitySelected}
              >
                <CardContent className="p-5">
                  <div className="flex items-center space-x-4">
                    <div className={cn("community-icon", community.gradientClass)}>
                      {community.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground text-lg">
                          {community.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {community.memberCount} members
                        </Badge>
                        {community.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            Public
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {community.description}
                      </p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="create-community-card">
              <CardContent className="p-6">
                <div className="text-center space-y-3">
                  <div className="embed-header-icon gradient-purple-pink inline-flex">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      Create New Community
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Start your own discussion space
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ForumStep: React.FC<{ config: EmbedConfig }> = ({ config }) => {
  const [progress, setProgress] = useState(0);
  const [pluginStatus, setPluginStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const pluginContainerRef = useRef<HTMLDivElement>(null);
  const pluginHostRef = useRef<ClientPluginHost | null>(null);

  useEffect(() => {
    // Initialize progress animation
    const progressTimer = setInterval(() => {
      setProgress(prev => (prev >= 90 ? 90 : prev + 10));
    }, 200);

    // Initialize plugin host and load real forum
    const initializePlugin = async () => {
      if (!pluginContainerRef.current) return;

      try {
        // Initialize ClientPluginHost
        pluginHostRef.current = new ClientPluginHost(process.env.NEXT_PUBLIC_HOST_SERVICE_URL);
        
        // Set up event listeners
        pluginHostRef.current.on('plugin-loaded', () => {
          setProgress(100);
          setTimeout(() => {
            setPluginStatus('connected');
          }, 500);
        });
        
        pluginHostRef.current.on('plugin-error', (data) => {
          console.error('[ForumStep] Plugin error:', data.error);
          setPluginStatus('error');
        });

        // Load the real Curia forum in standalone mode
        const forumUrl = process.env.NEXT_PUBLIC_FORUM_URL || 'http://localhost:3000';
        const pluginUrl = `${forumUrl}?mod=standalone&iframeContext=embed`;
        
        await pluginHostRef.current.loadPlugin({
          url: pluginUrl,
          height: '800px',
          allowedOrigins: ['*']
        }, pluginContainerRef.current);

      } catch (error) {
        console.error('[ForumStep] Failed to load plugin:', error);
        setPluginStatus('error');
      }
    };

    // Start plugin loading after a brief delay
    const loadTimer = setTimeout(initializePlugin, 1500);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(loadTimer);
      if (pluginHostRef.current) {
        pluginHostRef.current.unloadPlugin();
      }
    };
  }, [config]);

  if (pluginStatus === 'error') {
    return (
      <div className="embed-step">
        <Card className="embed-card embed-card--md">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  Forum Loading Failed
                </h2>
                <p className="text-muted-foreground">
                  Could not connect to the forum service. Please try again later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pluginStatus === 'loading') {
    return (
      <div className="embed-step">
        <Card className="embed-card embed-card--md">
          <CardContent className="p-8">
            <div className="text-center space-y-8">
              <div className="relative">
                <div className="embed-header-icon gradient-green-blue mx-auto w-fit">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="success-ring"></div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-2xl embed-gradient-text">
                  🎉 Welcome to {config.community || 'Your Community'}!
                </h2>
                
                <p className="text-muted-foreground">
                  Loading your forum experience...
                </p>

                <div className="progress-container">
                  <div className="progress-info">
                    <span>Setting up forum</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="space-y-3">
                  <Home className="w-8 h-8 mx-auto text-blue-600" />
                  <div>
                    <div className="font-medium text-foreground">Ready for Integration</div>
                    <div className="text-sm text-muted-foreground">
                      Loading the full Curia forum experience
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Plugin loaded successfully - show the forum
  return (
    <div className="embed-container">
      <div className="plugin-container">
        <div className="plugin-header">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Home className="w-4 h-4" />
              {config.community || 'Community Forum'}
            </h3>
            <div className="flex items-center gap-2">
              <div className="status-indicator status-indicator--connected">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Connected
              </div>
              <ThemeToggle className="text-xs" />
            </div>
          </div>
        </div>
        <div 
          ref={pluginContainerRef}
          className="plugin-content"
        >
          {/* Iframe will be inserted here by ClientPluginHost */}
        </div>
      </div>
    </div>
  );
};

// ===== EMBED CONTENT COMPONENT =====

const EmbedContent: React.FC = () => {
  const searchParams = useSearchParams();
  const sendHeightToParent = useIframeResize();
  const { resolvedTheme } = useTheme();
  
  const [config, setConfig] = useState<EmbedConfig>({
    community: searchParams.get('community') || undefined,
    theme: (searchParams.get('theme') as 'light' | 'dark') || 'light'
  });
  
  const [currentStep, setCurrentStep] = useState<EmbedStep>('loading');

  // Initialize
  useEffect(() => {
    console.log('[Curia Embed] Initializing with config:', config);
    
    setTimeout(() => {
      setCurrentStep('session-check');
      sendHeightToParent();
    }, 1000);
  }, [config, sendHeightToParent]);

  // Handle session check result
  const handleSessionResult = useCallback((hasSession: boolean) => {
    console.log('[Curia Embed] Session check result:', hasSession);
    
    if (hasSession) {
      if (config.community) {
        setCurrentStep('forum');
      } else {
        setCurrentStep('community-selection');
      }
    } else {
      setCurrentStep('authentication');
    }
    
    setTimeout(() => sendHeightToParent(), 100);
  }, [config.community, sendHeightToParent]);

  // Handle authentication completion
  const handleAuthenticated = useCallback(() => {
    console.log('[Curia Embed] Authentication completed');
    
    if (config.community) {
      setCurrentStep('forum');
    } else {
      setCurrentStep('community-selection');
    }
    
    setTimeout(() => sendHeightToParent(), 100);
  }, [config.community, sendHeightToParent]);

  // Handle community selection completion
  const handleCommunitySelected = useCallback(() => {
    console.log('[Curia Embed] Community selected');
    setCurrentStep('forum');
    
    setTimeout(() => sendHeightToParent(), 100);
  }, [sendHeightToParent]);

  return (
    <div className="embed-container">
      {currentStep === 'loading' && <LoadingStep />}
      
      {currentStep === 'session-check' && (
        <SessionCheckStep onSessionResult={handleSessionResult} />
      )}
      
      {currentStep === 'authentication' && (
        <AuthenticationStep 
          onAuthenticated={handleAuthenticated}
          config={config}
        />
      )}
      
      {currentStep === 'community-selection' && (
        <CommunitySelectionStep 
          onCommunitySelected={handleCommunitySelected}
          config={config}
        />
      )}
      
      {currentStep === 'forum' && (
        <ForumStep config={config} />
      )}
    </div>
  );
};

// ===== MAIN COMPONENT WITH THEME PROVIDER =====

export default function EmbedPage() {
  return (
    <ThemeProvider defaultTheme="system" enableSystem>
      <Suspense fallback={
        <div className="embed-step">
          <div className="text-center space-y-4">
            <div className="loading-spinner mx-auto border-blue-600" />
            <div className="text-muted-foreground">Loading Curia...</div>
          </div>
        </div>
      }>
        <EmbedContent />
      </Suspense>
    </ThemeProvider>
  );
} 