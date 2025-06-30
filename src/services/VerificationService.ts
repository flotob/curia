/**
 * Verification Service
 * 
 * Consolidates all verification logic scattered across components.
 * Handles Universal Profile, Ethereum, and lock verification.
 */

import { VerificationError, ValidationError } from '@/lib/errors';
import { authFetch } from '@/utils/authFetch';

// Types for verification
export interface VerificationRequirement {
  id: string;
  type: string;
  [key: string]: string | number | boolean | undefined;
}

export interface VerificationResult {
  valid: boolean;
  met: number;
  total: number;
  source: 'preview' | 'backend' | 'local';
  details?: Record<string, string | number | boolean | undefined>;
  error?: string;
}

export interface VerificationChallenge {
  type: 'universal_profile' | 'ethereum_profile';
  nonce: string;
  address: string;
  signature: string;
  message: string;
  timestamp: number;
  requirements: VerificationRequirement[];
}

export interface VerificationContext {
  type: 'post' | 'board' | 'preview';
  postId?: number;
  boardId?: number;
  lockId?: number;
  communityId?: string;
}

export interface UPVerificationStatus {
  lyxBalance?: {
    balance: string;
    formattedBalance: string;
    meetsRequirement: boolean;
  };
  tokenBalances?: Record<string, {
    balance: string;
    formattedBalance: string;
    decimals?: number;
    name?: string;
    symbol?: string;
    meetsRequirement?: boolean;
  }>;
  followerStatus?: Record<string, boolean>;
  socialProfiles?: Record<string, { name?: string; avatar?: string; verified?: boolean }>;
  isLoading: boolean;
}

export interface EthereumVerificationStatus {
  ethBalance?: {
    balance: string;
    formattedBalance: string;
    meetsRequirement: boolean;
  };
  ens?: {
    name: string | null;
    avatar: string | null;
    meetsRequirement: boolean;
  };
  efp?: Record<string, {
    following: boolean;
    meetsRequirement: boolean;
  }>;
  erc20?: Record<string, {
    balance: string;
    formattedBalance: string;
    meetsRequirement: boolean;
  }>;
  erc721?: Record<string, {
    balance: number;
    meetsRequirement: boolean;
  }>;
  erc1155?: Record<string, {
    balance: number;
    meetsRequirement: boolean;
  }>;
}

/**
 * Verification Service
 * 
 * Centralized verification logic for all wallet types and contexts.
 */
export class VerificationService {
  /**
   * Verify Universal Profile requirements
   */
  static async verifyUPRequirements(
    requirements: VerificationRequirement[],
    upAddress: string,
    context: VerificationContext = { type: 'preview' }
  ): Promise<VerificationResult> {
    try {
      if (!upAddress) {
        throw new ValidationError('UP address is required for verification');
      }

      if (!requirements || requirements.length === 0) {
        return {
          valid: true,
          met: 0,
          total: 0,
          source: 'local',
        };
      }

      // For preview mode, perform local verification
      if (context.type === 'preview') {
        return await this.performLocalUPVerification(requirements, upAddress);
      }

      // For post/board context, use backend verification
      return await this.performBackendVerification(
        'universal_profile',
        requirements,
        upAddress,
        context
      );
    } catch (error) {
      if (error instanceof VerificationError || error instanceof ValidationError) {
        throw error;
      }
      throw new VerificationError(
        'Universal Profile verification failed',
        { originalError: error, requirements, upAddress, context }
      );
    }
  }

  /**
   * Verify Ethereum requirements
   */
  static async verifyEthereumRequirements(
    requirements: VerificationRequirement[],
    ethAddress: string,
    context: VerificationContext = { type: 'preview' }
  ): Promise<VerificationResult> {
    try {
      if (!ethAddress) {
        throw new ValidationError('Ethereum address is required for verification');
      }

      if (!requirements || requirements.length === 0) {
        return {
          valid: true,
          met: 0,
          total: 0,
          source: 'local',
        };
      }

      // For preview mode, perform local verification
      if (context.type === 'preview') {
        return await this.performLocalEthereumVerification(requirements, ethAddress);
      }

      // For post/board context, use backend verification
      return await this.performBackendVerification(
        'ethereum_profile',
        requirements,
        ethAddress,
        context
      );
    } catch (error) {
      if (error instanceof VerificationError || error instanceof ValidationError) {
        throw error;
      }
      throw new VerificationError(
        'Ethereum verification failed',
        { originalError: error, requirements, ethAddress, context }
      );
    }
  }

  /**
   * Submit verification challenge to backend
   */
  static async submitVerificationChallenge(
    challenge: VerificationChallenge,
    context: VerificationContext,
    token: string
  ): Promise<VerificationResult> {
    try {
      if (!token) {
        throw new ValidationError('Authentication token is required');
      }

      this.validateVerificationChallenge(challenge);
      this.validateVerificationContext(context);

      // Determine the correct endpoint based on context
      const endpoint = this.buildVerificationEndpoint(challenge.type, context);

      const response = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          signature: challenge.signature,
          message: challenge.message,
          address: challenge.address,
          context: this.buildContextParam(context),
          verificationData: {
            type: challenge.type,
            nonce: challenge.nonce,
            timestamp: challenge.timestamp,
            requirements: challenge.requirements,
          },
        }),
        token,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new VerificationError(
          errorData.error || 'Verification submission failed',
          { statusCode: response.status, errorData }
        );
      }

      const result = await response.json();
      return {
        valid: result.valid || result.success,
        met: result.met || 0,
        total: result.total || 0,
        source: 'backend',
        details: result,
      };
    } catch (error) {
      if (error instanceof VerificationError || error instanceof ValidationError) {
        throw error;
      }
      throw new VerificationError(
        'Verification challenge submission failed',
        { originalError: error, challenge, context }
      );
    }
  }

  /**
   * Get verification status for a lock
   */
  static async getLockVerificationStatus(
    lockId: number,
    context: VerificationContext,
    token: string
  ): Promise<VerificationResult> {
    try {
      if (!token) {
        throw new ValidationError('Authentication token is required');
      }

      const endpoint = this.buildStatusEndpoint(lockId, context);
      
      const response = await authFetch(endpoint, {
        token,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new VerificationError(
          errorData.error || 'Failed to fetch verification status',
          { statusCode: response.status, lockId, context }
        );
      }

      const result = await response.json();
      return {
        valid: result.canComment || result.hasAccess,
        met: result.verifiedCategories || 0,
        total: result.totalCategories || 0,
        source: 'backend',
        details: result,
      };
    } catch (error) {
      if (error instanceof VerificationError || error instanceof ValidationError) {
        throw error;
      }
      throw new VerificationError(
        'Failed to get lock verification status',
        { originalError: error, lockId, context }
      );
    }
  }

  /**
   * Perform local UP verification (for preview mode)
   */
  private static async performLocalUPVerification(
    requirements: VerificationRequirement[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _upAddress: string
  ): Promise<VerificationResult> {
    // TODO: Implement local UP verification logic
    // This would use the existing UP verification hooks/utilities
    
    return {
      valid: false,
      met: 0,
      total: requirements.length,
      source: 'preview',
      details: { message: 'Local UP verification not yet implemented' },
    };
  }

  /**
   * Perform local Ethereum verification (for preview mode)
   */
  private static async performLocalEthereumVerification(
    requirements: VerificationRequirement[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ethAddress: string
  ): Promise<VerificationResult> {
    // TODO: Implement local Ethereum verification logic
    // This would use the existing Ethereum verification utilities
    
    return {
      valid: false,
      met: 0,
      total: requirements.length,
      source: 'preview',
      details: { message: 'Local Ethereum verification not yet implemented' },
    };
  }

  /**
   * Perform backend verification
   */
  private static async performBackendVerification(
    type: 'universal_profile' | 'ethereum_profile',
    requirements: VerificationRequirement[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: VerificationContext
  ): Promise<VerificationResult> {
    // This would call the appropriate backend verification endpoints
    // based on the context and requirements
    
    return {
      valid: false,
      met: 0,
      total: requirements.length,
      source: 'backend',
      details: { message: 'Backend verification not yet implemented' },
    };
  }

  /**
   * Build verification endpoint URL
   */
  private static buildVerificationEndpoint(
    type: 'universal_profile' | 'ethereum_profile',
    context: VerificationContext
  ): string {
    if (!context.lockId) {
      throw new ValidationError('Lock ID is required for verification');
    }

    return `/api/locks/${context.lockId}/verify/${type}`;
  }

  /**
   * Build status endpoint URL
   */
  private static buildStatusEndpoint(
    lockId: number,
    context: VerificationContext
  ): string {
    const contextParam = this.buildContextParam(context);
    return `/api/locks/${lockId}/verification-status?context=${contextParam}`;
  }

  /**
   * Build context parameter for API calls
   */
  private static buildContextParam(context: VerificationContext): string {
    if (context.type === 'post' && context.postId) {
      return `post:${context.postId}`;
    }
    if (context.type === 'board' && context.boardId) {
      return `board:${context.boardId}`;
    }
    return 'preview';
  }

  /**
   * Validate verification challenge
   */
  private static validateVerificationChallenge(challenge: VerificationChallenge): void {
    if (!challenge.address) {
      throw new ValidationError('Address is required in verification challenge');
    }
    if (!challenge.signature) {
      throw new ValidationError('Signature is required in verification challenge');
    }
    if (!challenge.message) {
      throw new ValidationError('Message is required in verification challenge');
    }
    if (!challenge.nonce) {
      throw new ValidationError('Nonce is required in verification challenge');
    }
  }

  /**
   * Validate verification context
   */
  private static validateVerificationContext(context: VerificationContext): void {
    if (!context.lockId) {
      throw new ValidationError('Lock ID is required in verification context');
    }
    
    if (context.type === 'post' && !context.postId) {
      throw new ValidationError('Post ID is required for post verification context');
    }
    
    if (context.type === 'board' && !context.boardId) {
      throw new ValidationError('Board ID is required for board verification context');
    }
  }

  /**
   * Generate verification nonce
   */
  static generateNonce(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  /**
   * Generate verification message for signing
   */
  static generateVerificationMessage(
    type: 'universal_profile' | 'ethereum_profile',
    address: string,
    nonce: string,
    context: VerificationContext
  ): string {
    const contextStr = this.buildContextParam(context);
    const timestamp = Date.now();

    return `Verify ${type} for lock access
Lock ID: ${context.lockId}
Address: ${address}
Context: ${contextStr}
Nonce: ${nonce}
Timestamp: ${timestamp}

This signature proves you control this address and grants access based on lock requirements.`;
  }
}