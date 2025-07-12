/**
 * ProfilePreviewStep - The "moment of delight" profile preview
 * 
 * Now uses proven UPProfileDisplay and EthereumProfileDisplay components
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserCheck } from 'lucide-react';
import { ProfilePreviewStepProps } from '@/types/embed';
import { UPProfileDisplay } from '@/components/universal-profile/UPProfileDisplay';
import { EthereumProfileDisplay } from '@/components/ethereum/EthereumProfileDisplay';
import { EthereumProfileProvider } from '@/contexts/EthereumProfileContext';
import { UniversalProfileProvider } from '@/contexts/UniversalProfileContext';

export const ProfilePreviewStep: React.FC<ProfilePreviewStepProps> = ({ 
  profileData, 
  onSwitchAccount, 
  onContinue 
}) => {
  // Handler for anonymous/fallback continue button
  const handleContinueClick = () => {
    // For anonymous users, no updated profile data to pass back
    onContinue();
  };
  // Handle Universal Profile display
  if (profileData.type === 'universal_profile' && profileData.address) {
    return (
      <div className="embed-step">
        <UniversalProfileProvider>
          <UPProfileDisplay
            address={profileData.address}
            onBack={onSwitchAccount} // Go back to main authentication selection
            onSwitchWallet={() => {}} // UP extension handles this internally now
            onContinue={(updatedProfileData) => onContinue(updatedProfileData)}
            className="embed-card embed-card--md"
          />
        </UniversalProfileProvider>
      </div>
    );
  }

  // Handle Ethereum/ENS profile display
  if (profileData.type === 'ens' && profileData.address) {
    return (
      <div className="embed-step">
        <EthereumProfileProvider storageKey="embed_ethereum_preview">
          <EthereumProfileDisplay
            address={profileData.address}
            ensName={profileData.domain}
            ensAvatar={profileData.avatar || undefined}
            onBack={onSwitchAccount} // Go back to main authentication selection
            onSwitchWallet={() => {}} // RainbowKit handles this internally now
            onContinue={(updatedProfileData) => onContinue(updatedProfileData)}
            className="embed-card embed-card--md"
          />
        </EthereumProfileProvider>
      </div>
    );
  }

  // Fallback for anonymous or unknown profile types
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
            Ready to Continue
          </CardTitle>
          <CardDescription className="text-base">
            Your profile is ready for the next step
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          <div className="text-center space-y-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6">
              <div className="text-lg font-semibold text-foreground mb-2">
                {profileData.name || 'Anonymous User'}
              </div>
              <div className="text-sm text-muted-foreground">
                {profileData.type === 'anonymous' ? 'Guest Session' : 'Connected Profile'}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onSwitchAccount}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                Switch Account
              </button>
              
              <button
                onClick={handleContinueClick}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 