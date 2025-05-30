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

  /**
   * Creates empty default settings
   */
  getDefaultCommunitySettings: (): CommunitySettings => ({}),
  getDefaultBoardSettings: (): BoardSettings => ({}),

  /**
   * Checks if settings have any restrictions configured
   */
  hasPermissionRestrictions: (settings: CommunitySettings | BoardSettings): boolean => {
    return !!(settings?.permissions?.allowedRoles?.length);
  }
}; 