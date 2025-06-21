'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserPlus, User, Search, Edit3 } from 'lucide-react';

import { GatingRequirement, EFPMustFollowConfig } from '@/types/locks';
import { validateEthereumAddress } from '@/lib/requirements/validation';
import { NameFirstSearch, SearchProfile } from '@/components/locks/NameFirstSearch';

interface EFPMustFollowConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const EFPMustFollowConfigurator: React.FC<EFPMustFollowConfiguratorProps> = ({
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
  const [searchMode, setSearchMode] = useState<'name-search' | 'manual-input'>('name-search');
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
    if (editingRequirement && editingRequirement.type === 'efp_must_follow') {
      const config = editingRequirement.config as EFPMustFollowConfig;
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
      console.log(`[EFP Must Follow Configurator] Fetching profile for address: ${address}`);

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

      console.log(`[EFP Must Follow Configurator] ✅ EFP profile fetched:`, profileData);

      setProfilePreview(profileData);

      // Auto-populate ENS name from fetched data
      if (profileData.ensName && !ensName.trim()) {
        setEnsName(profileData.ensName);
      }

    } catch (error) {
      console.error('[EFP Must Follow Configurator] Failed to fetch EFP profile:', error);
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
  
  const handleNameSearchSelect = (profile: SearchProfile) => {
    console.log('[EFP Must Follow Configurator] Name-first search selected profile:', profile);
    
    // Set address and ENS name from search result
    setAddress(profile.address);
    setEnsName(profile.displayName);
    
    // Convert SearchProfile to our internal profile preview format
    setProfilePreview({
      address: profile.address,
      displayName: profile.displayName,
      avatar: profile.avatar,
      ensName: profile.source === 'ens' ? profile.displayName : undefined,
      followers: profile.metadata?.efpStats?.followers_count || 0,
      following: profile.metadata?.efpStats?.following_count || 0,
      isVerified: profile.isVerified || false
    });
    
    console.log('[EFP Must Follow Configurator] ✅ Profile auto-populated from name search');
  };

  const handleSave = () => {
    if (!validation.isValid || !address.trim()) return;

    try {
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'efp_must_follow',
        category: 'social',
        config: {
          address: address.trim(),
          ensName: ensName.trim() || profilePreview?.ensName || undefined,
          displayName: profilePreview?.displayName,
          avatar: profilePreview?.avatar,
          followers: profilePreview?.followers,
          following: profilePreview?.following,
          isVerified: profilePreview?.isVerified
        } as EFPMustFollowConfig,
        isValid: true,
        displayName: `EFP Must Follow: ${ensName.trim() || profilePreview?.displayName || address.slice(0, 8) + '...'}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save EFP must follow requirement:', error);
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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-sky-300 dark:hover:border-sky-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">EFP Must Follow</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require following a specific address on EFP</p>
            </div>
          </div>

          {/* Search Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setSearchMode('name-search')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  searchMode === 'name-search'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Search className="h-4 w-4" />
                Name Search
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('manual-input')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  searchMode === 'manual-input'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                Manual Input
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Name-First Search Mode */}
            {searchMode === 'name-search' && (
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                  Search by Name or Address
                </Label>
                <NameFirstSearch
                  placeholder="Search full ENS names (vitalik.eth) or addresses (0x123...)"
                  onSelect={handleNameSearchSelect}
                  searchTypes={['ens', 'efp']}
                  disabled={disabled}
                  className="border-sky-100 dark:border-sky-900"
                />
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Search for profiles by typing full ENS names (e.g., vitalik.eth) or addresses. Partial name search not available.
                </p>
              </div>
            )}

            {/* Manual Address Input Mode */}
            {searchMode === 'manual-input' && (
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
                        ? 'border-sky-200 focus:border-sky-400 focus:ring-sky-400' 
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
            )}

            {/* Profile Preview */}
            {profilePreview && (
              <div className="p-3 bg-sky-50 dark:bg-sky-900/30 rounded-lg border border-sky-200 dark:border-sky-800">
                <div className="flex items-center space-x-3">
                  {/* Profile Image */}
                  <div className="relative">
                    {profilePreview.avatar ? (
                      <img
                        src={profilePreview.avatar}
                        alt={profilePreview.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-sky-300"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center">
                        <User className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                      </div>
                    )}
                    {profilePreview.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">✓</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-sky-900 dark:text-sky-100">
                      {profilePreview.displayName}
                    </p>
                    {profilePreview.ensName && profilePreview.ensName !== profilePreview.displayName && (
                      <p className="text-xs text-sky-700 dark:text-sky-300">
                        {profilePreview.ensName}
                      </p>
                    )}
                    
                    {/* EFP Stats */}
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="flex items-center space-x-1 text-xs text-sky-600 dark:text-sky-400">
                        <User className="h-3 w-3" />
                        <span>{profilePreview.followers || 0} followers</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-sky-600 dark:text-sky-400">
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
                placeholder="e.g., vitalik.eth"
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
              <div className="mt-4 p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg border border-sky-200 dark:border-sky-800">
                <p className="text-sm text-sky-800 dark:text-sky-200">
                  ✓ Users must follow <strong>{ensName.trim() || `${address.slice(0, 8)}...`}</strong> on EFP
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
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Users must follow the specified address on EFP (Ethereum Follow Protocol) to access gated content. 
          Use <strong>Name Search</strong> to find profiles by ENS names, or <strong>Manual Input</strong> for direct address entry.
        </p>
      </div>
    </div>
  );
}; 