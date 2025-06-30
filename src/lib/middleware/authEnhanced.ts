import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { UnauthorizedError, ForbiddenError, ApiError, ValidationError } from '@/lib/errors/ApiErrors';

/**
 * Enhanced user context extracted from JWT token
 */
export interface UserContext {
  userId: string;
  communityId: string;
  roles: string[];
  isAdmin: boolean;
  hasRequiredContext: boolean;
  iframeUid?: string;
  communityShortId?: string;
  pluginId?: string;
  previousVisit?: string;
}

/**
 * Enhanced authenticated request with user context
 */
export interface EnhancedAuthRequest extends AuthenticatedRequest {
  userContext: UserContext;
}

/**
 * Options for enhanced authentication middleware
 */
export interface EnhancedAuthOptions {
  /** Require admin privileges */
  adminOnly?: boolean;
  /** Require community context (communityId) */
  requireCommunity?: boolean;
  /** Require specific roles (user must have at least one) */
  requiredRoles?: string[];
  /** Allow unauthenticated access (for optional auth endpoints) */
  allowUnauthenticated?: boolean;
}

/**
 * Enhanced authentication middleware that provides:
 * - Consolidated user context extraction
 * - Standardized authorization checking
 * - Consistent error responses
 * - Reduced boilerplate across endpoints
 */
export function withEnhancedAuth(
  handler: (req: EnhancedAuthRequest, context: RouteContext) => Promise<NextResponse>,
  options: EnhancedAuthOptions = {}
) {
  return withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
    try {
      // Extract and validate user context
      const userContext: UserContext = {
        userId: req.user?.sub || '',
        communityId: req.user?.cid || '',
        roles: req.user?.roles || [],
        isAdmin: req.user?.adm || false,
        hasRequiredContext: !!(req.user?.sub && req.user?.cid),
        iframeUid: req.user?.uid || undefined,
        communityShortId: req.user?.communityShortId || undefined,
        pluginId: req.user?.pluginId || undefined,
        previousVisit: req.user?.previousVisit || undefined
      };

      // Validate authentication requirements
      if (!options.allowUnauthenticated && !userContext.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate community context requirements
      if (options.requireCommunity && !userContext.hasRequiredContext) {
        throw new UnauthorizedError('Authentication and community context required');
      }

      // Validate admin requirements
      if (options.adminOnly && !userContext.isAdmin) {
        throw new ForbiddenError('Admin access required');
      }

      // Validate role requirements
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        const hasRequiredRole = options.requiredRoles.some(role => 
          userContext.roles.includes(role)
        );
        if (!hasRequiredRole) {
          throw new ForbiddenError(`Insufficient permissions. Required roles: ${options.requiredRoles.join(', ')}`);
        }
      }

      // Attach user context to request
      const enhancedReq = req as EnhancedAuthRequest;
      enhancedReq.userContext = userContext;
      
      return await handler(enhancedReq, context);
      
    } catch (error) {
      console.error('[withEnhancedAuth] Error:', error);
      
      if (error instanceof ApiError) {
        return error.toResponse();
      }
      
      // Handle unexpected errors
      return NextResponse.json({
        success: false,
        error: 'Internal server error during authentication'
      }, { status: 500 });
    }
  }, options.adminOnly);
}

/**
 * Error handling middleware wrapper
 * Provides standardized error responses for any handler
 */
export function withErrorHandling(
  handler: (req: AuthenticatedRequest, context: RouteContext) => Promise<NextResponse>
) {
  return async (req: AuthenticatedRequest, context: RouteContext) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('[withErrorHandling] API Error:', error);
      
      if (error instanceof ApiError) {
        return error.toResponse();
      }
      
      if (error instanceof SyntaxError) {
        return new ValidationError('Invalid JSON body').toResponse();
      }
      
      return NextResponse.json({
        success: false,
        error: 'Internal server error'
      }, { status: 500 });
    }
  };
}

/**
 * Combined enhanced auth with error handling
 * Most convenient wrapper for typical API endpoints
 */
export function withAuthAndErrorHandling(
  handler: (req: EnhancedAuthRequest, context: RouteContext) => Promise<NextResponse>,
  options: EnhancedAuthOptions = {}
) {
  return withErrorHandling(
    withEnhancedAuth(handler, options)
  );
}