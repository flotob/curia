'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserCheck, User, UserPlus } from 'lucide-react';

import { GatingRequirement, EFPMustBeFollowedByConfig } from '@/types/locks';
import { validateEthereumAddress } from '@/lib/requirements/validation';

interface EFPMustBeFollowedByConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const EFPMustBeFollowedByConfigurator: React.FC<EFPMustBeFollowedByConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [address, setAddress] = useState('');
  const [ensName, setEnsName] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profilePreview, setProfilePreview] = useState<{
    address: string;
    displayName: string;
    avatar?: string;
    ensName?: string;
    followers?: number;
    following?: number;
    isVerified?: boolean;
  } | null>(null);

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'efp_must_be_followed_by') {
      const config = editingRequirement.config as EFPMustBeFollowedByConfig;
      setAddress(config.address || '');
      setEnsName(config.ensName || config.displayName || '');
      
      // If we have profile metadata, restore it for preview
      if (config.avatar || config.followers || config.following) {
        setProfilePreview({
          address: config.address || '',
          displayName: config.displayName || config.ensName || config.address?.slice(0, 8) + '...' || '',
          avatar: config.avatar,
          ensName: config.ensName,
          followers: config.followers,
          following: config.following,
          isVerified: config.isVerified
        });
      }
    }
  }, [editingRequirement]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const validation = validateEthereumAddress(address);
    setValidation(validation);
  }, [address]);

  // ===== PROFILE FETCHING =====
  
  const handleFetchProfile = async () => {
    if (!validation.isValid) return;
    
    setIsLoadingProfile(true);
    try {
      console.log(`[EFP Must Be Followed By Configurator] Fetching profile for address: ${address}`);

      // Fetch both details and stats from EFP API (same pattern as existing components)
      const [detailsResponse, statsResponse] = await Promise.all([
        fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/details`),
        fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/stats`)
      ]);

      let profileData = {
        address: address,
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        ensName: undefined as string | undefined,
        avatar: undefined as string | undefined,
        followers: 0,
        following: 0,
        isVerified: false
      };

      // Get profile details if available
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        profileData = {
          ...profileData,
          ensName: detailsData.ens?.name,
          displayName: detailsData.ens?.name || profileData.displayName,
          avatar: detailsData.ens?.avatar,
          isVerified: true // From EFP API so considered verified
        };
      }

      // Get stats if available
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        profileData.followers = statsData.followers_count || 0;
        profileData.following = statsData.following_count || 0;
      }

      console.log(`[EFP Must Be Followed By Configurator] ✅ EFP profile fetched:`, profileData);

      setProfilePreview(profileData);

      // Auto-populate ENS name from fetched data
      if (profileData.ensName && !ensName.trim()) {
        setEnsName(profileData.ensName);
      }

    } catch (error) {
      console.error('[EFP Must Be Followed By Configurator] Failed to fetch EFP profile:', error);
      // Create fallback profile
      setProfilePreview({
        address: address,
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        followers: 0,
        following: 0,
        isVerified: false
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!validation.isValid || !address.trim()) return;

    try {
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'efp_must_be_followed_by',
        category: 'social',
        config: {
          address: address.trim(),
          ensName: ensName.trim() || profilePreview?.ensName || undefined,
          displayName: profilePreview?.displayName,
          avatar: profilePreview?.avatar,
          followers: profilePreview?.followers,
          following: profilePreview?.following,
          isVerified: profilePreview?.isVerified
        } as EFPMustBeFollowedByConfig,
        isValid: true,
        displayName: `EFP Must Be Followed By: ${ensName.trim() || profilePreview?.displayName || address.slice(0, 8) + '...'}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save EFP must be followed by requirement:', error);
      setValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validation.isValid) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  // ===== RENDER =====
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Requirements
          </button>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {editingRequirement ? 'Edit Requirement' : 'Add Requirement'}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="max-w-md mx-auto">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">EFP Must Be Followed By</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require being followed by a specific address on EFP</p>
            </div>
          </div>

          {/* Address Input */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ethereum Address *
              </Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  type="text"
                  placeholder="0x... or vitalik.eth"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    // Clear profile preview when address changes
                    if (profilePreview && e.target.value !== profilePreview.address) {
                      setProfilePreview(null);
                    }
                  }}
                  onKeyDown={handleKeyPress}
                  disabled={disabled}
                  className={`text-sm ${
                    validation.isValid 
                      ? 'border-violet-200 focus:border-violet-400 focus:ring-violet-400' 
                      : address.trim() 
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                  }`}
                />
                <Button 
                  size="sm"
                  onClick={handleFetchProfile}
                  disabled={disabled || !validation.isValid || isLoadingProfile}
                  variant="outline"
                  className="shrink-0"
                >
                  {isLoadingProfile ? '...' : 'Fetch'}
                </Button>
              </div>
              
              {/* Validation Message */}
              {address.trim() && !validation.isValid && validation.error && (
                <p className="text-sm text-red-600 mt-1">
                  {validation.error}
                </p>
              )}
            </div>

            {/* Profile Preview */}
            {profilePreview && (
              <div className="p-3 bg-violet-50 dark:bg-violet-900/30 rounded-lg border border-violet-200 dark:border-violet-800">
                <div className="flex items-center space-x-3">
                  {/* Profile Image */}
                  <div className="relative">
                    {profilePreview.avatar ? (
                      <img
                        src={profilePreview.avatar}
                        alt={profilePreview.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-violet-300"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center">
                        <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                    )}
                    {profilePreview.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">✓</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                      {profilePreview.displayName}
                    </p>
                    {profilePreview.ensName && profilePreview.ensName !== profilePreview.displayName && (
                      <p className="text-xs text-violet-700 dark:text-violet-300">
                        {profilePreview.ensName}
                      </p>
                    )}
                    
                    {/* EFP Stats */}
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="flex items-center space-x-1 text-xs text-violet-600 dark:text-violet-400">
                        <User className="h-3 w-3" />
                        <span>{profilePreview.followers || 0} followers</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-violet-600 dark:text-violet-400">
                        <UserPlus className="h-3 w-3" />
                        <span>{profilePreview.following || 0} following</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ENS Name Input (Optional) */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ENS Name (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g., influencer.eth"
                value={ensName}
                onChange={(e) => setEnsName(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={disabled}
                className="mt-1 text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Display name for better readability
              </p>
            </div>

            {/* Success Preview */}
            {validation.isValid && address.trim() && (
              <div className="mt-4 p-3 bg-violet-100 dark:bg-violet-900/30 rounded-lg border border-violet-200 dark:border-violet-800">
                <p className="text-sm text-violet-800 dark:text-violet-200">
                  ✓ Users must be followed by <strong>{ensName.trim() || `${address.slice(0, 8)}...`}</strong> on EFP
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={disabled || !validation.isValid || !address.trim()}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Users must be followed by the specified Ethereum address on EFP to access gated content. 
          This creates exclusive access for approved members within the EFP ecosystem.
        </p>
      </div>
    </div>
  );
}; 