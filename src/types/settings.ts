/**
 * Community-level settings for plugin access control and features
 */
export interface CommunitySettings {
  permissions?: {
    allowedRoles?: string[]; // Role IDs that can access the entire plugin
    // Future: allowedUsers?: string[]; // Individual user overrides
  };
  // Future community-wide settings:
  // branding?: { customTheme: string; logoOverride: string };
  // features?: { enableNotifications: boolean; enableIntegrations: boolean };
  // moderation?: { globalModerationLevel: 'strict' | 'moderate' | 'permissive' };
}

/**
 * Board-level settings for access control and features
 */
export interface BoardSettings {
  permissions?: {
    allowedRoles?: string[]; // Role IDs that can access this board (subset of community access)
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
 * Universal Profile gating requirements
 */
export interface UPGatingRequirements {
  minLyxBalance?: string; // Minimum LYX balance in wei
  requiredTokens?: TokenRequirement[]; // Required token holdings
}

/**
 * Post-level settings for response gating and features
 */
export interface PostSettings {
  responsePermissions?: {
    upGating?: {
      enabled: boolean; // Whether UP gating is active for this post
      requirements: UPGatingRequirements; // What UP requirements must be met
    };
    // Future gating types:
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
  }
}; 