/**
 * ProfilePreviewStep - The "moment of delight" profile preview
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Star, UserCheck, RefreshCw, ArrowRight } from 'lucide-react';
import { ProfilePreviewStepProps } from '@/types/embed';

export const ProfilePreviewStep: React.FC<ProfilePreviewStepProps> = ({ 
  profileData, 
  onSwitchAccount, 
  onContinue 
}) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getProfileIcon = () => {
    if (profileData.avatar) {
      return (
        <img 
          src={profileData.avatar} 
          alt="Profile Avatar"
          className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
        />
      );
    }

    // Default icons based on type
    switch (profileData.type) {
      case 'ens':
        return (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
            ⟠
          </div>
        );
      case 'universal_profile':
        return (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
            🆙
          </div>
        );
      default:
        return (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
            👤
          </div>
        );
    }
  };

  const getVerificationBadge = () => {
    switch (profileData.verificationLevel) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            <Star className="w-3 h-3 mr-1" />
            Partial
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="embed-step">
      <Card className="embed-card embed-card--md">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="embed-header-icon gradient-green-blue">
              <UserCheck className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl embed-gradient-text">
            🎉 Connected Successfully!
          </CardTitle>
          <CardDescription className="text-base">
            Here's your connected account
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-4">
              {/* Profile Avatar */}
              <div className="relative">
                {getProfileIcon()}
                {profileData.verificationLevel === 'verified' && (
                  <div className="absolute -bottom-2 -right-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-foreground">
                    {profileData.name || 'Wallet User'}
                  </h3>
                  {getVerificationBadge()}
                </div>
                
                {profileData.domain && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {profileData.domain}
                  </p>
                )}
                
                {profileData.address && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {formatAddress(profileData.address)}
                  </p>
                )}
                
                {/* Stats Row */}
                <div className="flex items-center gap-4 mt-3">
                  {profileData.balance && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="font-medium text-foreground">
                        {profileData.balance} {profileData.type === 'universal_profile' ? 'LYX' : 'ETH'}
                      </span>
                    </div>
                  )}
                  
                  {profileData.followerCount && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground">Followers:</span>
                      <span className="font-medium text-foreground">
                        {profileData.followerCount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSwitchAccount}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Switch Account
            </Button>
            
            <Button
              onClick={onContinue}
              className="flex-1 btn-gradient-blue-purple"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Note */}
          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              Your wallet will be used to verify your identity in communities
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 