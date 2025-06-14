'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserCheck, User } from 'lucide-react';

import { GatingRequirement, UPMustBeFollowedByConfig } from '@/types/locks';
import { validateEthereumAddress } from '@/lib/requirements/validation';

interface UPMustBeFollowedByConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const UPMustBeFollowedByConfigurator: React.FC<UPMustBeFollowedByConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [address, setAddress] = useState('');
  const [profileName, setProfileName] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profilePreview, setProfilePreview] = useState<{
    address: string;
    displayName: string;
    profileImage?: string;
    username?: string;
    bio?: string;
    isVerified?: boolean;
  } | null>(null);

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'up_must_be_followed_by') {
      const config = editingRequirement.config as UPMustBeFollowedByConfig;
      setAddress(config.address || '');
      setProfileName(config.profileName || '');
      
      // If we have profile metadata, restore it for preview
      if (config.profileImage || config.username || config.bio) {
        setProfilePreview({
          address: config.address || '',
          displayName: config.profileName || config.address?.slice(0, 8) + '...' || '',
          profileImage: config.profileImage,
          username: config.username,
          bio: config.bio,
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
      console.log(`[UP Must Be Followed By Configurator] Fetching profile for address: ${address}`);

      // Use the existing UP profile fetching utility
      const { getUPSocialProfile } = await import('@/lib/upProfile');
      const profile = await getUPSocialProfile(address);

      console.log(`[UP Must Be Followed By Configurator] ✅ UP profile fetched:`, profile);

      setProfilePreview({
        address: profile.address,
        displayName: profile.displayName,
        profileImage: profile.profileImage,
        username: profile.username,
        bio: profile.bio,
        isVerified: profile.isVerified
      });

      // Auto-populate profile name from fetched data
      if (profile.displayName && !profileName.trim()) {
        setProfileName(profile.displayName);
      }

    } catch (error) {
      console.error('[UP Must Be Followed By Configurator] Failed to fetch UP profile:', error);
      // Create fallback profile
      setProfilePreview({
        address: address,
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
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
        type: 'up_must_be_followed_by',
        category: 'social',
        config: {
          address: address.trim(),
          profileName: profileName.trim() || profilePreview?.displayName || undefined,
          profileImage: profilePreview?.profileImage,
          username: profilePreview?.username,
          bio: profilePreview?.bio,
          isVerified: profilePreview?.isVerified
        } as UPMustBeFollowedByConfig,
        isValid: true,
        displayName: `UP Must Be Followed By: ${profileName.trim() || profilePreview?.displayName || address.slice(0, 8) + '...'}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save UP must be followed by requirement:', error);
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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-teal-300 dark:hover:border-teal-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">UP Must Be Followed By</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require being followed by a specific Universal Profile</p>
            </div>
          </div>

          {/* Address Input */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Universal Profile Address *
              </Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  type="text"
                  placeholder="0x..."
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
                      ? 'border-teal-200 focus:border-teal-400 focus:ring-teal-400' 
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
              <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-800">
                <div className="flex items-center space-x-3">
                  {/* Profile Image */}
                  <div className="relative">
                    {profilePreview.profileImage ? (
                      <img
                        src={profilePreview.profileImage}
                        alt={profilePreview.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-teal-300"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-teal-200 dark:bg-teal-800 flex items-center justify-center">
                        <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      </div>
                    )}
                    {profilePreview.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">✓</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-teal-900 dark:text-teal-100">
                      {profilePreview.displayName}
                    </p>
                    {profilePreview.username && (
                      <p className="text-xs text-teal-700 dark:text-teal-300">
                        {profilePreview.username}
                      </p>
                    )}
                    {profilePreview.bio && (
                      <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 line-clamp-1">
                        {profilePreview.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Name Input (Optional) */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Profile Name (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g., influencer.up"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
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
              <div className="mt-4 p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-800">
                <p className="text-sm text-teal-800 dark:text-teal-200">
                  ✓ Users must be followed by <strong>{profileName.trim() || `${address.slice(0, 8)}...`}</strong> on Universal Profiles
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
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Users must be followed by the specified Universal Profile to access gated content. 
          This creates exclusive access for approved community members.
        </p>
      </div>
    </div>
  );
}; 