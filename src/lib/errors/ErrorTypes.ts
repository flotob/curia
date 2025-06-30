/**
 * Standardized Error Types
 * 
 * Provides consistent error handling across the entire application.
 * All errors should extend these base types for consistency.
 */

export enum ErrorCode {
  // Authentication & Authorization
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  
  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Database
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_VIOLATION = 'DATABASE_CONSTRAINT_VIOLATION',
  
  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Verification & Gating
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  GATING_REQUIREMENTS_NOT_MET = 'GATING_REQUIREMENTS_NOT_MET',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  
  // Lock System
  LOCK_NOT_FOUND = 'LOCK_NOT_FOUND',
  LOCK_ACCESS_DENIED = 'LOCK_ACCESS_DENIED',
  LOCK_EXPIRED = 'LOCK_EXPIRED',
  
  // Generic
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Base application error class
 */
export abstract class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown (Node.js)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Authentication and authorization errors (401, 403)
 */
export class AuthenticationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.AUTH_UNAUTHORIZED,
    message: string = 'Authentication required',
    details?: unknown,
    requestId?: string
  ) {
    const statusCode = code === ErrorCode.AUTH_FORBIDDEN ? 403 : 401;
    super(code, message, statusCode, details, requestId);
  }
}

/**
 * Validation and input errors (400)
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: unknown,
    requestId?: string
  ) {
    super(ErrorCode.VALIDATION_FAILED, message, 400, details, requestId);
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    details?: unknown,
    requestId?: string
  ) {
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} not found`,
      404,
      details,
      requestId
    );
  }
}

/**
 * Resource conflict errors (409)
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    details?: unknown,
    requestId?: string
  ) {
    super(ErrorCode.RESOURCE_CONFLICT, message, 409, details, requestId);
  }
}

/**
 * Database errors (500)
 */
export class DatabaseError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.DATABASE_QUERY_ERROR,
    message: string = 'Database operation failed',
    details?: unknown,
    requestId?: string
  ) {
    super(code, message, 500, details, requestId);
  }
}

/**
 * External service errors (502, 503)
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = 'External service error',
    details?: unknown,
    requestId?: string
  ) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `${service}: ${message}`,
      502,
      details,
      requestId
    );
  }
}

/**
 * Verification and gating errors (403)
 */
export class VerificationError extends AppError {
  constructor(
    message: string = 'Verification failed',
    details?: unknown,
    requestId?: string
  ) {
    super(ErrorCode.VERIFICATION_FAILED, message, 403, details, requestId);
  }
}

/**
 * Generic internal server errors (500)
 */
export class InternalServerError extends AppError {
  constructor(
    message: string = 'Internal server error',
    details?: unknown,
    requestId?: string
  ) {
    super(ErrorCode.INTERNAL_SERVER_ERROR, message, 500, details, requestId);
  }
}

/**
 * Rate limiting errors (429)
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    details?: unknown,
    requestId?: string
  ) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, details, requestId);
  }
}