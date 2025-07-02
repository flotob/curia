import { GatingCategory, EthereumGatingRequirements } from './gating';

/**
 * Community-level settings for plugin access control and features
 */
export interface CommunitySettings {
  permissions?: {
    allowedRoles?: string[]; // Role IDs that can access the entire plugin
    // Future: allowedUsers?: string[]; // Individual user overrides
  };
  
  // Background customization settings for the entire community
  background?: {
    imageUrl: string;           // URL to the background image
    repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y' | 'space' | 'round';
    size: 'auto' | 'cover' | 'contain' | string; // CSS background-size values
    position: string;           // CSS background-position (e.g., 'center center', 'top left')
    attachment: 'scroll' | 'fixed' | 'local';
    opacity: number;            // 0-1, for overlay effect
    overlayColor?: string;      // Optional overlay color (hex)
    blendMode?: string;         // CSS mix-blend-mode
  };
  
  // Future community-wide settings:
  // branding?: { customTheme: string; logoOverride: string };
  // features?: { enableNotifications: boolean; enableIntegrations: boolean };
  // moderation?: { globalModerationLevel: 'strict' | 'moderate' | 'permissive' };
}

/**
 * Board-level lock gating configuration for multi-lock support
 */
export interface BoardLockGating {
  lockIds: number[]; // Array of lock IDs that apply to this board
  fulfillment: 'any' | 'all'; // Whether user must pass ANY or ALL locks
  verificationDuration?: number; // Custom verification duration in hours (default: 4)
}

/**
 * Board-level settings for access control and features
 */
export interface BoardSettings {
  permissions?: {
    allowedRoles?: string[]; // Role IDs that can access this board (subset of community access)
    locks?: BoardLockGating; // Lock-based gating configuration for write access
    // Future: allowedUsers?: string[]; // Individual user overrides
  };
  // Future board-specific settings:
  // moderation?: { autoModerationLevel: 'strict' | 'moderate' | 'permissive' };
  // notifications?: { emailDigest: boolean; pushNotifications: boolean };
  // appearance?: { theme: string; customCSS: string };
}

/**
 * Universal Profile token requirement for post gating
 */
export interface TokenRequirement {
  contractAddress: string; // LSP7 or LSP8 contract address
  tokenType: 'LSP7' | 'LSP8'; // Token standard type
  minAmount?: string; // Minimum amount in wei (for LSP7 tokens)
  tokenId?: string; // Specific token ID (for LSP8 NFTs)
  name?: string; // Human-readable token name for UI
  symbol?: string; // Token symbol for UI
}

/**
 * Universal Profile follower requirement for post gating (LSP26)
 */
export interface FollowerRequirement {
  type: 'minimum_followers' | 'followed_by' | 'following';
  value: string; // For minimum_followers: count, for others: UP address
  description?: string; // Human-readable description
}

/**
 * Universal Profile gating requirements
 */
export interface UPGatingRequirements {
  minLyxBalance?: string; // Minimum LYX balance in wei
  requiredTokens?: TokenRequirement[]; // Required token holdings
  followerRequirements?: FollowerRequirement[]; // LSP26 follower requirements
}

/**
 * Post-level settings for response gating and features
 * Supports both legacy upGating format and new multi-category format
 */
export interface PostSettings {
  responsePermissions?: {
    // Legacy format (backward compatibility)
    upGating?: {
      enabled: boolean; // Whether UP gating is active for this post
      requirements: UPGatingRequirements; // What UP requirements must be met
    };
    
    // New multi-category format
    categories?: GatingCategory[];
    requireAll?: boolean; // If true, user must satisfy ALL categories
    requireAny?: boolean; // If true, user must satisfy ANY category (default)
    
    // Future gating types (legacy approach - will be migrated to categories):
    // socialGating?: { requiredFollows: string[]; }; // LSP26 follow requirements
    // nftGating?: { collections: string[]; }; // NFT collection ownership
    // credentialGating?: { requiredCredentials: string[]; }; // Verifiable credentials
  };
  // Future post-specific settings:
  // moderation?: { requireApproval: boolean; autoFlag: string[]; };
  // visibility?: { hiddenFromFeed: boolean; pinned: boolean; };
}

/**
 * Helper type for settings validation
 */
export interface SettingsValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Common settings utilities
 */
export const SettingsUtils = {
  /**
   * Validates if a settings object conforms to the schema
   */
  validateCommunitySettings: (settings: unknown): SettingsValidationResult => {
    const errors: string[] = [];
    
    if (settings && typeof settings !== 'object') {
      errors.push('Settings must be an object');
      return { isValid: false, errors };
    }
    
    const settingsObj = settings as Record<string, unknown>;
    const permissions = settingsObj?.permissions as Record<string, unknown> | undefined;
    
    if (permissions?.allowedRoles) {
      if (!Array.isArray(permissions.allowedRoles)) {
        errors.push('allowedRoles must be an array');
      } else if (!permissions.allowedRoles.every((role: unknown) => typeof role === 'string')) {
        errors.push('All allowedRoles must be strings');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },

  validateBoardSettings: (settings: unknown): SettingsValidationResult => {
    const errors: string[] = [];
    
    if (settings && typeof settings !== 'object') {
      errors.push('Settings must be an object');
      return { isValid: false, errors };
    }
    
    const settingsObj = settings as Record<string, unknown>;
    const permissions = settingsObj?.permissions as Record<string, unknown> | undefined;
    
    if (permissions?.allowedRoles) {
      if (!Array.isArray(permissions.allowedRoles)) {
        errors.push('allowedRoles must be an array');
      } else if (!permissions.allowedRoles.every((role: unknown) => typeof role === 'string')) {
        errors.push('All allowedRoles must be strings');
      }
    }

    // Validate lock gating configuration
    if (permissions?.locks) {
      const locks = permissions.locks as Record<string, unknown>;
      
      if (!Array.isArray(locks.lockIds)) {
        errors.push('locks.lockIds must be an array');
      } else if (!locks.lockIds.every((id: unknown) => typeof id === 'number')) {
        errors.push('All lock IDs must be numbers');
      }
      
      if (locks.fulfillment && !['any', 'all'].includes(locks.fulfillment as string)) {
        errors.push('locks.fulfillment must be "any" or "all"');
      }
      
      if (locks.verificationDuration && (typeof locks.verificationDuration !== 'number' || locks.verificationDuration <= 0)) {
        errors.push('locks.verificationDuration must be a positive number');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },

  validatePostSettings: (settings: unknown): SettingsValidationResult => {
    const errors: string[] = [];
    
    if (settings && typeof settings !== 'object') {
      errors.push('Settings must be an object');
      return { isValid: false, errors };
    }
    
    const settingsObj = settings as Record<string, unknown>;
    const responsePermissions = settingsObj?.responsePermissions as Record<string, unknown> | undefined;
    const upGating = responsePermissions?.upGating as Record<string, unknown> | undefined;
    const categories = responsePermissions?.categories as unknown[] | undefined;
    
    if (upGating) {
      if (typeof upGating.enabled !== 'boolean') {
        errors.push('upGating.enabled must be a boolean');
      }
      
      const requirements = upGating.requirements as Record<string, unknown> | undefined;
      if (requirements) {
        // Validate minLyxBalance
        if (requirements.minLyxBalance && typeof requirements.minLyxBalance !== 'string') {
          errors.push('minLyxBalance must be a string (wei amount)');
        }
        
        // Validate requiredTokens
        if (requirements.requiredTokens) {
          if (!Array.isArray(requirements.requiredTokens)) {
            errors.push('requiredTokens must be an array');
          } else {
            requirements.requiredTokens.forEach((token: unknown, index: number) => {
              if (!token || typeof token !== 'object') {
                errors.push(`requiredTokens[${index}] must be an object`);
                return;
              }
              
              const tokenObj = token as Record<string, unknown>;
              if (typeof tokenObj.contractAddress !== 'string') {
                errors.push(`requiredTokens[${index}].contractAddress must be a string`);
              }
              if (!['LSP7', 'LSP8'].includes(tokenObj.tokenType as string)) {
                errors.push(`requiredTokens[${index}].tokenType must be 'LSP7' or 'LSP8'`);
              }
              if (tokenObj.minAmount && typeof tokenObj.minAmount !== 'string') {
                errors.push(`requiredTokens[${index}].minAmount must be a string (wei amount)`);
              }
              if (tokenObj.tokenId && typeof tokenObj.tokenId !== 'string') {
                errors.push(`requiredTokens[${index}].tokenId must be a string`);
              }
            });
          }
        }
      }
    }

    // 🚀 NEW: Validate multi-category gating format
    if (categories) {
      if (!Array.isArray(categories)) {
        errors.push('categories must be an array');
      } else {
        categories.forEach((category: unknown, index: number) => {
          if (!category || typeof category !== 'object') {
            errors.push(`categories[${index}] must be an object`);
            return;
          }
          
          const categoryObj = category as Record<string, unknown>;
          
          // Validate type
          if (typeof categoryObj.type !== 'string') {
            errors.push(`categories[${index}].type must be a string`);
          }
          
          // Validate enabled
          if (typeof categoryObj.enabled !== 'boolean') {
            errors.push(`categories[${index}].enabled must be a boolean`);
          }
          
          // 🚀 NEW: Validate fulfillment field
          if (categoryObj.fulfillment !== undefined) {
            if (!['any', 'all'].includes(categoryObj.fulfillment as string)) {
              errors.push(`categories[${index}].fulfillment must be "any" or "all"`);
            }
          }
          
          // Validate requirements exist (category-specific validation could be added later)
          if (categoryObj.requirements === undefined) {
            errors.push(`categories[${index}].requirements is required`);
          }
        });
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },

  /**
   * Creates empty default settings
   */
  getDefaultCommunitySettings: (): CommunitySettings => ({}),
  getDefaultBoardSettings: (): BoardSettings => ({}),
  getDefaultPostSettings: (): PostSettings => ({}),

  /**
   * Checks if settings have any restrictions configured
   */
  hasPermissionRestrictions: (settings: CommunitySettings | BoardSettings): boolean => {
    return !!(settings?.permissions?.allowedRoles?.length);
  },

  // ===== BOARD LOCK GATING UTILITIES =====

  /**
   * Checks if board has lock-based gating enabled
   */
  hasBoardLockGating: (settings: BoardSettings): boolean => {
    return !!(settings?.permissions?.locks?.lockIds?.length);
  },

  /**
   * Gets board lock gating configuration
   */
  getBoardLockGating: (settings: BoardSettings): BoardLockGating | null => {
    if (!SettingsUtils.hasBoardLockGating(settings)) {
      return null;
    }
    return settings.permissions!.locks!;
  },

  /**
   * Gets default board lock gating configuration
   */
  getDefaultBoardLockGating: (): BoardLockGating => ({
    lockIds: [],
    fulfillment: 'any',
    verificationDuration: 4 // 4 hours default
  }),

  /**
   * Checks if board has any access restrictions (role or lock based)
   */
  hasBoardAccessRestrictions: (settings: BoardSettings): boolean => {
    return SettingsUtils.hasPermissionRestrictions(settings) || SettingsUtils.hasBoardLockGating(settings);
  },

  /**
   * Checks if post has Universal Profile gating enabled
   */
  hasUPGating: (settings: PostSettings): boolean => {
    return !!(settings?.responsePermissions?.upGating?.enabled);
  },

  /**
   * Gets UP gating requirements from post settings
   */
  getUPGatingRequirements: (settings: PostSettings): UPGatingRequirements | null => {
    if (!SettingsUtils.hasUPGating(settings)) {
      return null;
    }
    return settings.responsePermissions!.upGating!.requirements;
  },

  // ===== ETHEREUM GATING UTILITIES =====

  /**
   * Checks if post has Ethereum Profile gating enabled (via multi-category format)
   */
  hasEthereumGating: (settings: PostSettings): boolean => {
    const categories = SettingsUtils.getGatingCategories(settings);
    return categories.some(cat => cat.type === 'ethereum_profile' && cat.enabled);
  },

  /**
   * Gets Ethereum gating requirements from post settings
   */
  getEthereumGatingRequirements: (settings: PostSettings): EthereumGatingRequirements | null => {
    const categories = SettingsUtils.getGatingCategories(settings);
    const ethCategory = categories.find(cat => cat.type === 'ethereum_profile' && cat.enabled);
    
    if (!ethCategory) {
      return null;
    }
    
    return ethCategory.requirements as EthereumGatingRequirements;
  },

  /**
   * Gets the Ethereum gating category from post settings
   */
  getEthereumGatingCategory: (settings: PostSettings): GatingCategory | null => {
    const categories = SettingsUtils.getGatingCategories(settings);
    return categories.find(cat => cat.type === 'ethereum_profile' && cat.enabled) || null;
  },

  // ===== MULTI-CATEGORY UTILITIES =====

  /**
   * Checks if post uses the new multi-category gating format
   */
  hasMultiCategoryGating: (settings: PostSettings): boolean => {
    return !!(settings?.responsePermissions?.categories?.length);
  },

  /**
   * Checks if post has any form of gating (legacy or multi-category)
   */
  hasAnyGating: (settings: PostSettings): boolean => {
    return SettingsUtils.hasUPGating(settings) || 
           SettingsUtils.hasEthereumGating(settings) || 
           SettingsUtils.hasMultiCategoryGating(settings);
  },

  /**
   * Gets all gating categories from post settings (converts legacy format if needed)
   */
  getGatingCategories: (settings: PostSettings): GatingCategory[] => {
    // If using new multi-category format, return it directly
    if (SettingsUtils.hasMultiCategoryGating(settings)) {
      return settings.responsePermissions!.categories!;
    }

    // Convert legacy UP gating to category format
    if (SettingsUtils.hasUPGating(settings)) {
      const upGating = settings.responsePermissions!.upGating!;
      return [{
        type: 'universal_profile',
        enabled: upGating.enabled,
        requirements: upGating.requirements
      }];
    }

    return [];
  },

  /**
   * Converts legacy upGating format to new multi-category format
   */
  migrateLegacyToCategories: (settings: PostSettings): PostSettings => {
    // If already using categories, return as-is
    if (SettingsUtils.hasMultiCategoryGating(settings)) {
      return settings;
    }

    // If no gating at all, return as-is
    if (!SettingsUtils.hasUPGating(settings)) {
      return settings;
    }

    // Convert UP gating to category format
    const upGating = settings.responsePermissions!.upGating!;
    const newSettings: PostSettings = {
      ...settings,
      responsePermissions: {
        ...settings.responsePermissions,
        categories: [{
          type: 'universal_profile',
          enabled: upGating.enabled,
          requirements: upGating.requirements
        }],
        requireAny: true, // Default behavior
        // Keep legacy format for backward compatibility
        upGating
      }
    };

    return newSettings;
  },

  /**
   * Converts multi-category format back to legacy format (for backward compatibility)
   */
  extractLegacyFormat: (settings: PostSettings): PostSettings => {
    if (!SettingsUtils.hasMultiCategoryGating(settings)) {
      return settings;
    }

    // Find the Universal Profile category
    const categories = settings.responsePermissions!.categories!;
    const upCategory = categories.find(cat => cat.type === 'universal_profile');

    if (!upCategory) {
      return settings;
    }

    // Extract UP gating to legacy format
    const newSettings: PostSettings = {
      ...settings,
      responsePermissions: {
        ...settings.responsePermissions,
        upGating: {
          enabled: upCategory.enabled,
          requirements: upCategory.requirements as UPGatingRequirements
        }
      }
    };

    return newSettings;
  },

  /**
   * Gets the display mode for gating categories
   */
  getGatingDisplayMode: (settings: PostSettings): 'legacy' | 'multi-category' | 'none' => {
    if (SettingsUtils.hasMultiCategoryGating(settings)) {
      return 'multi-category';
    }
    if (SettingsUtils.hasUPGating(settings)) {
      return 'legacy';
    }
    return 'none';
  }
}; 