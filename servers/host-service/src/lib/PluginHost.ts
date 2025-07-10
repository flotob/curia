/**
 * PluginHost - Server-side plugin communication manager
 * 
 * This class handles:
 * 1. Plugin configuration and metadata management
 * 2. Request signature validation using @curia_/cg-plugin-lib-host
 * 3. API method routing to data providers
 * 4. Response formatting for plugin consumption
 */

import { DataProvider } from './DataProvider';

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /** Plugin URL */
  url: string;
  /** Community ID this plugin instance serves */
  communityId: string;
  /** Allowed origins for CORS */
  allowedOrigins?: string[];
  /** Plugin-specific settings */
  settings?: Record<string, any>;
}

/**
 * Standard API request interface from plugins
 */
export interface PluginApiRequest {
  method: string;
  params?: any;
  signature?: string;
  timestamp?: number;
  communityId: string;
  userId?: string;
}

/**
 * Standard API response interface to plugins
 */
export interface PluginApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
}

/**
 * Server-side plugin host that validates and routes API requests
 */
export class PluginHost {
  private dataProvider: DataProvider;

  constructor(dataProvider: DataProvider) {
    this.dataProvider = dataProvider;
  }

  /**
   * Process an API request from a plugin
   * 
   * @param request - The API request
   * @returns Promise<PluginApiResponse>
   */
  public async processApiRequest(request: PluginApiRequest): Promise<PluginApiResponse> {
    try {
      // Validate request structure
      if (!request.method || !request.communityId) {
        return {
          data: null,
          success: false,
          error: 'Invalid request: missing method or communityId'
        };
      }

      // TODO: Validate signature using @curia_/cg-plugin-lib-host
      // For now, we'll skip signature validation during development
      
      // Route to appropriate API handler
      let responseData: any;
      
      switch (request.method) {
        case 'getUserInfo':
          responseData = await this.dataProvider.getUserInfo(
            request.userId || 'default_user', 
            request.communityId
          );
          break;
          
        case 'getContextData':
          responseData = await this.dataProvider.getContextData(
            request.userId || 'default_user',
            request.communityId
          );
          break;
          
        case 'getCommunityInfo':
          responseData = await this.dataProvider.getCommunityInfo(request.communityId);
          break;
          
        case 'getUserFriends':
          const { limit, offset } = request.params || {};
          responseData = await this.dataProvider.getUserFriends(
            request.userId || 'default_user',
            request.communityId,
            limit || 10, 
            offset || 0
          );
          break;
          
        case 'giveRole':
          const { roleId, userId: targetUserId } = request.params || {};
          responseData = await this.dataProvider.giveRole(
            request.userId || 'default_user',
            targetUserId,
            roleId,
            request.communityId
          );
          break;
          
        default:
          return {
            data: null,
            success: false,
            error: `Unknown API method: ${request.method}`
          };
      }

      return {
        data: responseData,
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Validate plugin request signature
   * 
   * @param request - The request to validate
   * @returns Promise<boolean>
   */
  private async validateSignature(request: PluginApiRequest): Promise<boolean> {
    // TODO: Implement signature validation using @curia_/cg-plugin-lib-host
    // This should verify that the request was signed by the plugin's private key
    
    if (!request.signature || !request.timestamp) {
      return false;
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const now = Date.now();
    const requestTime = request.timestamp;
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return false;
    }

    // TODO: Use @curia_/cg-plugin-lib-host to verify signature
    // const isValid = await CgPluginLibHost.verifySignature(request);
    // return isValid;
    
    // For now, accept all requests during development
    return true;
  }

  /**
   * Validate CORS origin
   * 
   * @param origin - Request origin
   * @param allowedOrigins - Allowed origins for this plugin
   * @returns boolean
   */
  public validateOrigin(origin: string, allowedOrigins: string[] = []): boolean {
    // Allow all origins if none specified (development mode)
    if (allowedOrigins.length === 0) {
      return true;
    }
    
    // Check if origin is in allowed list
    return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  }
} 