import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Gift, Wallet, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useUniversalProfile, UniversalProfileProvider } from '@/contexts/UniversalProfileContext';
import { TipAssetSelector } from './TipAssetSelector';
import { getUPSocialProfile, UPSocialProfile } from '@/lib/upProfile';

interface TippingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUserId: string;
  recipientUsername: string;
  recipientName?: string;
  recipientAvatar?: string;
  recipientUpAddress: string;
}

// Internal component that uses UP context (must be inside UniversalProfileProvider)
const TippingModalContent: React.FC<{
  recipientUsername: string;
  recipientName?: string;
  recipientAvatar?: string;
  recipientUpAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({
  recipientUsername,
  recipientName,
  recipientAvatar,
  recipientUpAddress,
  open,
  onOpenChange,
}) => {
  // UP Connection State
  const {
    isConnected,
    upAddress,
    isConnecting,
    connectionError,
    isCorrectChain,
    connect,
    switchToLukso,
    chooseAccount,
  } = useUniversalProfile();

  // Local state for tipping flow
  const [currentStep, setCurrentStep] = useState<'connect' | 'tip_interface' | 'sending' | 'success'>('connect');
  
  // Sender profile state
  const [senderProfile, setSenderProfile] = useState<UPSocialProfile | null>(null);
  const [isLoadingSenderProfile, setIsLoadingSenderProfile] = useState(false);

  // Reset to connection step when modal opens if not connected
  useEffect(() => {
    if (open) {
      if (isConnected && isCorrectChain) {
        setCurrentStep('tip_interface');
      } else {
        setCurrentStep('connect');
      }
    }
  }, [open, isConnected, isCorrectChain]);

  // Load sender profile when UP address changes
  useEffect(() => {
    if (upAddress && isConnected) {
      const loadSenderProfile = async () => {
        setIsLoadingSenderProfile(true);
        try {
          console.log('[TippingModal] Loading sender profile for:', upAddress);
          const profile = await getUPSocialProfile(upAddress);
          setSenderProfile(profile);
        } catch (error) {
          console.error('[TippingModal] Failed to load sender profile:', error);
          // Create fallback profile
          setSenderProfile({
            address: upAddress,
            displayName: `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`,
            username: `@${upAddress.slice(2, 6)}${upAddress.slice(-4)}.lukso`,
            isVerified: false,
            lastFetched: new Date()
          });
        } finally {
          setIsLoadingSenderProfile(false);
        }
      };

      loadSenderProfile();
    } else {
      setSenderProfile(null);
    }
  }, [upAddress, isConnected]);

  // Handle UP connection
  const handleConnect = async () => {
    try {
      // Connect UP directly (we're already inside UniversalProfileProvider)
      await connect();
    } catch (error) {
      console.error('Failed to connect Universal Profile:', error);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchToLukso();
    } catch (error) {
      console.error('Failed to switch to LUKSO network:', error);
    }
  };

  const renderConnectionStep = () => (
    <div className="space-y-6">
      {/* Recipient Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={recipientAvatar} alt={recipientName || recipientUsername} />
              <AvatarFallback>
                {(recipientName || recipientUsername).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">{recipientName || recipientUsername}</h3>
              <p className="text-sm text-muted-foreground">@{recipientUsername}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {recipientUpAddress.slice(0, 6)}...{recipientUpAddress.slice(-4)}
              </Badge>
            </div>
            <Gift className="h-8 w-8 text-pink-500" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Connection Status */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Connect Your Universal Profile</h3>
          <p className="text-muted-foreground text-sm">
            You need to connect your Universal Profile to send tips
          </p>
        </div>

        {/* Connection Error */}
        {connectionError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{connectionError}</p>
          </div>
        )}

        {/* Wrong Network Warning */}
        {isConnected && !isCorrectChain && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Please switch to LUKSO network to continue
              </p>
            </div>
            <Button
              onClick={handleSwitchNetwork}
              className="w-full"
              variant="outline"
            >
              Switch to LUKSO Network
            </Button>
          </div>
        )}

        {/* Connection Button */}
        {!isConnected && (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Universal Profile
              </>
            )}
          </Button>
        )}

        {/* Success State */}
        {isConnected && isCorrectChain && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Connected: {upAddress?.slice(0, 6)}...{upAddress?.slice(-4)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTipInterface = () => (
    <div className="space-y-6">
      {/* Recipient Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={recipientAvatar} alt={recipientName || recipientUsername} />
              <AvatarFallback>
                {(recipientName || recipientUsername).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">{recipientName || recipientUsername}</h3>
              <p className="text-sm text-muted-foreground">@{recipientUsername}</p>
            </div>
            <Gift className="h-8 w-8 text-pink-500" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Sender Account Info & Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            {isLoadingSenderProfile ? (
              <>
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </>
            ) : senderProfile ? (
              <>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={senderProfile.profileImage} alt={senderProfile.displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-medium">
                    {senderProfile.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-sm truncate">{senderProfile.displayName}</h3>
                    {senderProfile.isVerified && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{senderProfile.username}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    Sending from
                  </Badge>
                </div>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-medium">
                  {upAddress ? upAddress.charAt(2).toUpperCase() : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Universal Profile</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {upAddress?.slice(0, 8)}...{upAddress?.slice(-6)}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    Sending from
                  </Badge>
                </div>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={chooseAccount}
              className="text-xs"
            >
              Choose Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Asset Selection */}
      <TipAssetSelector 
        upAddress={upAddress!}
        recipientAddress={recipientUpAddress}
        onTipSent={() => {
          // TODO: Handle success
          console.log('Tip sent successfully!');
        }}
        onClose={() => onOpenChange(false)}
      />
    </div>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <Gift className="h-5 w-5 text-pink-500" />
          <span>Send Tip</span>
        </DialogTitle>
      </DialogHeader>

      <div className="py-4">
        {currentStep === 'connect' && renderConnectionStep()}
        {currentStep === 'tip_interface' && renderTipInterface()}
      </div>
    </>
  );
};

// Main component wrapper that provides UP context
export const TippingModal: React.FC<TippingModalProps> = ({
  open,
  onOpenChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recipientUserId: _recipientUserId, // Reserved for Sprint 3 - transaction tracking
  recipientUsername,
  recipientName,
  recipientAvatar,
  recipientUpAddress,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <UniversalProfileProvider>
          <TippingModalContent
            recipientUsername={recipientUsername}
            recipientName={recipientName}
            recipientAvatar={recipientAvatar}
            recipientUpAddress={recipientUpAddress}
            open={open}
            onOpenChange={onOpenChange}
          />
        </UniversalProfileProvider>
      </DialogContent>
    </Dialog>
  );
}; 