/**
 * Standardized API Error Response Format
 * 
 * All API endpoints should use this consistent response format for errors.
 * This replaces the 4+ different error response formats found in the codebase.
 */

import { ErrorCode } from './ErrorTypes';

/**
 * Standard error response format for all API endpoints
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Standard success response format for all API endpoints
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
  requestId: string;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Helper function to create standardized error responses
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  requestId?: string
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Helper function to create standardized success responses
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Legacy error response formats found in codebase (for migration reference)
 */
export interface LegacyErrorFormats {
  // Format 1: { error: "Something went wrong" }
  simple: { error: string };
  
  // Format 2: { success: false, error: "Something went wrong" }
  withSuccess: { success: false; error: string };
  
  // Format 3: { valid: false, error: "Something went wrong" }
  withValid: { valid: false; error: string };
  
  // Format 4: { isValid: false, errors: ["Error 1", "Error 2"] }
  withValidArray: { isValid: false; errors: string[] };
}